/**
 * Server-side catalog refresh (SERVER-ONLY: pulls in the service-role client;
 * the repo has no `server-only` package, so this comment is the guard. Never
 * import it from a "use client" file).
 *
 * P1 spike: does `revalidateTag` expire `unstable_cache` entries with the same
 * tag in this Next version (16.3.8)? YES, by reading the code:
 *  - `unstable_cache` stores its result through the incremental cache as a
 *    FETCH entry carrying `options.tags` (web/spec-extension/unstable-cache.js).
 *  - `revalidateTag(tag, profile)` records the tag in the tags manifest
 *    (web/spec-extension/revalidate.js); with `{ expire: 0 }` the tag is
 *    expired at once.
 *  - On the next read, `IncrementalCache.get` for FETCH entries checks
 *    `areTagsExpired(tags, lastModified)`; an expired tag turns the entry into
 *    a miss (blocking recompute), `areTagsStale` only makes it stale-while-
 *    revalidate. The docs say the same: `{ expire: 0 }` means "the next request
 *    is a blocking revalidate/cache miss", and the single-argument form is
 *    deprecated. So no version-keyed cache fallback is needed here.
 *  - Caveats: it must run in a Server Action or Route Handler (it throws
 *    outside a request scope, so `revalidateCatalog` swallows that), and the
 *    tag manifest is per cache backend. Instances that miss the tag still
 *    converge through `revalidate: 300` plus the 15 s local throttle.
 *
 * Flow (plan section 3.2): `ensureCatalog()` is the only call entry points make.
 *  - source "seed": nothing to do.
 *  - warm (checked < 15 s ago): return at once, no awaiting.
 *  - stale: start one deduplicated refresh, wait at most 300 ms, finish in `after()`.
 *  - cold (never loaded): wait at most 800 ms, else serve the seed, finish in `after()`.
 *  - any failure keeps the active snapshot, backs off 30 s, never throws.
 */
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { buildSnapshot, swapCatalog, type CatalogDrift, type CatalogProblem, type RawRows } from "./registry";
import { SEED_SNAPSHOT } from "./seed";
import { RecipeSchema, formatZodIssues, partRecordSchema } from "./schema";
import { CATALOG_TAG, loadCatalogRowsCached } from "./db/rows";

export { CATALOG_TAG };

// The breadboard has hundreds of pins, so the pin cap is lifted on read; publish checks stay strict.
const PART_SCHEMA = partRecordSchema({ lockedPins: true });

/** Rejects a database row that does not match the schema; the seed entry is kept instead. */
function validateRecord(record: unknown, kind: "part" | "recipe"): boolean | string {
  const result =
    kind === "part"
      ? PART_SCHEMA.safeParse(record)
      : RecipeSchema.safeParse((record as { recipe?: unknown })?.recipe ?? record);
  if (result.success) return true;
  return formatZodIssues(result.error)
    .map((issue) => issue.message)
    .join("; ");
}

export type CatalogSource = "seed" | "db";
export type CatalogSourceConfig = CatalogSource | { loader: () => Promise<RawRows> };

export const WARM_MS = 15_000;
export const STALE_WAIT_MS = 300;
export const COLD_WAIT_MS = 800;
export const FAIL_BACKOFF_MS = 30_000;

type State = {
  override: CatalogSourceConfig | null;
  lastCheckAt: number;
  lastGoodAt: number;
  failUntil: number;
  lastError: string | null;
  inflight: Promise<void> | null;
  problems: CatalogProblem[];
  driftCount: number;
  version: string;
  loggedProblems: Set<string>;
};

const state: State = {
  override: null,
  lastCheckAt: 0,
  lastGoodAt: 0,
  failUntil: 0,
  lastError: null,
  inflight: null,
  problems: [],
  driftCount: 0,
  version: "seed",
  loggedProblems: new Set(),
};

function resolveSource(): CatalogSourceConfig {
  if (state.override) return state.override;
  if (process.env.CATALOG_SOURCE === "seed") return "seed";
  // Unit tests keep the bundled seed unless a test configures a loader.
  if (process.env.VITEST || process.env.NODE_ENV === "test") return "seed";
  return "db";
}

/** Tests: pick the source ('seed' | 'db' | a custom loader) and reset all state. */
export function configureCatalogSource(source: CatalogSourceConfig | null): void {
  state.override = source;
  state.lastCheckAt = 0;
  state.lastGoodAt = 0;
  state.failUntil = 0;
  state.lastError = null;
  state.inflight = null;
  state.problems = [];
  state.driftCount = 0;
  state.version = "seed";
  state.loggedProblems = new Set();
}

/** Forget the throttle so the next ensureCatalog() reloads (also clears the failure backoff). */
export function invalidateLocalCatalog(): void {
  state.lastCheckAt = 0;
  state.failUntil = 0;
}

