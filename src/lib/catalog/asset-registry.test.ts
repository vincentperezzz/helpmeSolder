import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listAssetRecords, summarizeAssets } from "./asset-registry";
import { SEED_SNAPSHOT } from "./seed";

const parts = [...SEED_SNAPSHOT.boards, ...SEED_SNAPSHOT.modules, ...SEED_SNAPSHOT.passives];

describe("asset registry", () => {
  const records = listAssetRecords();

  it("has exactly one record per catalog part", () => {
    expect(records).toHaveLength(parts.length);
    expect(records.map((r) => r.partId).sort()).toEqual(parts.map((p) => p.id).sort());
  });

  it("has unique ids", () => {
    expect(new Set(records.map((r) => r.partId)).size).toBe(records.length);
  });

  it("only sets thumbnail and drawing URLs that exist on disk", () => {
    const missing: string[] = [];
    for (const record of records) {
      for (const url of [record.thumbnailUrl, record.drawingUrl]) {
        if (url && !existsSync(path.join(process.cwd(), "public", url))) {
          missing.push(`${record.partId}: ${url}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("keeps thumbnail fields consistent", () => {
    for (const record of records) {
      if (record.thumbnailUrl === null) {
        expect(record.thumbnailSource).toBe("none");
        expect(record.thumbnailFormat).toBeNull();
      } else {
        expect(record.thumbnailSource).not.toBe("none");
      }
    }
  });

  it("summary counts add up", () => {
    const summary = summarizeAssets(records);
    expect(summary.total).toBe(records.length);
    expect(summary.withPhoto + summary.withIllustration + summary.generic + summary.missing).toBe(
      summary.total,
    );
    expect(summary.skeletonDrawings).toBe(
      records.filter((r) => r.drawingKind === "skeleton").length,
    );
  });
});
