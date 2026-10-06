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

const guideCss = readFileSync(join(process.cwd(), "src/app/guides/[id]/guide.css"), "utf8");
const workspace = readFileSync(join(process.cwd(), "src/components/GuideWorkspace.tsx"), "utf8");
const checks = readFileSync(join(process.cwd(), "src/components/guide/Checks.tsx"), "utf8");

describe("printed guide sections", () => {
  it("unhides inactive tabs and closed warnings without the hidden attribute", () => {
    expect(workspace).not.toMatch(/hidden=\{tab !== id\}/);
    expect(workspace).toMatch(/data-screen-hide=\{tab === id \? undefined : "true"\}/);
    expect(checks).not.toMatch(/hidden=\{!open\}/);
    expect(checks).toMatch(/data-screen-hide=\{open \? undefined : "true"\}/);

    expect(guideCss).toMatch(
      /\.ga-tabpanel\[data-screen-hide\],\s*\.ga-checks\[data-screen-hide\]\s*\{[^}]*display:\s*none\s*;/,
    );
    expect(guideCss).not.toMatch(/\.ga-tabpanel\[hidden\]/);
    expect(guideCss).not.toMatch(/\[data-screen-hide\][^{]*\{[^}]*display:\s*none\s*!important/);

    expect(css).toMatch(
      /\.ga-tabpanel,\s*\.ga-tabpanel\[data-screen-hide\]\s*\{[^}]*display:\s*block\s*!important/,
    );
    expect(css).toMatch(
      /\.ga-checks,\s*\.ga-checks\[data-screen-hide\]\s*\{[^}]*display:\s*block\s*!important/,
    );
    expect(css).not.toMatch(/\[hidden\]/);
  });

  it("lets a print-off flag hide a section", () => {
    for (const section of ["diagram", "parts", "tools", "solder", "steps", "notes", "checks"]) {
      expect(css).toMatch(
        new RegExp(
          `\\.guide-app\\[data-print-${section}="off"\\] \\[data-print-section="${section}"\\]`,
        ),
      );
    }
    expect(css).toMatch(
      /\.guide-app\[data-print-schematic="off"\] \.print-only-schematic\s*\{[^}]*display:\s*none\s*!important/,
    );
  });

  it("lets the scroll area and panel grow with their content", () => {
    const scroll = block(".ga-scroll");
    expect(scroll).toMatch(/display:\s*block\s*!important/);
    expect(scroll).toMatch(/flex:\s*none\s*!important/);
    expect(scroll).toMatch(/height:\s*auto\s*!important/);
    expect(scroll).toMatch(/min-height:\s*auto\s*!important/);
    expect(scroll).toMatch(/max-height:\s*none\s*!important/);
    expect(scroll).toMatch(/overflow:\s*visible\s*!important/);

    expect(css).toMatch(
      /\.ga-panel,\s*\.guide-app\[data-enlarged="true"\] \.ga-panel,\s*\.ga-panel\[data-snap\]\s*\{[^}]*height:\s*auto\s*!important[^}]*max-height:\s*none\s*!important[^}]*overflow:\s*visible\s*!important/,
    );
  });
});
