import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRINT_PAPER_LABELS,
  printContentWidthMm,
  printPageWidthMm,
  printPictureWidth,
} from "@/components/guide/view-storage";

const css = readFileSync(join(process.cwd(), "src/app/guides/[id]/print-page.css"), "utf8");
const button = readFileSync(join(process.cwd(), "src/app/guides/[id]/PrintButton.tsx"), "utf8");

function pageBlock(name: string): string {
  const header = name ? `@page ${name}` : "@page";
  const match = css.match(new RegExp(`${header}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? "";
}

describe("print page size", () => {
  it("keeps every page rule inside @media print", () => {
    expect(css.trimStart().startsWith("@media print")).toBe(true);
    expect(css).not.toMatch(/^@page/m);
    expect(pageBlock("")).toMatch(/margin:\s*12mm/);
    expect(pageBlock("print-letter")).toMatch(/margin:\s*12mm/);
    expect(pageBlock("print-long")).toMatch(/margin:\s*12mm/);
    expect(pageBlock("print-a4")).toMatch(/margin:\s*12mm/);
  });

  it("offers letter, long bond, and A4", () => {
    expect(pageBlock("")).toMatch(/size:\s*8\.5in 11in/);
    expect(pageBlock("print-letter")).toMatch(/size:\s*8\.5in 11in/);
    expect(pageBlock("print-long")).toMatch(/size:\s*8\.5in 13in/);
    expect(pageBlock("print-a4")).toMatch(/size:\s*210mm 297mm/);
    expect(css).toMatch(/\.guide-app\[data-print-paper="letter"\][\s\S]*page:\s*print-letter/);
    expect(css).toMatch(/\.guide-app\[data-print-paper="long"\][\s\S]*page:\s*print-long/);
    expect(css).toMatch(/\.guide-app\[data-print-paper="a4"\][\s\S]*page:\s*print-a4/);
  });

  it("caps the diagram and schematic at the printable content width", () => {
    const letter = css.match(
      /\.guide-app\[data-print-paper="letter"\] \.diagram-viewport,[\s\S]*?\.guide-app\[data-print-paper="long"\] \.ga-bar\s*\{([^}]*)\}/,
    )?.[1];
    const a4 = css.match(
      /\.guide-app\[data-print-paper="a4"\] \.diagram-viewport,[\s\S]*?\.ga-bar\s*\{([^}]*)\}/,
    )?.[1];
    expect(letter).toMatch(/max-width:\s*calc\(8\.5in - 24mm - 2px\)\s*!important/);
    expect(a4).toMatch(/max-width:\s*calc\(210mm - 24mm - 2px\)\s*!important/);
    expect(css).toMatch(/data-print-paper="letter"\] \.schematic-canvas/);
    expect(css).toMatch(/data-print-paper="letter"\] \.diagram-shell/);
    expect(css).toMatch(/data-print-paper="letter"\] \.print-only-diagram/);
    expect(css).toMatch(/data-print-paper="letter"\] \.print-only-schematic/);
    expect(css).toMatch(/data-print-paper="letter"\] \.ga-bar/);
    expect(css).toMatch(/data-print-paper="a4"\] \.schematic-canvas/);
    expect(css).toMatch(/data-print-paper="a4"\] \.diagram-shell/);
    expect(css).toMatch(/data-print-paper="a4"\] \.print-only-diagram/);
    expect(css).toMatch(/data-print-paper="a4"\] \.print-only-schematic/);
    expect(css).toMatch(/data-print-paper="a4"\] \.ga-bar/);
    expect(printContentWidthMm("a4")).toBeLessThan(printContentWidthMm("letter"));
    expect(printPageWidthMm("long")).toBe(printPageWidthMm("letter"));
    expect(printPictureWidth("a4")).toBeLessThan(printPictureWidth("letter"));
  });

  it("sets the paper attribute for the same print lifecycle as the other flags", () => {
    expect(button).toMatch(/import "\.\/print-page\.css"/);
    expect(button).toMatch(/printPictureWidth\(paper\)/);
    expect(button).toMatch(/setAttribute\("data-print-paper", paper\)/);
    expect(button).toMatch(/removeAttribute\("data-print-paper"\)/);
    expect(button).toMatch(/Include in print/);
    expect(button).toMatch(/PRINT_PAPER_LABELS\[id\]/);
    expect(button).toMatch(/<legend className="ga-print-menu-legend">Paper<\/legend>/);
    expect(PRINT_PAPER_LABELS).toEqual({ letter: "Letter", long: "Long", a4: "A4" });
  });
});
