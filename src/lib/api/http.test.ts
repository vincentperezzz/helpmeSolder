import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { guarded, notFound, parseBody } from "./http";

const schema = z.object({ title: z.string(), n: z.number().optional() });
const post = (body: string) =>
  new Request("http://localhost/x", { method: "POST", body });

describe("parseBody", () => {
  it("400 on invalid JSON", async () => {
    const r = await parseBody(post("{nope"), schema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("400 with issues on schema failure", async () => {
    const r = await parseBody(post(JSON.stringify({ title: 5 })), schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(400);
      const body = await r.response.json();
      expect(body.error).toBe("Invalid request body");
      expect(body.issues[0]).toMatchObject({ path: "title" });
      expect(typeof body.issues[0].message).toBe("string");
    }
  });

  it("returns data on success", async () => {
    const r = await parseBody(post(JSON.stringify({ title: "a" })), schema);
    expect(r).toEqual({ ok: true, data: { title: "a" } });
  });

  it("empty body: 400 by default, {} when allowEmpty", async () => {
    const strict = await parseBody(post(""), schema);
    expect(strict.ok).toBe(false);
    const loose = await parseBody(post("  "), z.object({}), { allowEmpty: true });
    expect(loose).toEqual({ ok: true, data: {} });
    // allowEmpty still runs schema validation
    const needs = await parseBody(post(""), schema, { allowEmpty: true });
    expect(needs.ok).toBe(false);
  });
});

describe("helpers", () => {
  it("notFound", async () => {
    const r = notFound();
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: "Guide not found" });
  });

  it("guarded converts throws to generic 500 and hides internals", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await guarded(async () => {
      throw new Error("secret db password");
    });
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "Internal server error" });
    vi.restoreAllMocks();
  });
});
