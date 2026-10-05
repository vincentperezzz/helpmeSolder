import { describe, expect, it } from "vitest";
import {
  FOCUS_DIM_PART,
  FOCUS_DIM_WIRE,
  HOVER_DIM_WIRE,
  attachedPartIds,
  partOpacity,
  wireVisual,
} from "./focus";

const conns = [
  { id: "c1", from: { instanceId: "esp" }, to: { instanceId: "buzz" } },
  { id: "c2", from: { instanceId: "esp" }, to: { instanceId: "led" } },
];

describe("wireVisual", () => {
  it("draws everything normally when there is no focus", () => {
    expect(wireVisual("c1", null, false, null)).toEqual({ opacity: 1, visible: true, emphasized: false });
  });
  it("dims or hides unfocused wires and emphasizes focused ones", () => {
    expect(wireVisual("c1", ["c1"], false, null)).toEqual({ opacity: 1, visible: true, emphasized: true });
    expect(wireVisual("c2", ["c1"], false, null)).toEqual({ opacity: FOCUS_DIM_WIRE, visible: true, emphasized: false });
    expect(wireVisual("c2", ["c1"], true, null).visible).toBe(false);
  });
  it("highlights a hovered wire even when dimmed or hidden, and lightly dims the rest", () => {
    expect(wireVisual("c2", ["c1"], true, "c2")).toEqual({ opacity: 1, visible: true, emphasized: true });
    expect(wireVisual("c1", null, false, "c2").opacity).toBe(HOVER_DIM_WIRE);
    expect(wireVisual("c2", ["c1"], false, "c1").opacity).toBe(FOCUS_DIM_WIRE);
  });
});

describe("attachedPartIds / partOpacity", () => {
  it("collects the parts at both ends, and maps power wires to source and board", () => {
    expect([...attachedPartIds(conns, ["c1"], "esp")].sort()).toEqual(["buzz", "esp"]);
    expect([...attachedPartIds(conns, ["power-plus"], "esp")].sort()).toEqual(["esp", "power-source"]);
  });
  it("maps opacity", () => {
    const focus = new Set(["esp", "buzz"]);
    expect(partOpacity("buzz", focus, null)).toBe(1);
    expect(partOpacity("led", focus, null)).toBe(FOCUS_DIM_PART);
    expect(partOpacity("led", null, null)).toBe(1);
    expect(partOpacity("buzz", focus, new Set(["esp", "led"]))).toBe(FOCUS_DIM_PART);
  });
});
