import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/guides/[id]/print.css"), "utf8");

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? "";
}

describe("schematic print layout", () => {
  it("scales the circuit svg to the page and keeps legend icons at 56px", () => {
    expect(css).not.toMatch(/\.print-only-schematic svg\s*\{/);

    const canvas = block(".print-only-schematic .schematic-canvas");
    expect(canvas).toMatch(/width:\s*100%\s*!important/);
    expect(canvas).toMatch(/max-width:\s*100%\s*!important/);
    expect(canvas).toMatch(/height:\s*auto\s*!important/);

    const icon = block(".schematic-legend .symbol-preview");
    expect(icon).toMatch(/width:\s*56px\s*!important/);
    expect(icon).toMatch(/height:\s*32px\s*!important/);
    expect(icon).toMatch(/max-width:\s*56px\s*!important/);
    expect(icon).toMatch(/flex:\s*0 0 56px\s*!important/);

    const row = block(".schematic-legend li");
    expect(row).toMatch(/flex-direction:\s*row\s*!important/);
    expect(row).toMatch(/white-space:\s*normal\s*!important/);
    expect(row).toMatch(/width:\s*100%\s*!important/);

    const copy = block(".schematic-legend li > span");
    expect(copy).toMatch(/min-width:\s*0\s*!important/);
    expect(copy).toMatch(/white-space:\s*normal\s*!important/);

    expect(css).toMatch(/\.diagram-toolbar,\s*\.schematic-caption\s*\{[^}]*display:\s*none\s*!important/);
    expect(css).not.toMatch(/schematic-legend[^{]*\{[^}]*display:\s*none/);
  });
});
