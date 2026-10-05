import { describe, expect, it, vi } from "vitest";
import {
  COMMONS_USER_AGENT,
  buildCommonsQuery,
  buildCommonsUrl,
  fetchCommonsImages,
  scoreTitle,
  shapeCommonsResponse,
  stripHtml,
} from "./commons";

function page(
  title: string,
  over: {
    index?: number;
    mime?: string;
    license?: string | null;
    artist?: string;
    thumb?: string;
    desc?: string;
    licenseUrl?: string;
  } = {},
) {
  return {
    title,
    index: over.index ?? 1,
    imageinfo: [
      {
        mime: over.mime ?? "image/jpeg",
        thumburl: over.thumb ?? "https://upload.wikimedia.org/thumb/x/480px-x.jpg",
        descriptionurl:
          over.desc ?? "https://commons.wikimedia.org/wiki/File:x.jpg",
        extmetadata: {
          ...(over.license === null
            ? {}
            : { LicenseShortName: { value: over.license ?? "CC BY-SA 4.0" } }),
          Artist: { value: over.artist ?? '<a href="//x">Jane Roe</a>' },
          LicenseUrl: {
            value: over.licenseUrl ?? "https://creativecommons.org/licenses/by-sa/4.0",
          },
        },
      },
    ],
  };
}

const wrap = (...pages: unknown[]) => ({
  query: { pages: Object.fromEntries(pages.map((p, i) => [String(100 + i), p])) },
});

describe("buildCommonsQuery", () => {
  it("adds board for boards and module for modules", () => {
    expect(buildCommonsQuery("Arduino Uno", "Board")).toBe("Arduino Uno board");
    expect(buildCommonsQuery("HC-SR04 Ultrasonic", "Sensor")).toBe(
      "HC-SR04 Ultrasonic module",
    );
  });
  it("adds nothing for resistors and power parts", () => {
    expect(buildCommonsQuery("Resistor 220Ω", "Basic part")).toBe("Resistor 220Ω");
    expect(buildCommonsQuery("9V Battery (snap)", "Power")).toBe("9V Battery snap");
  });
  it("strips search syntax characters", () => {
    expect(buildCommonsQuery('LCD 1602 (I2C) "x" insource:a', "Display")).toBe(
      "LCD 1602 I2C x insource a module",
    );
    expect(buildCommonsQuery("   ", "Sensor")).toBe("");
  });
});

describe("buildCommonsUrl", () => {
  it("asks for files with thumbnails and license metadata", () => {
    const url = new URL(buildCommonsUrl("Arduino Uno board"));
    expect(url.origin + url.pathname).toBe("https://commons.wikimedia.org/w/api.php");
    expect(url.searchParams.get("generator")).toBe("search");
    expect(url.searchParams.get("gsrnamespace")).toBe("6");
    expect(url.searchParams.get("gsrsearch")).toBe("Arduino Uno board");
    expect(url.searchParams.get("iiurlwidth")).toBe("480");
    expect(url.searchParams.get("iiprop")).toBe("url|extmetadata|mime");
    expect(url.searchParams.get("format")).toBe("json");
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
  it("matches model numbers across hyphens", () => {
    expect(scoreTitle("File:HCSR04 ultrasonic.jpg", "HC-SR04 Ultrasonic")).toBeGreaterThan(0.5);
  });
});

describe("shapeCommonsResponse", () => {
  it("returns safe, shaped images with plain-text author", () => {
    const [img] = shapeCommonsResponse(
      wrap(page("File:Arduino Uno R3.jpg")),
      "Arduino Uno",
    );
    expect(img).toEqual({
      thumb: "https://upload.wikimedia.org/thumb/x/480px-x.jpg",
      pageUrl: "https://commons.wikimedia.org/wiki/File:x.jpg",
      title: "Arduino Uno R3",
      author: "Jane Roe",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    });
  });

  it("rejects svg, gif, unlicensed, off-host and irrelevant files", () => {
    const out = shapeCommonsResponse(
      wrap(
        page("File:Arduino Uno.svg", { mime: "image/svg+xml" }),
        page("File:Arduino Uno anim.gif", { mime: "image/gif" }),
        page("File:Arduino Uno nolicense.jpg", { license: null }),
        page("File:Arduino Uno evil.jpg", { thumb: "https://evil.example/x.jpg" }),
        page("File:Arduino Uno evil2.jpg", { desc: "javascript:alert(1)" }),
        page("File:Cat on a sofa.jpg"),
        page("File:Arduino Uno logo.png", { mime: "image/png" }),
        page("File:Arduino Uno pinout diagram.png", { mime: "image/png" }),
      ),
      "Arduino Uno",
    );
    expect(out).toEqual([]);
  });

  it("requires the model number to appear for numbered parts", () => {
    const out = shapeCommonsResponse(
      wrap(page("File:ESP8266 board.jpg"), page("File:ESP32 board front.jpg")),
      "ESP32 DevKit V1",
    );
    expect(out.map((i) => i.title)).toEqual(["ESP32 board front"]);
  });

  it("keeps a drawing word when it is part of the part name", () => {
    const out = shapeCommonsResponse(
      wrap(page("File:LED Bar Graph.jpg")),
      "LED Bar Graph",
    );
    expect(out).toHaveLength(1);
  });

  it("sorts by score then search rank and caps at three", () => {
    const out = shapeCommonsResponse(
      wrap(
        page("File:Arduino Nano.jpg", { index: 1 }),
        page("File:Arduino Uno a.jpg", { index: 4 }),
        page("File:Arduino Uno b.jpg", { index: 2 }),
        page("File:Arduino Uno c.jpg", { index: 3 }),
        page("File:Arduino Uno d.jpg", { index: 5 }),
      ),
      "Arduino Uno",
    );
    expect(out.map((i) => i.title)).toEqual([
      "Arduino Uno b",
      "Arduino Uno c",
      "Arduino Uno a",
    ]);
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

describe("fetchCommonsImages", () => {
  const okResponse = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200 });

  it("calls Commons with a descriptive user agent and shapes the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(wrap(page("File:Arduino Uno.jpg"))));
    const res = await fetchCommonsImages("Arduino Uno", "Board", fetchMock);
    expect(res.ok).toBe(true);
    expect(res.images).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("gsrsearch=Arduino+Uno+board");
    expect(init.headers["User-Agent"]).toBe(COMMONS_USER_AGENT);
    expect(init.next).toEqual({ revalidate: 604800 });
  });

  it("returns an empty list when the response is not ok or fetch throws", async () => {
    const bad = vi.fn().mockResolvedValue(new Response("nope", { status: 503 }));
    expect(await fetchCommonsImages("Arduino Uno", "Board", bad)).toEqual({
      images: [],
      ok: false,
    });
    const boom = vi.fn().mockRejectedValue(new Error("network"));
    expect(await fetchCommonsImages("Arduino Uno", "Board", boom)).toEqual({
      images: [],
      ok: false,
    });
    const notJson = vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }));
    expect((await fetchCommonsImages("Arduino Uno", "Board", notJson)).images).toEqual([]);
  });

  it("skips the network for an empty name", async () => {
    const fetchMock = vi.fn();
    expect(await fetchCommonsImages("  ", "Board", fetchMock)).toEqual({
      images: [],
      ok: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
