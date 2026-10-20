import { EXAMPLE_GUIDE, EXAMPLE_LINK_ID } from "@/lib/home/example-guide";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export { EXAMPLE_LINK_ID };

export const PINNED_GUIDE_IDS = [EXAMPLE_LINK_ID] as const;

export function isPinnedGuideId(id: string): boolean {
  return (PINNED_GUIDE_IDS as readonly string[]).includes(id);
}

let ensurePending: Promise<void> | null = null;

export function ensurePinnedExampleGuide(): Promise<void> {
  if (!ensurePending) {
    ensurePending = doEnsurePinnedExampleGuide().finally(() => {
      ensurePending = null;
    });
  }
  return ensurePending;
}

async function doEnsurePinnedExampleGuide(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from("guides")
    .select("id")
    .eq("id", EXAMPLE_LINK_ID)
    .maybeSingle();

  if (readError) {
    throw readError;
  }
  if (existing) {
    return;
  }

  const guide = EXAMPLE_GUIDE;
  const { error: insertError } = await supabase.from("guides").insert({
    id: EXAMPLE_LINK_ID,
    title: guide.title,
    power_source: guide.power_source,
    board_id: guide.board_id,
    parts: guide.parts,
    connections: guide.connections,
    steps: guide.steps,
    notes: guide.notes,
    created_at: guide.created_at,
    updated_at: guide.updated_at,
    last_accessed_at: guide.updated_at,
  });

  if (insertError?.code === "23505") {
    return;
  }
  if (insertError) {
    throw insertError;
  }
}
