import { listCatalog } from "@/lib/catalog";
import type { CatalogPart } from "@/lib/catalog/types";

const PREFIX = /^(module|board|passive)\./;
const STOPWORDS = new Set([
  "module", "board", "sensor", "the", "a", "an", "with", "and", "for", "kit", "breakout",
]);

/** Score at or above this means the query is the same part (not just similar). */
export const STRONG_MATCH = 0.9;
const CUTOFF = 0.5;

/**
 * Stable key for a part name. Lowercase, catalog prefixes removed, every
 * non-alphanumeric character dropped, so "DHT 22", "dht-22" and
 * "module.dht22" all become "dht22". Capped at 80 chars. Empty gives null.
 */
export function normalizePartKey(input: string): string | null {
  if (typeof input !== "string") return null;
  const key = input
    .toLowerCase()
    .trim()
    .replace(PREFIX, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 80);
  return key === "" ? null : key;
}

function tokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(PREFIX, "")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0 && !STOPWORDS.has(token));
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  return a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a));
}

type Candidate = {
  part: CatalogPart;
  keys: string[];
  nameTokens: string[];
  descTokens: string[];
};

let candidates: Candidate[] | null = null;

function getCandidates(): Candidate[] {
  if (candidates) return candidates;
  const { boards, modules, passives } = listCatalog();
  candidates = [...boards, ...modules, ...passives].map((part) => {
    const keys = [part.id, part.name, part.photoHint ?? ""]
      .map((value) => normalizePartKey(value))
      .filter((value): value is string => value !== null);
    return {
      part,
      keys,
      nameTokens: tokens(`${part.id} ${part.name} ${part.photoHint ?? ""}`),
      descTokens: tokens(part.description),
    };
  });
  return candidates;
}

function scoreCandidate(queryKey: string, queryTokens: string[], c: Candidate): number {
  let best = 0;
  for (const key of c.keys) {
    if (key === queryKey) return 1;
    if (key.length >= 4 && queryKey.includes(key)) best = Math.max(best, 0.9);
    else if (queryKey.length >= 4 && key.includes(queryKey)) best = Math.max(best, 0.8);
    const similarity = 1 - editDistance(queryKey, key) / Math.max(queryKey.length, key.length);
    best = Math.max(best, similarity * 0.9);
  }
  if (queryTokens.length > 0) {
    let weight = 0;
    for (const token of queryTokens) {
      if (c.nameTokens.some((t) => tokenMatches(token, t))) weight += 1;
      else if (c.descTokens.some((t) => tokenMatches(token, t))) weight += 0.6;
    }
    best = Math.max(best, 0.85 * (weight / queryTokens.length));
  }
  return best;
}

export type PartSuggestion = {
  id: string;
  name: string;
  kind: CatalogPart["kind"];
  description: string;
  score: number;
};

/**
 * Fuzzy match a free-text part name against the catalog. Pure and
 * deterministic. Unrelated queries return an empty list.
 */
export function suggestClosest(input: string, limit = 5): PartSuggestion[] {
  const queryKey = normalizePartKey(input);
  if (!queryKey) return [];
  const queryTokens = tokens(input);
  return getCandidates()
    .map((c) => ({ c, score: scoreCandidate(queryKey, queryTokens, c) }))
    .filter(({ score }) => score >= CUTOFF)
    .sort((a, b) => b.score - a.score || a.c.part.id.localeCompare(b.c.part.id))
    .slice(0, Math.max(0, limit))
    .map(({ c, score }) => ({
      id: c.part.id,
      name: c.part.name,
      kind: c.part.kind,
      description: c.part.description,
      score: Math.round(score * 100) / 100,
    }));
}
