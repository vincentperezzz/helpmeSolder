import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = path.join(process.cwd(), "src", "app");
const ENTRY_FILE = /^(page\.tsx|route\.ts|actions\.ts|layout\.tsx)$/;

/**
 * Importing any of these means the file reads the catalog (directly or through
 * guides, MCP tools or admin helpers), so it must `await ensureCatalog()` first.
 * Type-only and pure-constant catalog modules do not read the registry.
 */
const CATALOG_READERS: RegExp[] = [
  /from\s+"@\/lib\/catalog"/,
  /from\s+"@\/lib\/catalog\/(?!types"|commons"|server")/,
  /from\s+"@\/lib\/guides\//,
  /from\s+"@\/lib\/mcp\/tools"/,
  /from\s+"@\/lib\/admin\/(coverage|stats|usage|asset-view|data)"/,
];

/** Entry points that import a reader module but legitimately never touch the catalog. */
const ALLOW_LIST: { file: string; reason: string }[] = [
  {
    file: "api/cron/cleanup/route.ts",
    reason: "only deletes expired guide rows and reads the retention setting; no part lookup",
  },
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return ENTRY_FILE.test(entry.name) ? [full] : [];
  });
}

function rel(file: string): string {
  return path.relative(APP_DIR, file).split(path.sep).join("/");
}

describe("catalog entry points", () => {
  const files = walk(APP_DIR);
  const allowed = new Set(ALLOW_LIST.map((entry) => entry.file));

  it("finds the entry points", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("has a reason for every allow-list entry and no stale ones", () => {
    const existing = new Set(files.map(rel));
    for (const entry of ALLOW_LIST) {
      expect(entry.reason.length).toBeGreaterThan(10);
      expect(existing.has(entry.file), `${entry.file} no longer exists`).toBe(true);
    }
  });

  it("calls ensureCatalog() in every entry point that reads the catalog", () => {
    const missing = files
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return CATALOG_READERS.some((re) => re.test(source)) && !source.includes("ensureCatalog(");
      })
      .map(rel)
      .filter((file) => !allowed.has(file));
    expect(missing).toEqual([]);
  });
});