export function catalogHealth(): {
  source: CatalogSource | "loader";
  lastGoodAt: number | null;
  lastError: string | null;
  problems: CatalogProblem[];
  driftCount: number;
  version: string;
} {
  const source = resolveSource();
  return {
    source: typeof source === "string" ? source : "loader",
    lastGoodAt: state.lastGoodAt || null,
    lastError: state.lastError,
    problems: state.problems,
    driftCount: state.driftCount,
    version: state.version,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function rowVersions(rows: RawRows): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows.parts ?? []) out.set(`part:${r.id}`, r.version);
  for (const r of rows.recipes ?? []) out.set(`recipe:${r.id}`, r.version);
  return out;
}

function reportProblems(problems: CatalogProblem[], rows: RawRows): void {
  const versions = rowVersions(rows);
  for (const p of problems) {
    // Once per row version, so a bad row does not flood the log every 15 s.
    const key = `${p.kind}:${p.id}:${versions.get(`${p.kind}:${p.id}`) ?? "-"}:${p.message}`;
    if (state.loggedProblems.has(key)) continue;
    state.loggedProblems.add(key);
    console.error(`[catalog] skipped ${p.kind} "${p.id}": ${p.message}`);
  }
}

function rowsVersion(rows: RawRows): string {
  let sum = 0;
  for (const v of rowVersions(rows).values()) sum += v;
  return `${rows.parts.length}p${rows.recipes.length}r${rows.media.length}m.${sum}`;
}

function apply(rows: RawRows): void {
  if (rows.settings?.mode === "seed") {
    swapCatalog(SEED_SNAPSHOT);
    state.problems = [];
    state.driftCount = 0;
    state.version = "seed (kill switch)";
    return;
  }
  const result = buildSnapshot(SEED_SNAPSHOT, rows, { validate: validateRecord });
  swapCatalog(result.snapshot);
  const drift: CatalogDrift[] = result.drift;
  state.problems = result.problems;
  state.driftCount = drift.length;
  state.version = rowsVersion(rows);
  reportProblems(result.problems, rows);
}

async function refresh(): Promise<void> {
  const source = resolveSource();
  if (source === "seed") return;
  const loader = typeof source === "object" ? source.loader : loadCatalogRowsCached;
  try {
    const rows = await loader();
    apply(rows);
    state.lastGoodAt = Date.now();
    state.lastError = null;
  } catch (error) {
    // Keep serving the last good snapshot (or the seed) and back off.
    state.failUntil = Date.now() + FAIL_BACKOFF_MS;
    state.lastError = errorMessage(error);
    console.error(`[catalog] refresh failed, keeping the current catalog: ${state.lastError}`);
  }
}

function startRefresh(): Promise<void> {
  if (state.inflight) return state.inflight;
  state.lastCheckAt = Date.now();
  const run: Promise<void> = refresh()
    .catch(() => undefined)
    .finally(() => {
      if (state.inflight === run) state.inflight = null;
    });
  state.inflight = run;
  return run;
}

/** Resolves when `work` finishes or after `ms`, whichever is first; reports which. */
async function settleWithin(work: Promise<void>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  try {
    return await Promise.race([work.then(() => true as const), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function finishInBackground(work: Promise<void>): void {
  try {
    after(() => work);
  } catch {
    // Outside a request scope (tests, scripts): the promise just finishes on its own.
  }
}

/**
 * Make sure the active catalog is reasonably fresh. Never throws. Cheap when
 * warm. Call it first in every server entry point.
 */
export function ensureCatalog(opts: { force?: boolean } = {}): Promise<void> {
  if (resolveSource() === "seed") return Promise.resolve();
  const now = Date.now();

  if (opts.force) {
    // Wait out a refresh that may have read pre-publish rows, then reload fully.
    const previous = state.inflight;
    return (async () => {
      if (previous) await previous.catch(() => undefined);
      state.failUntil = 0;
      state.inflight = null;
      await startRefresh();
    })();
  }

  if (now < state.failUntil) return Promise.resolve();
  const cold = state.lastGoodAt === 0;
  // Warm: loaded once and checked recently (a refresh in flight also counts,
  // lastCheckAt is stamped when it starts). Cold callers share the in-flight load.
  if (!cold && now - state.lastCheckAt < WARM_MS) return Promise.resolve();

  const work = startRefresh();
  return (async () => {
    const done = await settleWithin(work, cold ? COLD_WAIT_MS : STALE_WAIT_MS);
    if (!done) finishInBackground(work);
  })();
}

/**
 * After an admin write: expire the shared cache entry, drop the local throttle
 * and reload so the publishing admin sees the change at once. Call from a
 * Server Action or Route Handler.
 */
export async function revalidateCatalog(): Promise<void> {
  try {
    revalidateTag(CATALOG_TAG, { expire: 0 });
  } catch (error) {
    // Outside a request scope there is no cache store to expire; the local
    // reload below still runs.
    console.error(`[catalog] revalidateTag failed: ${errorMessage(error)}`);
  }
  invalidateLocalCatalog();
  await ensureCatalog({ force: true });
}
