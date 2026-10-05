import type { Guide, GuideConnection, GuidePart, PowerSource } from "@/lib/catalog/types";
import { validateGuide } from "@/lib/guides/validator";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Only the columns the dashboard reads. No ids, titles or content. */
export type GuideRow = {
  board_id: string | null;
  power_source: PowerSource | null;
  parts: GuidePart[] | null;
  connections: GuideConnection[] | null;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string | null;
};

export type GuideStats = {
  total: number;
  created: { today: number; last7: number; last30: number };
  validation: { ok: number; warnings: number; blocked: number };
  /** null when last_accessed_at is not available. */
  retention: null | {
    neverReopened: number;
    idle14: number;
    expiringSoon: number;
  };
};

export function startOfUtcDay(now: number): number {
  return Math.floor(now / DAY_MS) * DAY_MS;
}

/** Counts rows whose created_at falls inside each window (today = since 00:00 UTC). */
export function countCreatedWindows(
  createdAt: string[],
  now: number,
): { today: number; last7: number; last30: number } {
  const dayStart = startOfUtcDay(now);
  const result = { today: 0, last7: 0, last30: 0 };
  for (const value of createdAt) {
    const t = Date.parse(value);
    if (!Number.isFinite(t)) continue;
    if (t >= dayStart) result.today++;
    if (t >= now - 7 * DAY_MS) result.last7++;
    if (t >= now - 30 * DAY_MS) result.last30++;
  }
  return result;
}

export function retentionCounts(
  rows: Pick<GuideRow, "created_at" | "updated_at" | "last_accessed_at">[],
  now: number,
  retentionDays: number,
): { neverReopened: number; idle14: number; expiringSoon: number } {
  let neverReopened = 0;
  let idle14 = 0;
  let expiringSoon = 0;
  for (const row of rows) {
    const accessed = Date.parse(row.last_accessed_at ?? row.updated_at);
    if (!Number.isFinite(accessed)) continue;
    const created = Date.parse(row.created_at);
    // "Never opened again": last access is within a minute of creation.
    if (Number.isFinite(created) && accessed - created < 60_000) neverReopened++;
    if (now - accessed >= 14 * DAY_MS) idle14++;
    const expires = accessed + retentionDays * DAY_MS;
    if (expires > now && expires - now <= 7 * DAY_MS) expiringSoon++;
  }
  return { neverReopened, idle14, expiringSoon };
}

export function summarizeGuides(
  rows: GuideRow[],
  options: { now: number; retentionDays: number; hasAccessColumn: boolean },
): GuideStats {
  const { now, retentionDays, hasAccessColumn } = options;
  const validation = { ok: 0, warnings: 0, blocked: 0 };
  for (const row of rows) {
    const guide: Guide = {
      id: "",
      title: "",
      power_source: row.power_source,
      board_id: row.board_id,
      parts: row.parts ?? [],
      connections: row.connections ?? [],
      steps: [],
      notes: [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    try {
      const result = validateGuide(guide);
      if (!result.ok) validation.blocked++;
      else if (result.issues.length > 0) validation.warnings++;
      else validation.ok++;
    } catch {
      validation.blocked++;
    }
  }

  return {
    total: rows.length,
    created: countCreatedWindows(
      rows.map((r) => r.created_at),
      now,
    ),
    validation,
    retention: hasAccessColumn ? retentionCounts(rows, now, retentionDays) : null,
  };
}
