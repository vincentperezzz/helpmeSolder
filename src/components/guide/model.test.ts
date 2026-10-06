import { describe, expect, it } from "vitest";
import type { ValidationResult } from "@/lib/catalog/types";
import {
  buildChecks,
  defaultTab,
  isTabId,
  groupJoints,
  mentionsSoldering,
  nextStepId,
  nextTab,
  pinName,
  progressLabel,
  scrollDelta,
  tabDirection,
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

describe("tabDirection", () => {
  it("travels forward to a later tab and back to an earlier one", () => {
    expect(tabDirection("parts", "solder")).toBe("forward");
    expect(tabDirection("notes", "tools")).toBe("back");
    expect(tabDirection("steps", "solder")).toBe("back");
  });
});

describe("groupJoints", () => {
  const feed = (id: string) => ({ id, powerFeed: true });
  const sig = (id: string) => ({ id, powerFeed: false });

  it("splits power feeds from signals and keeps the global numbers", () => {
    const groups = groupJoints([sig("a"), feed("b"), sig("c")]);
    expect(groups.map((g) => [g.id, g.label])).toEqual([
      ["power", "Power"],
      ["signals", "Signals"],
    ]);
    expect(groups[0].joints.map((j) => j.number)).toEqual([2]);
    expect(groups[1].joints.map((j) => j.number)).toEqual([1, 3]);
  });

  it("drops the headings when only one kind exists", () => {
    expect(groupJoints([sig("a"), sig("b")])).toMatchObject([{ id: "signals", label: null }]);
    expect(groupJoints([feed("a")])).toMatchObject([{ id: "power", label: null }]);
    expect(groupJoints([])).toEqual([]);
  });
});

describe("joint and step text helpers", () => {
  it("labels progress", () => {
    expect(progressLabel(3, 7, "soldered")).toBe("3 of 7 soldered");
  });

  it("strips the word pin for the two-end layout", () => {
    expect(pinName("pin D5")).toBe("D5");
    expect(pinName("pin 1 (SIG)")).toBe("1 (SIG)");
    expect(pinName("hole A1")).toBe("hole A1");
  });

  it("detects steps that talk about soldering", () => {
    expect(mentionsSoldering("Solder the buzzer leads.")).toBe(true);
    expect(mentionsSoldering("Check every joint again.")).toBe(true);
    expect(mentionsSoldering("Tinned the tip, then soldering the pins")).toBe(true);
    expect(mentionsSoldering("Plug in the USB cable.")).toBe(false);
    expect(mentionsSoldering("Use a soldered header")).toBe(true);
  });

  it("finds the first step that is not done", () => {
    expect(nextStepId(["a", "b", "c"], ["a"])).toBe("b");
    expect(nextStepId(["a"], ["a"])).toBeNull();
    expect(nextStepId([], [])).toBeNull();
  });
});
