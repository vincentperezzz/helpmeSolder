import { describe, expect, it, vi } from "vitest";
import {
  buildCommonsFilesUrl,
  buildCommonsUrl,
  scoreTitle,
  searchCommons,
  shapeCommonsResponse,
  stripHtml,
} from "./commons";
import { page, wrap } from "./photo-fixtures";
import { PHOTO_USER_AGENT } from "./photo-shared";

describe("buildCommonsUrl", () => {
  it("asks for files with thumbnails, originals and license metadata", () => {
    const url = new URL(buildCommonsUrl("Arduino Uno R3"));
    expect(url.origin + url.pathname).toBe("https://commons.wikimedia.org/w/api.php");
    expect(url.searchParams.get("generator")).toBe("search");
    expect(url.searchParams.get("gsrnamespace")).toBe("6");
    expect(url.searchParams.get("gsrsearch")).toBe("Arduino Uno R3");
    expect(url.searchParams.get("iiurlwidth")).toBe("480");
    expect(url.searchParams.get("iiprop")).toBe("url|extmetadata|mime");
    expect(url.searchParams.get("format")).toBe("json");
  });
  it("strips search syntax but keeps a minus exclusion", () => {
    const url = new URL(buildCommonsUrl('LCD "x" insource:a -keyboard'));
    expect(url.searchParams.get("gsrsearch")).toBe("LCD x insource a -keyboard");
  });
  it("looks up named files", () => {
    const url = new URL(buildCommonsFilesUrl(["File:A.jpg", "File:B.jpg"]));
    expect(url.searchParams.get("titles")).toBe("File:A.jpg|File:B.jpg");
  });
});

describe("stripHtml", () => {
  it("removes tags and decodes entities", () => {
    expect(stripHtml('<a href="//u">Jo &amp; Co</a> <b>&#169; 2020</b>')).toBe(
      "Jo & Co © 2020",
    );
    expect(stripHtml("  a \n  b ")).toBe("a b");
    expect(stripHtml("&bogus; &#xZZ;")).toBe("&bogus; &#xZZ;");
  });
});

describe("scoreTitle", () => {
  it("scores identifying words and ignores filler", () => {
    expect(scoreTitle("File:Arduino Uno R3 front.jpg", "Arduino Uno")).toBe(1);
    expect(scoreTitle("File:Arduino Nano.jpg", "Arduino Uno")).toBe(0.5);
    expect(scoreTitle("File:Cat.jpg", "Arduino Uno")).toBe(0);
  });
});

