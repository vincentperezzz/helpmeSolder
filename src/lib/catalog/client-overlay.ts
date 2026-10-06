import { getActiveCatalog, swapCatalog, type CatalogSnapshot } from "./registry";
import { SEED_SNAPSHOT } from "./seed";
import type { CatalogPart } from "./types";

/**
 * What the server sends the browser on top of the bundled seed: only parts
 * (and photo urls) that differ from it. Plain JSON, usually empty.
 */
export type ClientOverlay = {
  version: string;
  parts: CatalogPart[];
  /** id -> 'r<version>' for each part in `parts`. */
  revisions: Record<string, string>;
  /** photoHint -> url, only where it differs from the seed. */
  media: Record<string, string>;
  photoQueries?: never;
};

export const OVERLAY_MAX_BYTES = 64 * 1024;

export const EMPTY_OVERLAY: ClientOverlay = Object.freeze({
  version: "0",
  parts: [],
  revisions: {},
  media: {},
}) as ClientOverlay;

function revisionNumber(revision: string | undefined): number {
  if (!revision || revision === "s") return 0;
  const n = Number(revision.slice(1));
  return Number.isFinite(n) ? n : 0;
}

function overlayBytes(overlay: ClientOverlay): number {
  return new TextEncoder().encode(JSON.stringify(overlay)).length;
}

function versionOf(parts: CatalogPart[], revisions: Record<string, string>, media: Record<string, string>): string {
  if (!parts.length && !Object.keys(media).length) return "0";
  const text = JSON.stringify([
    parts.map((p) => [p.id, revisions[p.id], p.deprecated === true, p.replacedBy ?? null]),
    Object.entries(media).sort(([a], [b]) => (a < b ? -1 : 1)),
  ]);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${hash.toString(36)}.${parts.length}.${Object.keys(media).length}`;
}

function assemble(snapshot: CatalogSnapshot, seed: CatalogSnapshot, ids: Iterable<string>): ClientOverlay {
  const parts: CatalogPart[] = [];
  const revisions: Record<string, string> = {};
  const media: Record<string, string> = {};
  for (const id of ids) {
    const part = snapshot.parts.get(id);
    if (!part) continue;
    const revision = snapshot.revisions.get(id) ?? "s";
    if (revision !== "s" || !seed.parts.has(id)) {
      parts.push(part);
      revisions[id] = revision;
    }
    const hint = part.photoHint;
    const url = hint ? snapshot.media.get(hint) : undefined;
    if (hint && url !== undefined && url !== seed.media.get(hint)) media[hint] = url;
  }
  return { version: versionOf(parts, revisions, media), parts, revisions, media };
}

/**
 * Overlay for the given part ids (guide parts and board). Also covers every
 * passive.power.* part and the replacement targets of deprecated parts.
 * Over 64 KB it falls back to the given ids only.
 */
export function buildClientOverlay(
  snapshot: CatalogSnapshot,
  ids: string[],
  seed: CatalogSnapshot = SEED_SNAPSHOT,
): ClientOverlay {
  const wanted = new Set(ids);
  for (const id of snapshot.parts.keys()) if (id.startsWith("passive.power.")) wanted.add(id);
  for (const id of [...wanted]) {
    let target = snapshot.parts.get(id)?.replacedBy;
    for (let hop = 0; target && hop < 5 && !wanted.has(target); hop++) {
      wanted.add(target);
      target = snapshot.parts.get(target)?.replacedBy;
    }
  }
  const overlay = assemble(snapshot, seed, wanted);
  if (overlayBytes(overlay) <= OVERLAY_MAX_BYTES) return overlay;
  console.error("[catalog] client overlay exceeds 64 KB; sending only the guide's own parts");
  const own = assemble(snapshot, seed, new Set(ids));
  if (overlayBytes(own) <= OVERLAY_MAX_BYTES) return own;
  console.error("[catalog] guide's own overlay still exceeds 64 KB; sending none");
  return { ...EMPTY_OVERLAY, parts: [], revisions: {}, media: {} };
}

/**
 * Merge an overlay into the registry of this module graph. Idempotent, and a
 * part whose current revision is already as new (or newer) is left alone.
 */
export function applyClientOverlay(overlay: ClientOverlay): void {
  if (!overlay.parts.length && !Object.keys(overlay.media).length) return;
  const current = getActiveCatalog();
  const fresh = overlay.parts.filter(
    (part) => revisionNumber(overlay.revisions[part.id]) > revisionNumber(current.revisions.get(part.id)),
  );
  const mediaChanged = Object.entries(overlay.media).filter(([hint, url]) => current.media.get(hint) !== url);
  if (!fresh.length && !mediaChanged.length) return;

  const parts = new Map(current.parts);
  const revisions = new Map(current.revisions);
  const media = new Map(current.media);
  for (const part of fresh) {
    parts.set(part.id, part);
    revisions.set(part.id, overlay.revisions[part.id]);
  }
  for (const [hint, url] of mediaChanged) media.set(hint, url);

  const list = (kind: CatalogPart["kind"], existing: CatalogPart[]): CatalogPart[] => {
    const touched = new Set(fresh.filter((p) => p.kind === kind).map((p) => p.id));
    if (!touched.size) return existing;
    const seen = new Set<string>();
    const out: CatalogPart[] = [];
    for (const p of existing) {
      seen.add(p.id);
      const next = touched.has(p.id) ? parts.get(p.id) : p;
      if (next && !next.deprecated) out.push(next);
    }
    for (const id of touched) {
      const next = parts.get(id);
      if (!seen.has(id) && next && !next.deprecated) out.push(next);
    }
    return out;
  };

  swapCatalog(
    Object.freeze({
      ...current,
      parts,
      boards: list("board", current.boards),
      modules: list("module", current.modules),
      passives: list("passive", current.passives),
      media,
      revisions,
    }),
  );
}
