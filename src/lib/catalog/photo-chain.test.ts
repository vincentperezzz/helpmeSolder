import { describe, expect, it, vi } from "vitest";
import { findPartPhotos } from "./photo-chain";
import { openverseItem, page, wrap } from "./photo-fixtures";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const uno = { id: "board.arduino.uno", name: "Arduino Uno" };

type Handler = (url: string) => Response | Promise<Response>;

/** Fetch that answers by host, so each source can be scripted separately. */
function route(handlers: { commons?: Handler; wikipedia?: Handler; openverse?: Handler }) {
  return vi.fn(async (input: string) => {
    const host = new URL(input).hostname;
    const key = host.startsWith("commons")
      ? "commons"
      : host.startsWith("en.wikipedia")
        ? "wikipedia"
        : "openverse";
    const handler = handlers[key];
    return handler ? handler(input) : json(wrap());
  });
}

const manyCommons = wrap(
  page("File:Arduino Uno R3 a.jpg", {
    desc: "https://commons.wikimedia.org/wiki/File:a.jpg",
    thumb: "https://thumb.wikimedia.org/a.jpg",
  }),
  page("File:Arduino Uno R3 b.jpg", {
    desc: "https://commons.wikimedia.org/wiki/File:b.jpg",
    thumb: "https://thumb.wikimedia.org/b.jpg",
  }),
  page("File:Arduino Uno R3 c.jpg", {
    desc: "https://commons.wikimedia.org/wiki/File:c.jpg",
    thumb: "https://thumb.wikimedia.org/c.jpg",
  }),
);

describe("findPartPhotos", () => {
  it("stops after Commons when it has enough photos", async () => {
    const fetchMock = route({ commons: () => json(manyCommons) });
    const res = await findPartPhotos(uno, "Board", fetchMock);
    expect(res.images).toHaveLength(3);
    expect(res.images.every((i) => i.source === "commons")).toBe(true);
    expect(res.trace.map((t) => t.source)).toEqual(["commons"]);
  });

  it("falls through to Wikipedia, then Openverse, when earlier sources are empty", async () => {
    const fetchMock = route({
      commons: (url) =>
        // The Wikipedia lead image resolves through a Commons file lookup.
        url.includes("titles=") ? json(wrap(page("File:Uno.jpg"))) : json(wrap()),
      wikipedia: () => json(wrap({ title: "Arduino Uno", index: 1, pageimage: "Uno.jpg" })),
      openverse: () => json({ results: [openverseItem()] }),
    });
    const res = await findPartPhotos(uno, "Board", fetchMock);
    expect(res.images.map((i) => i.source)).toEqual(["wikipedia", "openverse"]);
    expect(res.complete).toBe(true);
  });

  it("isolates a failing source: Commons and Wikipedia down, Openverse still serves", async () => {
    const fetchMock = route({
      commons: () => {
        throw new Error("403");
      },
      wikipedia: () => new Response("no", { status: 429 }),
      openverse: () => json({ results: [openverseItem()] }),
    });
    const res = await findPartPhotos(uno, "Board", fetchMock);
    expect(res.images).toHaveLength(1);
    expect(res.images[0].source).toBe("openverse");
    expect(res.complete).toBe(true);
    expect(res.trace.map((t) => t.ok)).toEqual([false, false, true]);
  });

  it("answers empty but complete when every source is reachable and has nothing", async () => {
    const res = await findPartPhotos(uno, "Board", route({}));
    expect(res).toMatchObject({ images: [], complete: true });
  });

  it("answers incomplete when sources failed and nothing was found", async () => {
    const res = await findPartPhotos(uno, "Board", vi.fn().mockRejectedValue(new Error("x")));
    expect(res).toMatchObject({ images: [], complete: false });
  });

  it("uses curated phrases for known parts", async () => {
    const fetchMock = route({});
    await findPartPhotos({ id: "passive.pushbutton", name: "Pushbutton" }, "Input", fetchMock);
    const first = new URL(String(fetchMock.mock.calls[0][0]));
    expect(first.searchParams.get("gsrsearch")).not.toBe("Pushbutton module");
  });
});
