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

  return data ? toGuide(data as GuideRow) : null;
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
  const { data, error } = await supabase
    .from("guides")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toGuide(data as GuideRow);
}
