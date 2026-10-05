/** Opacity of wires and parts that are not part of the current focus. */
export const FOCUS_DIM_WIRE = 0.12;
export const FOCUS_DIM_PART = 0.55;
/** Everything else while one wire is hovered or tapped. */
export const HOVER_DIM_WIRE = 0.4;
export const HOVER_DIM_PART = 0.55;

/** Ids the diagram itself draws for the power source (not guide connections). */
export const POWER_WIRE_IDS = ["power-plus", "power-minus", "power-feed"] as const;
export const POWER_SOURCE_ID = "power-source";

export type WireVisual = {
  opacity: number;
  /** False when the wire is hidden entirely (hide-unfocused mode). */
  visible: boolean;
  /** Thicker stroke and halo. */
  emphasized: boolean;
};

export function wireVisual(
  id: string,
  focusedIds: readonly string[] | null | undefined,
  hideUnfocused: boolean,
  highlightId: string | null | undefined,
): WireVisual {
  const highlighted = highlightId != null && highlightId === id;
  if (highlighted) return { opacity: 1, visible: true, emphasized: true };
  const focusing = focusedIds != null;
  const focused = focusing && focusedIds.includes(id);
  let opacity = 1;
  let visible = true;
  if (focusing && !focused) {
    opacity = FOCUS_DIM_WIRE;
    visible = !hideUnfocused;
  }
  if (highlightId != null) opacity = Math.min(opacity, HOVER_DIM_WIRE);
  return { opacity, visible, emphasized: focused };
}

type EndsOf = { id: string; from: { instanceId: string }; to: { instanceId: string } };

/** Part instance ids that the given wires attach to. Power wires map to the power source and the board. */
export function attachedPartIds(
  connections: readonly EndsOf[],
  wireIds: Iterable<string>,
  boardInstanceId?: string,
): Set<string> {
  const out = new Set<string>();
  const byId = new Map(connections.map((c) => [c.id, c]));
  for (const id of wireIds) {
    const c = byId.get(id);
    if (c) {
      out.add(c.from.instanceId);
      out.add(c.to.instanceId);
    } else if ((POWER_WIRE_IDS as readonly string[]).includes(id)) {
      out.add(POWER_SOURCE_ID);
      if (boardInstanceId) out.add(boardInstanceId);
    }
  }
  return out;
}

/**
 * Opacity of a part. `focusParts` is non-null when a focus is active, and
 * `highlightParts` when a wire is hovered or tapped (its two end parts).
 */
export function partOpacity(
  instanceId: string,
  focusParts: ReadonlySet<string> | null,
  highlightParts: ReadonlySet<string> | null,
): number {
  let opacity = 1;
  if (focusParts && !focusParts.has(instanceId)) opacity = FOCUS_DIM_PART;
  if (highlightParts && !highlightParts.has(instanceId)) opacity = Math.min(opacity, HOVER_DIM_PART);
  return opacity;
}
