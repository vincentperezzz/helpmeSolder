import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/guides/[id]/print.css"), "utf8");
const printButton = readFileSync(join(process.cwd(), "src/app/guides/[id]/PrintButton.tsx"), "utf8");

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

  it("draws a closed border box on the print header and schematic frame", () => {
    const bar = block(".ga-bar");
    expect(bar).toMatch(/border:\s*1px solid #000\s*!important/);
    expect(bar).toMatch(/box-shadow:\s*inset 0 0 0 1px #000\s*!important/);
    expect(bar).toMatch(/box-sizing:\s*border-box\s*!important/);

    expect(css).toMatch(
      /\.print-only-diagram,\s*\.print-only-schematic\s*\{[^}]*border:\s*1px solid #000\s*!important[^}]*box-shadow:\s*inset 0 0 0 1px #000\s*!important/,
    );
    expect(css).toMatch(
      /\.diagram-shell,\s*\.whiteboard-shell,\s*\.whiteboard-shell\.is-enlarged,\s*\.whiteboard-shell\.is-fullscreen\s*\{[^}]*border:\s*1px solid #000\s*!important[^}]*box-shadow:\s*inset 0 0 0 1px #000\s*!important/,
    );
    expect(css).toMatch(
      /\.print-only-schematic \.diagram-shell,\s*\.print-only-schematic \.whiteboard-shell,[\s\S]*?\{[^}]*border:\s*0\s*!important[^}]*box-shadow:\s*none\s*!important/,
    );
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
      /\.guide-app\[data-print-schematic="off"\] \.print-only-schematic,\s*\.guide-app\[data-print-diagram="off"\] \.print-only-diagram\s*\{[^}]*display:\s*none\s*!important/,
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

describe("wiring diagram print clone", () => {
  it("mounts a print-only Wokwi clone when the live canvas is schematic", () => {
    expect(printButton).toMatch(/print-only-diagram/);
    expect(printButton).toMatch(/WokwiDiagram/);
    expect(printButton).toMatch(/options\.diagram && view === "schematic"/);
    expect(printButton).toMatch(/<h2>Wiring picture<\/h2>/);
    expect(guideCss).toMatch(/\.print-only-diagram,\s*\.print-only-schematic\s*\{/);
    expect(css).toMatch(/\.print-only-diagram,\s*\.print-only-schematic\s*\{/);
  });

  it("treats the live canvas as schematic when that view is active", () => {
    expect(css).toMatch(
      /\.guide-app\[data-view="schematic"\]\[data-print-schematic="off"\] \[data-print-section="diagram"\]\s*\{[^}]*display:\s*none\s*!important/,
    );
    expect(css).toMatch(
      /\.guide-app\[data-view="schematic"\]\[data-print-schematic="on"\] \[data-print-section="diagram"\]\s*\{[^}]*display:\s*block\s*!important/,
    );
    expect(css).toMatch(
      /\.guide-app\[data-view="schematic"\] \.print-only-schematic\s*\{[^}]*display:\s*none\s*!important/,
    );
  });
});
