import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listCatalog } from "./index";
import { WOKWI_TAGS } from "./wokwi-tags.generated";

function installedTags(): string[] {
  const dir = path.join(process.cwd(), "node_modules/@wokwi/elements/dist/esm");
  const tags = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".js") || file.endsWith(".spec.js")) continue;
    const source = readFileSync(path.join(dir, file), "utf8");
    for (const m of source.matchAll(/customElement\(\s*['"](wokwi-[a-z0-9-]+)['"]\s*\)/g)) {
      tags.add(m[1]);
    }
  }
  return [...tags].sort();
}

describe("wokwi tags", () => {
  it("the generated list matches the installed @wokwi/elements (run npm run gen:wokwi-tags)", () => {
    expect([...WOKWI_TAGS].sort()).toEqual(installedTags());
  });

  it("every wokwi.tag used by the seed exists", () => {
    const c = listCatalog();
    const bad = [...c.boards, ...c.modules, ...c.passives]
      .filter((p) => p.wokwi && !WOKWI_TAGS.has(p.wokwi.tag))
      .map((p) => `${p.id}: ${p.wokwi?.tag}`);
    expect(bad).toEqual([]);
  });
});
