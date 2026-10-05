import { describe, expect, it } from "vitest";
import { dragHeight, drawerHeights, pickSnap, rubberBand, snapForKey } from "./drawer";

const heights = drawerHeights(800, 700); // peek 56, split 360, full 700

describe("drawerHeights", () => {
  it("orders peek < split <= full", () => {
    expect(heights).toEqual({ peek: 56, split: 360, full: 700 });
    expect(drawerHeights(800, 200).split).toBe(200);
  });
});

describe("dragHeight", () => {
  it("follows the finger inside the range", () => {
    expect(dragHeight(360, 100, heights)).toBe(260);
  });
  it("rubber-bands above full and below peek", () => {
    const up = dragHeight(700, -300, heights);
    expect(up).toBeGreaterThan(700);
    expect(up).toBeLessThan(700 + 120);
    expect(dragHeight(56, 80, heights)).toBeLessThan(56);
    expect(rubberBand(0)).toBe(0);
  });
});

describe("pickSnap", () => {
  const pick = (start: "peek" | "split" | "full", height: number, velocity = 0) =>
    pickSnap({ start, height, velocity, heights });
  it("springs back on a short drag", () => {
    expect(pick("split", 360 - 50)).toBe("split");
    expect(pick("split", 360 + 50)).toBe("split");
  });
  it("commits past 35% of the gap", () => {
    expect(pick("split", 360 - 0.36 * 304)).toBe("peek");
    expect(pick("split", 360 + 0.36 * 340)).toBe("full");
    expect(pick("full", 700 - 0.36 * 340)).toBe("split");
  });
  it("can cross two snap points on a long drag", () => {
    expect(pick("full", 60)).toBe("peek");
    expect(pick("peek", 690)).toBe("full");
  });
  it("a fast flick moves one step", () => {
    expect(pick("split", 340, 0.8)).toBe("peek");
    expect(pick("split", 380, -0.8)).toBe("full");
    expect(pick("full", 690, 0.8)).toBe("split");
    expect(pick("peek", 56, 2)).toBe("peek");
  });
  it("tolerates a degenerate range", () => {
    const flat = drawerHeights(100, 56);
    expect(pickSnap({ start: "split", height: 56, velocity: 0, heights: flat })).toBe("split");
  });
});

describe("snapForKey", () => {
  it("moves with arrows and clamps", () => {
    expect(snapForKey("split", "ArrowDown")).toBe("peek");
    expect(snapForKey("split", "ArrowUp")).toBe("full");
    expect(snapForKey("peek", "ArrowDown")).toBe("peek");
  });
  it("toggles with Enter and Space", () => {
    expect(snapForKey("split", "Enter")).toBe("peek");
    expect(snapForKey("peek", " ")).toBe("split");
  });
  it("ignores other keys; Escape steps down", () => {
    expect(snapForKey("split", "a")).toBeNull();
    expect(snapForKey("full", "Escape")).toBe("split");
    expect(snapForKey("peek", "Escape")).toBeNull();
  });
});
