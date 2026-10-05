import { describe, expect, it } from "vitest";
import { BADGE_R, badgeRect, badgeTextColor, placeBadges } from "./badges";
import { rectInside } from "./bounds";
import { cardText, placeCards, segmentsCross } from "./cards";
import { labelRect, segmentIntersectsRect } from "./labels";
import type { Point, Rect, Wire } from "./types";

function wire(id: string, points: Point[], label = id): Wire {
  return {
    id,
    label,
    showLabel: false,
    color: "#1565c0",
    d: "",
    mid: points[Math.floor(points.length / 2)],
    from: points[0],
    to: points[points.length - 1],
    points,
  };
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe("placeBadges", () => {
  const make = () => [
    wire("a", [{ x: 100, y: 100 }, { x: 118, y: 100 }, { x: 118, y: 300 }, { x: 400, y: 300 }]),
    wire("b", [{ x: 110, y: 100 }, { x: 126, y: 100 }, { x: 126, y: 340 }, { x: 400, y: 340 }]),
    wire("c", [{ x: 120, y: 100 }, { x: 134, y: 100 }, { x: 134, y: 380 }, { x: 400, y: 380 }]),
  ];
  const numbers = new Map([["a", 1], ["b", 2], ["c", 3]]);

  it("numbers wires by checklist position and puts the badge on the wire near its start", () => {
    const wires = make();
    placeBadges(wires, { numbers });
    wires.forEach((w, i) => {
      expect(w.number).toBe(i + 1);
      expect(w.badge).toBeDefined();
      if (!w.badge) return;
      // On the wire: close to some leg.
      const onWire = w.points.some((p, k) => {
        const q = w.points[k + 1];
        if (!q) return false;
        return (
          w.badge !== undefined &&
          w.badge.x >= Math.min(p.x, q.x) - 0.01 &&
          w.badge.x <= Math.max(p.x, q.x) + 0.01 &&
          w.badge.y >= Math.min(p.y, q.y) - 0.01 &&
          w.badge.y <= Math.max(p.y, q.y) + 0.01
        );
      });
      expect(onWire).toBe(true);
    });
  });

  it("never lets two badges overlap, even for pins 10px apart", () => {
    const wires = make();
    placeBadges(wires, { numbers });
    for (let i = 0; i < wires.length; i += 1) {
      for (let j = i + 1; j < wires.length; j += 1) {
        expect(dist(wires[i].badge as Point, wires[j].badge as Point)).toBeGreaterThanOrEqual(BADGE_R * 2);
      }
    }
  });

  it("keeps badges off pill labels and is deterministic", () => {
    const pill: Rect = { x: 100, y: 112, w: 120, h: 22 };
    const one = make();
    const two = make();
    placeBadges(one, { numbers, fixedRects: [pill] });
    placeBadges(two, { numbers, fixedRects: [pill] });
    expect(one.map((w) => w.badge)).toEqual(two.map((w) => w.badge));
    for (const w of one) {
      const box = badgeRect(w.badge as Point);
      expect(box.x + box.w <= pill.x || box.x >= pill.x + pill.w || box.y + box.h <= pill.y || box.y >= pill.y + pill.h).toBe(true);
    }
  });

  it("uses the requested end and skips wires without a number", () => {
    const wires = make();
    placeBadges(wires, { numbers: new Map([["a", 1]]), ends: new Map([["a", "to"]]) });
    expect((wires[0].badge as Point).x).toBeGreaterThan(300);
    expect(wires[1].badge).toBeUndefined();
    expect(wires[1].number).toBeUndefined();
  });

  it("picks readable text colours", () => {
    expect(badgeTextColor("#f9a825")).toBe("#1a242b");
    expect(badgeTextColor("#212121")).toBe("#ffffff");
    expect(badgeTextColor("#1565c0")).toBe("#ffffff");
  });
});

describe("placeCards", () => {
  const bounds = { minX: -200, minY: -100, maxX: 1000, maxY: 600 };
  const part: Rect = { x: 380, y: 180, w: 160, h: 100 };

  function scene() {
    const wires = [
      wire("a", [{ x: 100, y: 300 }, { x: 300, y: 300 }, { x: 300, y: 100 }, { x: 700, y: 100 }], "Buzzer signal to GPIO D5"),
      wire("b", [{ x: 100, y: 320 }, { x: 320, y: 320 }, { x: 320, y: 120 }, { x: 700, y: 120 }], "Button ground to ESP32 GND"),
    ];
    placeBadges(wires, { numbers: new Map([["a", 1], ["b", 2]]) });
    return {
      wires,
      partRects: [part],
      bounds,
      fixedRects: wires.map((w) => badgeRect(w.badge as Point)),
    };
  }

  it("puts each card in clear space: inside bounds, off wires, parts, badges and other cards", () => {
    const s = scene();
    const cards = placeCards([{ id: "a", relax: false }, { id: "b", relax: false }], s);
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(rectInside(card.rect, bounds)).toBe(true);
      expect(card.crowded).toBe(false);
      for (const w of s.wires) {
        for (let i = 0; i < w.points.length - 1; i += 1) {
          expect(segmentIntersectsRect(w.points[i], w.points[i + 1], card.rect)).toBe(false);
        }
      }
      expect(rectsDisjoint(card.rect, part)).toBe(true);
      for (const fixed of s.fixedRects) expect(rectsDisjoint(card.rect, fixed)).toBe(true);
    }
    expect(rectsDisjoint(cards[0].rect, cards[1].rect)).toBe(true);
  });

  it("clamps cards inside bounds even when the wire is at the far edge or at negative coordinates", () => {
    const wires = [wire("n", [{ x: -190, y: -90 }, { x: -150, y: -90 }], "Button ground to ESP32 GND")];
    placeBadges(wires, { numbers: new Map([["n", 1]]) });
    const [card] = placeCards([{ id: "n", relax: true }], {
      wires,
      partRects: [],
      bounds,
      fixedRects: wires.map((w) => badgeRect(w.badge as Point)),
    });
    expect(rectInside(card.rect, bounds)).toBe(true);
    const far = [wire("f", [{ x: 960, y: 560 }, { x: 990, y: 560 }], "Buzzer signal to GPIO D5")];
    placeBadges(far, { numbers: new Map([["f", 1]]) });
    const [farCard] = placeCards([{ id: "f", relax: true }], {
      wires: far,
      partRects: [],
      bounds,
      fixedRects: far.map((w) => badgeRect(w.badge as Point)),
    });
    expect(rectInside(farCard.rect, bounds)).toBe(true);
  });

  it("skips a card with no clear spot unless it may relax, and is deterministic", () => {
    const s = scene();
    const full = { ...s, partRects: [{ x: bounds.minX, y: bounds.minY, w: 1200, h: 700 }] };
    expect(placeCards([{ id: "a", relax: false }], full)).toEqual([]);
    const relaxed = placeCards([{ id: "a", relax: true }], full);
    expect(relaxed).toHaveLength(1);
    expect(relaxed[0].crowded).toBe(true);
    expect(placeCards([{ id: "a", relax: false }], s)).toEqual(placeCards([{ id: "a", relax: false }], s));
  });

  it("draws a leader from the card edge to the badge", () => {
    const [card] = placeCards([{ id: "a", relax: false }], scene());
    expect(card.leader.to).toEqual(card.anchor);
    const box = card.rect;
    const { from } = card.leader;
    expect(from.x >= box.x && from.x <= box.x + box.w && from.y >= box.y && from.y <= box.y + box.h).toBe(true);
  });
});

describe("cardText and segmentsCross", () => {
  it("cuts long wire text with an ellipsis so the card never overflows", () => {
    const long = "Pushbutton signal pin to the ESP32 DevKit V1 GPIO D4 input";
    const text = cardText(long);
    expect(text.length).toBeLessThanOrEqual(42);
    expect(text.endsWith("…")).toBe(true);
    expect(labelRect({ x: 0, y: 0 }, text).w).toBeLessThanOrEqual(360);
    expect(cardText("Buzzer signal to GPIO D5")).toBe("Buzzer signal to GPIO D5");
  });
  it("tells crossing segments from separate ones", () => {
    expect(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(true);
    expect(segmentsCross({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBe(false);
  });
});

function rectsDisjoint(a: Rect, b: Rect) {
  return a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
}
