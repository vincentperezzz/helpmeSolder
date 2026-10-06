import { describe, expect, it } from "vitest";
import { BEATS, LOOP_MS, beatAt, buildKeyframes, pct, seekTimeFor, wrapMs } from "./timeline";

describe("beats", () => {
  it("tile the loop with no gaps", () => {
    expect(BEATS[0].start).toBe(0);
    expect(BEATS[BEATS.length - 1].end).toBe(LOOP_MS);
    for (let i = 1; i < BEATS.length; i += 1) expect(BEATS[i].start).toBe(BEATS[i - 1].end);
  });

  it("finds the beat at boundaries", () => {
    expect(beatAt(0)).toBe("ask");
    expect(beatAt(2999)).toBe("ask");
    expect(beatAt(3000)).toBe("plan");
    expect(beatAt(7800)).toBe("wire");
    expect(beatAt(11200)).toBe("open");
    expect(beatAt(13999)).toBe("open");
  });

  it("wraps cumulative clock readings", () => {
    expect(wrapMs(LOOP_MS + 500)).toBe(500);
    expect(wrapMs(-500)).toBe(LOOP_MS - 500);
    expect(beatAt(LOOP_MS * 3 + 3100)).toBe("plan");
  });

  it("seeks just inside each beat", () => {
    for (const beat of BEATS) {
      expect(beatAt(seekTimeFor(beat.id))).toBe(beat.id);
    }
  });
});

describe("keyframes", () => {
  it("converts milliseconds to percentages", () => {
    expect(pct(0)).toBe(0);
    expect(pct(7000)).toBe(50);
    expect(pct(LOOP_MS * 2)).toBe(100);
  });

  it("extends first and last states to the loop edges", () => {
    const css = buildKeyframes("x", [
      [1400, "opacity:0"],
      [2800, "opacity:1"],
    ]);
    expect(css).toContain("0%{opacity:0;animation-timing-function");
    expect(css).toContain("10%{opacity:0;");
    expect(css).toContain("20%{opacity:1}");
    expect(css).toContain("100%{opacity:1}");
  });
});
