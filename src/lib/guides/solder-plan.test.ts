import { describe, expect, it } from "vitest";
import type { Guide, PowerSource } from "@/lib/catalog/types";
import { buildSolderPlan, describePower, hasBreadboard } from "./solder-plan";

function make(
  power: PowerSource | null,
  conns: [string, string, string, string][],
  board = "board.esp32.devkit",
  extra: { instanceId: string; catalogId: string }[] = [],
): Guide {
  return {
    id: "g",
    title: "t",
    power_source: power,
    board_id: board,
    parts: [
      { instanceId: "mcu", catalogId: board },
      { instanceId: "buz", catalogId: "module.buzzer.active" },
      ...extra,
    ],
    connections: conns.map(([fi, fp, ti, tp], n) => ({
      id: `c${n}`,
      from: { instanceId: fi, pinId: fp },
      to: { instanceId: ti, pinId: tp },
    })),
    steps: [],
    notes: [],
    created_at: "",
    updated_at: "",
  };
}

describe("buildSolderPlan", () => {
  it("handles an empty guide", () => {
    const plan = buildSolderPlan(make(null, []));
    expect(plan.items).toEqual([]);
    expect(plan.power).toBeNull();
  });

  it("orders ground and power before signals and writes plain sentences", () => {
    const plan = buildSolderPlan(
      make("usb_wall", [
        ["buz", "1", "mcu", "D13"],
        ["buz", "2", "mcu", "GND.1"],
      ]),
    );
    expect(plan.items.map((i) => i.kind)).toEqual(["ground", "signal"]);
    expect(plan.items[1].sentence).toBe(
      "Buzzer, pin 1 (SIG) to ESP32 DevKit V1, pin D13",
    );
    expect(plan.items[0].why).toMatch(/^Ground/);
    expect(plan.items[1].why).toMatch(/^Signal/);
  });

  it("maps colours like the diagram", () => {
    const plan = buildSolderPlan(
      make(null, [
        ["buz", "2", "mcu", "GND.1"],
        ["buz", "1", "mcu", "D13"],
      ]),
    );
    const ground = plan.items.find((i) => i.kind === "ground");
    expect(ground?.color).toBe("#212121");
    expect(ground?.colorName).toBe("black");
    const signal = plan.items.find((i) => i.kind === "signal");
    expect(signal?.colorName).not.toBe("black");
  });

  it("degrades gracefully for unknown parts and pins", () => {
    const g = make(null, [["ghost", "x", "mcu", "nope"]]);
    const [item] = buildSolderPlan(g).items;
    expect(item.sentence).toBe("ghost, pin x to ESP32 DevKit V1, pin nope");
    expect(item.why).toBeNull();
  });

  it("describes breadboard rails and holes", () => {
    const g = make(
      null,
      [["mcu", "D13", "bb", "a5"]],
      "board.esp32.devkit",
      [{ instanceId: "bb", catalogId: "passive.breadboard.half" }],
    );
    expect(buildSolderPlan(g).items[0].sentence).toContain("hole a5");
    expect(hasBreadboard(g)).toBe(true);
    expect(hasBreadboard(make(null, []))).toBe(false);
  });
});

describe("describePower", () => {
  it("explains USB power", () => {
    expect(describePower(make("usb_wall", []))).toContain("No soldering needed for power");
  });

  it("explains battery polarity with the board power-in pin", () => {
    const text = describePower(make("battery_9v", []));
    expect(text).toContain("9V battery");
    expect(text).toContain("VIN");
    expect(text).toContain("GND");
    expect(text).toContain("Never reverse");
  });

  it("uses VBUS on a Pico and returns null when unset", () => {
    expect(describePower(make("battery_18650", [], "board.pico.rp2040"))).toContain("VBUS");
    expect(describePower(make(null, []))).toBeNull();
  });
});
