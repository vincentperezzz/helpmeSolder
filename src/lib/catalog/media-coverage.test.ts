import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { boards } from "./boards";
import { modules } from "./modules";
import { passives } from "./passives";
import { resolvePartPhoto } from "./part-media";

describe("catalog thumbnails", () => {
  const parts = [...boards, ...modules, ...passives];

  it("gives every part a thumbnail that exists on disk and is not empty", () => {
    const problems: string[] = [];
    for (const part of parts) {
      const url = resolvePartPhoto(part.photoHint);
      if (!url) {
        problems.push(`${part.id}: no thumbnail registered for "${part.photoHint}"`);
        continue;
      }
      const file = path.join(process.cwd(), "public", url);
      if (!existsSync(file) || statSync(file).size < 500) {
        problems.push(`${part.id}: ${url} is missing or empty`);
      }
    }
    expect(problems).toEqual([]);
  });
});
