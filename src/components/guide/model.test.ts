import { describe, expect, it } from "vitest";
import type { ValidationResult } from "@/lib/catalog/types";
import {
  buildChecks,
  defaultTab,
  isTabId,
  nextTab,
  scrollDelta,
} from "./model";

const clean: ValidationResult = { ok: true, issues: [], needsPowerSource: false };
const none = { damage: [], headsUp: [] };

describe("defaultTab", () => {
  it("opens Solder when the guide has wires and Parts otherwise", () => {
    const wire = { id: "c", from: { instanceId: "a", pinId: "1" }, to: { instanceId: "b", pinId: "2" } };
    expect(defaultTab({ connections: [wire] })).toBe("solder");
    expect(defaultTab({ connections: [] })).toBe("parts");
  });
});

describe("tabs", () => {
  it("wraps arrow keys and supports Home and End", () => {
    expect(nextTab("notes", "ArrowRight")).toBe("parts");
    expect(nextTab("parts", "ArrowLeft")).toBe("notes");
    expect(nextTab("solder", "Home")).toBe("parts");
    expect(nextTab("solder", "End")).toBe("notes");
    expect(nextTab("solder", "a")).toBeNull();
  });

  it("accepts only known tab ids", () => {
    expect(isTabId("solder")).toBe(true);
    expect(isTabId("nope")).toBe(false);
    expect(isTabId(null)).toBe(false);
  });
});

describe("buildChecks", () => {
  it("is clear when nothing needs attention", () => {
    expect(buildChecks({ validation: clean, feedback: none, layoutIssues: [] })).toEqual({
      level: "clear",
      count: 0,
      groups: [],
    });
  });

  it("is blocked when validation fails, with alternatives", () => {
    const checks = buildChecks({
      validation: {
        ok: false,
        needsPowerSource: false,
        issues: [{ code: "bad_pin", message: "Pin D9 does not exist.", alternatives: ["D2", "D4"] }],
      },
      feedback: none,
      layoutIssues: [],
    });
    expect(checks.level).toBe("blocked");
    expect(checks.groups[0].items[0]).toBe("Pin D9 does not exist. Alternatives: D2, D4");
  });

  it("is a heads-up for warnings, power feedback and layout messages", () => {
    const checks = buildChecks({
      validation: {
        ok: true,
        needsPowerSource: false,
        issues: [{ code: "w", severity: "warning", message: "Warm part.", alternatives: [] }],
      },
      feedback: { damage: ["Too many volts."], headsUp: ["Check polarity."] },
      layoutIssues: ["No room on the breadboard."],
    });
    expect(checks.level).toBe("warn");
    expect(checks.count).toBe(4);
    expect(checks.groups.map((group) => group.id)).toEqual([
      "validation-warnings",
      "power-damage",
      "power-heads-up",
      "layout-heads-up",
    ]);
    expect(checks.groups[1].danger).toBe(true);
  });
});

describe("scrollDelta", () => {
  it("does nothing for a row that is already visible", () => {
    expect(scrollDelta(100, 160, 500, 60)).toBe(0);
  });

  it("scrolls up to reveal a row hidden under the sticky strip", () => {
    expect(scrollDelta(20, 80, 500, 60)).toBe(20 - 68);
  });

  it("scrolls down to reveal a row below the fold", () => {
    expect(scrollDelta(450, 530, 500, 60)).toBe(530 - 492);
  });

  it("never pushes a tall row's top under the sticky strip", () => {
    expect(scrollDelta(200, 900, 500, 60)).toBe(200 - 68);
  });
});

describe("noteKind", () => {
  it("flags cautions and treats the rest as tips", async () => {
    const { noteKind } = await import("./model");
    expect(noteKind("Never power it with wires touching.")).toBe("heads-up");
    expect(noteKind("Use an active buzzer.")).toBe("tip");
  });
});
