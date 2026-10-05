import { customAlphabet } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Guide,
  GuideConnection,
  GuidePart,
  GuideStep,
  PowerSource,
} from "@/lib/catalog/types";

const makeId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 22);

const DAY_MS = 24 * 60 * 60 * 1000;
/** getGuide writes last_accessed_at at most this often per guide. */
const TOUCH_INTERVAL_MS = DAY_MS;

/** True when an error means the last_accessed_at column does not exist yet (migration not applied). */
function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const { code, message } = error as { code?: string; message?: string };
  return (
    code === "42703" ||
    code === "PGRST204" ||
    (typeof message === "string" && message.includes("last_accessed_at"))
  );
}

/**
 * Best-effort, throttled "last opened" bookkeeping. Never throws and is a
 * no-op when the migration has not been applied (the column is absent).
 */
async function touchIfStale(row: GuideRow): Promise<void> {
  try {
    if (!("last_accessed_at" in row)) {
      return;
    }
    const last = row.last_accessed_at ? Date.parse(row.last_accessed_at) : NaN;
    if (Number.isFinite(last) && Date.now() - last < TOUCH_INTERVAL_MS) {
      return;
    }
    const { error } = await getSupabaseAdmin()
      .from("guides")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("[guides] failed to touch last_accessed_at:", error);
  }
}

type GuideRow = {
  id: string;
  title: string;
  power_source: PowerSource | null;
  board_id: string | null;
  parts: GuidePart[];
  connections: GuideConnection[];
  steps: GuideStep[];
  notes: string[];
  created_at: string;
  updated_at: string;
  last_accessed_at?: string | null;
};

function toGuide(row: GuideRow): Guide {
  return {
    id: row.id,
    title: row.title,
    power_source: row.power_source,
    board_id: row.board_id,
    parts: row.parts ?? [],
    connections: row.connections ?? [],
    steps: row.steps ?? [],
    notes: row.notes ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_accessed_at: row.last_accessed_at ?? null,
  };
}

export async function createGuide(input: {
  title?: string;
  board_id?: string;
}): Promise<Guide> {
  const supabase = getSupabaseAdmin();
  const id = makeId();
  const { data, error } = await supabase
    .from("guides")
    .insert({
      id,
      title: input.title ?? "",
      board_id: input.board_id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toGuide(data as GuideRow);
}

export async function getGuide(id: string): Promise<Guide | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  await touchIfStale(data as GuideRow);
  return toGuide(data as GuideRow);
}

export async function updateGuide(
  id: string,
  patch: Partial<{
    title: string;
    power_source: PowerSource | null;
    board_id: string | null;
    parts: GuidePart[];
    connections: GuideConnection[];
    steps: GuideStep[];
    notes: string[];
  }>,
): Promise<Guide> {
  const supabase = getSupabaseAdmin();
  const run = (values: Record<string, unknown>) =>
    supabase.from("guides").update(values).eq("id", id).select("*").single();

  let result = await run({ ...patch, last_accessed_at: new Date().toISOString() });
  if (result.error && isMissingColumnError(result.error)) {
    // Migration 0001 not applied yet: update without the retention column.
    result = await run(patch);
  }

  if (result.error) {
    throw result.error;
  }

  return toGuide(result.data as GuideRow);
}

/**
 * Deletes guides not opened or updated within `retentionDays`. Uses
 * last_accessed_at (updated_at when it is null). Refuses to delete anything if
 * the column does not exist yet. Returns the number of rows deleted.
 */
export async function deleteExpiredGuides(retentionDays: number): Promise<number> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS).toISOString();

  const result = await supabase
    .from("guides")
    .delete()
    .or(
      `last_accessed_at.lt.${cutoff},and(last_accessed_at.is.null,updated_at.lt.${cutoff})`,
    )
    .select("id");

  if (result.error && isMissingColumnError(result.error)) {
    throw new Error(
      "guides.last_accessed_at is missing: apply supabase/migrations/0001_guide_retention.sql before enabling cleanup. Nothing was deleted.",
    );
  }

  if (result.error) {
    throw result.error;
  }

  return result.data?.length ?? 0;
}
