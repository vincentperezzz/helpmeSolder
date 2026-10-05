import type { Guide, ValidationIssue } from "@/lib/catalog/types";
import { issueSeverity, validateGuide } from "@/lib/guides/validator";

export type PowerPreviewFeedback = {
  /** Power or voltage errors that are new for the previewed power. */
  damage: string[];
  /** Everything else that is new for the previewed power. */
  headsUp: string[];
};

function isPowerIssue(issue: ValidationIssue): boolean {
  return (
    issue.code.startsWith("supply_") ||
    issue.code.startsWith("power_") ||
    issue.code === "reverse_polarity" ||
    issue.code === "gpio_on_supply_rail" ||
    /voltage|\bvolt/i.test(issue.message)
  );
}

function issueKey(issue: ValidationIssue): string {
  return `${issue.code}|${issue.message}`;
}

/**
 * Issues that appear for the previewed guide but not for the default one.
 * Pure: the page already shows the default guide's own validation.
 */
export function previewPowerFeedback(
  defaultGuide: Guide,
  previewGuide: Guide,
): PowerPreviewFeedback {
  if (!previewGuide.power_source) return { damage: [], headsUp: [] };
  const known = new Set(validateGuide(defaultGuide).issues.map(issueKey));
  const fresh = validateGuide(previewGuide).issues.filter(
    (issue) => issue.code !== "power_source_required" && !known.has(issueKey(issue)),
  );
  const damage: string[] = [];
  const headsUp: string[] = [];
  for (const issue of fresh) {
    if (issueSeverity(issue) === "error" && isPowerIssue(issue)) {
      damage.push(issue.message);
    } else {
      headsUp.push(issue.message);
    }
  }
  return { damage, headsUp };
}
