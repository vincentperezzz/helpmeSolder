import type { Guide, ValidationResult } from "@/lib/catalog/types";
import type { PowerPreviewFeedback } from "@/lib/guides/power-preview";
import { issueSeverity } from "@/lib/guides/validator";

/* ---------- tabs ---------- */

export const TAB_IDS = ["parts", "tools", "solder", "steps", "notes"] as const;
export type TabId = (typeof TAB_IDS)[number];

export const TAB_LABELS: Record<TabId, string> = {
  parts: "Parts",
  tools: "Tools",
  solder: "Solder",
  steps: "Steps",
  notes: "Notes",
};

export function isTabId(value: unknown): value is TabId {
  return typeof value === "string" && (TAB_IDS as readonly string[]).includes(value);
}

/** The tab a guide opens on when the viewer has not picked one yet. */
export function defaultTab(guide: Pick<Guide, "connections">): TabId {
  return guide.connections.length > 0 ? "solder" : "parts";
}

/** Next tab for an arrow, Home or End key; null for any other key. */
export function nextTab(current: TabId, key: string): TabId | null {
  const index = TAB_IDS.indexOf(current);
  if (key === "ArrowRight") return TAB_IDS[(index + 1) % TAB_IDS.length];
  if (key === "ArrowLeft") return TAB_IDS[(index - 1 + TAB_IDS.length) % TAB_IDS.length];
  if (key === "Home") return TAB_IDS[0];
  if (key === "End") return TAB_IDS[TAB_IDS.length - 1];
  return null;
}

const tabKey = (guideId: string) => `helpmesolder:guide-tab:${guideId}`;

export function readTab(guideId: string): TabId | null {
  try {
    const raw = window.localStorage.getItem(tabKey(guideId));
    return isTabId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeTab(guideId: string, tab: TabId) {
  try {
    window.localStorage.setItem(tabKey(guideId), tab);
  } catch {
    // Storage blocked: the tab still works for this visit.
  }
}

/* ---------- checks (blocked and heads-up messages) ---------- */

export type CheckGroup = {
  id: string;
  title: string;
  items: string[];
  /** A danger group is about harm to a part, not about wording. */
  danger?: boolean;
};

export type GuideChecks = {
  /** blocked: the guide failed validation. warn: only heads-ups. clear: nothing to show. */
  level: "blocked" | "warn" | "clear";
  count: number;
  groups: CheckGroup[];
};

type CheckInput = {
  validation: ValidationResult;
  feedback: PowerPreviewFeedback;
  layoutIssues: string[];
};

export function buildChecks({ validation, feedback, layoutIssues }: CheckInput): GuideChecks {
  const groups: CheckGroup[] = [];
  const withAlternatives = (
    message: string,
    alternatives: string[],
    label: string,
  ): string => (alternatives.length > 0 ? `${message} ${label}: ${alternatives.join(", ")}` : message);

  if (!validation.ok) {
    groups.push({
      id: "validation-blocked",
      title: "Validation blocked",
      items: validation.issues.map((issue) =>
        withAlternatives(issue.message, issue.alternatives, "Alternatives"),
      ),
    });
  } else {
    const warnings = validation.issues.filter((issue) => issueSeverity(issue) === "warning");
    if (warnings.length > 0) {
      groups.push({
        id: "validation-warnings",
        title: "Heads up before you build",
        items: warnings.map((issue) =>
          withAlternatives(issue.message, issue.alternatives, "Other options"),
        ),
      });
    }
  }
  if (feedback.damage.length > 0) {
    groups.push({
      id: "power-damage",
      title: "This power choice may damage a part",
      items: feedback.damage,
      danger: true,
    });
  }
  if (feedback.headsUp.length > 0) {
    groups.push({
      id: "power-heads-up",
      title: "Heads up about this power choice",
      items: feedback.headsUp,
    });
  }
  if (layoutIssues.length > 0) {
    groups.push({
      id: "layout-heads-up",
      title: "Heads up about this layout",
      items: layoutIssues,
    });
  }

  const count = groups.reduce((sum, group) => sum + group.items.length, 0);
  const level = !validation.ok ? "blocked" : count > 0 ? "warn" : "clear";
  return { level, count, groups };
}

/* ---------- scrolling a row into the panel ---------- */

/**
 * How far a scroll container must move to bring a row fully into view, with a
 * margin. `top` and `bottom` are the row edges relative to the container's top;
 * `inset` is the part of the top edge covered by a sticky strip.
 */
export function scrollDelta(
  top: number,
  bottom: number,
  viewHeight: number,
  inset: number,
  margin = 8,
): number {
  const visibleTop = inset + margin;
  const visibleBottom = viewHeight - margin;
  if (top < visibleTop) return top - visibleTop;
  if (bottom > visibleBottom) {
    // Never push the row's top under the sticky strip.
    return Math.min(bottom - visibleBottom, top - visibleTop);
  }
  return 0;
}

/* ---------- notes and step ticks ---------- */

/** "Heads up" for cautions, otherwise a plain tip. */
export function noteKind(note: string): "heads-up" | "tip" {
  return /\b(do not|don't|dont|never|warning|careful|caution|avoid|danger|hot|must not)\b/i.test(note)
    ? "heads-up"
    : "tip";
}

const stepKey = (guideId: string) => `helpmesolder:step-ticks:${guideId}`;

export function readStepTicks(guideId: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(stepKey(guideId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function writeStepTicks(guideId: string, ids: string[]) {
  try {
    window.localStorage.setItem(stepKey(guideId), JSON.stringify(ids));
  } catch {
    // Storage blocked: ticks still work for this visit.
  }
}
