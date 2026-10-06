import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "./tools";

describe("homepage tool list", () => {
  it("lists exactly the tools the MCP server registers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/mcp/tools.ts"), "utf8");
    const registered = [...source.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
    expect(registered.length).toBeGreaterThan(0);
    expect([...TOOL_NAMES].sort()).toEqual([...registered].sort());
  });
});