describe("shapeCommonsResponse", () => {
  it("accepts thumb.wikimedia.org thumbnails (regression: every part came back empty)", () => {
    const [img] = shapeCommonsResponse(wrap(page("File:Arduino Uno R3.jpg")), "Arduino Uno");
    expect(img).toEqual({
      url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/x.jpg",
      thumbUrl:
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/x.jpg/500px-x.jpg?utm_source=commons.wikimedia.org",
      title: "Arduino Uno R3",
      author: "Jane Roe",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:x.jpg",
      source: "commons",
    });
  });

  it("still accepts upload.wikimedia.org thumbnails", () => {
    const out = shapeCommonsResponse(
      wrap(
        page("File:Arduino Uno.jpg", {
          thumb: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/x.jpg/480px-x.jpg",
        }),
      ),
      "Arduino Uno",
    );
    expect(out).toHaveLength(1);
  });

  it("rejects svg, gif, bad licences, off-host and irrelevant files", () => {
    const out = shapeCommonsResponse(
      wrap(
        page("File:Arduino Uno.svg", { mime: "image/svg+xml" }),
        page("File:Arduino Uno anim.gif", { mime: "image/gif" }),
        page("File:Arduino Uno nolicense.jpg", { license: null }),
        page("File:Arduino Uno nc.jpg", { license: "CC BY-NC 4.0" }),
        page("File:Arduino Uno nd.jpg", { license: "CC BY-ND 2.0" }),
        page("File:Arduino Uno fair.jpg", { license: "Fair use" }),
        page("File:Arduino Uno evil.jpg", { thumb: "https://evil.example/x.jpg" }),
        page("File:Arduino Uno evil3.jpg", { url: "http://upload.wikimedia.org/x.jpg" }),
        page("File:Arduino Uno evil2.jpg", { desc: "javascript:alert(1)" }),
        page("File:Cat on a sofa.jpg"),
        page("File:Arduino Uno logo.png", { mime: "image/png" }),
        page("File:Arduino Uno pinout diagram.png", { mime: "image/png" }),
      ),
      "Arduino Uno",
    );
    expect(out).toEqual([]);
  });

  it("accepts CC0 and public domain", () => {
    const out = shapeCommonsResponse(
      wrap(
        page("File:Arduino Uno a.jpg", { license: "CC0" }),
        page("File:Arduino Uno b.jpg", { license: "Public domain" }),
      ),
      "Arduino Uno",
    );
    expect(out).toHaveLength(2);
  });

  it("requires the model number for numbered parts", () => {
    const out = shapeCommonsResponse(
      wrap(page("File:ESP8266 board.jpg"), page("File:ESP32 board front.jpg")),
      "ESP32 DevKit",
    );
    expect(out.map((i) => i.title)).toEqual(["ESP32 board front"]);
  });

  it("requires plain numbers in the query to match exactly", () => {
    const out = shapeCommonsResponse(
      wrap(
        page("File:Raspberry Pi 4 Model B - Side.jpg", { index: 1 }),
        page("File:Raspberry Pi 3 Model B plus top.jpg", { index: 2 }),
      ),
      "Raspberry Pi 3 Model B+",
    );
    expect(out.map((i) => i.title)).toEqual(["Raspberry Pi 3 Model B plus top"]);
  });

  it("honours minus exclusions", () => {
    const out = shapeCommonsResponse(
      wrap(
        page("File:Matias Tactile keyboard switch.jpg", { index: 1 }),
        page("File:Tactile switches.jpg", { index: 2 }),
      ),
      "tactile switch -keyboard",
    );
    expect(out.map((i) => i.title)).toEqual(["Tactile switches"]);
  });

  it("keeps a drawing word when the query asks for it", () => {
    const out = shapeCommonsResponse(wrap(page("File:LED Bar Graph.jpg")), "LED Bar Graph");
    expect(out).toHaveLength(1);
  });

  it("sorts by search rank and caps at three", () => {
    const out = shapeCommonsResponse(
      wrap(
        page("File:Arduino Uno a.jpg", { index: 4 }),
        page("File:Arduino Uno b.jpg", { index: 2 }),
        page("File:Arduino Uno c.jpg", { index: 3 }),
        page("File:Arduino Uno d.jpg", { index: 5 }),
      ),
      "Arduino Uno",
    );
    expect(out.map((i) => i.title)).toEqual(["Arduino Uno b", "Arduino Uno c", "Arduino Uno a"]);
  });

  it("falls back to Unknown author, null license url, and clips long names", () => {
    const [img] = shapeCommonsResponse(
      wrap(page("File:Arduino Uno.jpg", { artist: "", licenseUrl: "javascript:x" })),
      "Arduino Uno",
    );
    expect(img.author).toBe("Unknown author");
    expect(img.licenseUrl).toBeNull();
    const [long] = shapeCommonsResponse(
      wrap(page("File:Arduino Uno.jpg", { artist: "x".repeat(300) })),
      "Arduino Uno",
    );
    expect(long.author.length).toBeLessThanOrEqual(80);
  });

  it("handles array pages and garbage input", () => {
    const arr = { query: { pages: [page("File:Arduino Uno.jpg")] } };
    expect(shapeCommonsResponse(arr, "Arduino Uno")).toHaveLength(1);
    expect(shapeCommonsResponse(null, "x")).toEqual([]);
    expect(shapeCommonsResponse({ query: {} }, "x")).toEqual([]);
    expect(shapeCommonsResponse({ query: { pages: [null, 3, {}] } }, "x")).toEqual([]);
  });
});

describe("searchCommons", () => {
  const okResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it("calls Commons with a descriptive user agent and shapes the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(wrap(page("File:Arduino Uno.jpg"))));
    const res = await searchCommons(["Arduino Uno"], fetchMock);
    expect(res.ok).toBe(true);
    expect(res.images).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("gsrsearch=Arduino+Uno");
    expect(init.headers["User-Agent"]).toBe(PHOTO_USER_AGENT);
  });

  it("tries the next query only while photos are missing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(wrap()))
      .mockResolvedValueOnce(okResponse(wrap(page("File:Arduino Uno b.jpg"))));
    const res = await searchCommons(["nothing here", "Arduino Uno"], fetchMock);
    expect(res.images).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never throws: failures give an empty, not-ok result", async () => {
    const bad = vi.fn().mockResolvedValue(new Response("nope", { status: 503 }));
    expect(await searchCommons(["Arduino Uno"], bad)).toEqual({ images: [], ok: false });
    const boom = vi.fn().mockRejectedValue(new Error("network"));
    expect(await searchCommons(["Arduino Uno"], boom)).toEqual({ images: [], ok: false });
    const notJson = vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }));
    expect((await searchCommons(["Arduino Uno"], notJson)).images).toEqual([]);
  });

  it("skips the network when there are no queries", async () => {
    const fetchMock = vi.fn();
    expect(await searchCommons([], fetchMock)).toEqual({ images: [], ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
