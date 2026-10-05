import { describe, expect, it, vi } from "vitest";
import { page, wrap } from "./photo-fixtures";
import {
  buildWikipediaSearchUrl,
  buildWikipediaTitlesUrl,
  leadImageFiles,
  searchWikipedia,
} from "./wikipedia";

const article = (title: string, pageimage?: string, index = 1) => ({
  title,
  index,
  ...(pageimage ? { pageimage } : {}),
});

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("urls", () => {
  it("looks up named articles with redirects", () => {
    const url = new URL(buildWikipediaTitlesUrl(["Servomotor", "Resistor"]));
    expect(url.origin).toBe("https://en.wikipedia.org");
    expect(url.searchParams.get("prop")).toBe("pageimages");
    expect(url.searchParams.get("titles")).toBe("Servomotor|Resistor");
    expect(url.searchParams.get("redirects")).toBe("1");
  });
  it("searches articles", () => {
    const url = new URL(buildWikipediaSearchUrl("servo motor -toy"));
    expect(url.searchParams.get("generator")).toBe("search");
    expect(url.searchParams.get("gsrsearch")).toBe("servo motor");
  });
});

describe("leadImageFiles", () => {
  it("lists lead image files and drops drawings and imageless articles", () => {
    const body = wrap(
      article("Resistor", "Resistors_photo.jpg"),
      article("Resistor symbol", "Resistor_symbol_diagram.png"),
      article("Nothing"),
    );
    expect(leadImageFiles(body, null)).toEqual(["File:Resistors photo.jpg"]);
  });
  it("filters searched articles by title relevance", () => {
    const body = wrap(article("Servomotor", "Servo.jpg", 1), article("Cat", "Cat.jpg", 2));
    expect(leadImageFiles(body, "servo motor")).toEqual(["File:Servo.jpg"]);
  });
});

describe("searchWikipedia", () => {
  it("returns only lead images that Commons hosts under a free licence", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json(wrap(article("Servomotor", "Servo_free.jpg"), article("Other", "Local_only.jpg"))),
      )
      // Commons knows only the first file; the other is a local fair-use upload.
      .mockResolvedValueOnce(json(wrap(page("File:Servo free.jpg"))));
    const res = await searchWikipedia(["Servomotor", "Other"], [], fetchMock);
    expect(res.ok).toBe(true);
    expect(res.images).toHaveLength(1);
    expect(res.images[0]).toMatchObject({ title: "Servo free", source: "wikipedia" });
    expect(String(fetchMock.mock.calls[1][0])).toContain("commons.wikimedia.org");
  });

  it("rejects a Commons file with a non-free licence", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(wrap(article("Servomotor", "Servo.jpg"))))
      .mockResolvedValueOnce(json(wrap(page("File:Servo.jpg", { license: "CC BY-NC 2.0" }))));
    expect((await searchWikipedia(["Servomotor"], [], fetchMock)).images).toEqual([]);
  });

  it("never throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("down"));
    expect(await searchWikipedia([], ["servo motor"], fetchMock)).toEqual({
      images: [],
      ok: false,
    });
  });
});
