export type ProgressStep = {
  id: string;
  title: string;
  body: string;
};

export type ProgressWire = {
  id: string;
  text: string;
};

const STOP = new Set([
  "the", "a", "an", "to", "and", "or", "of", "on", "in", "pin", "hole", "wire",
  "connect", "from", "with", "your", "this", "that", "into", "for", "it", "is",
  "are", "at", "be", "by", "its", "as", "if", "when", "you", "do", "not", "goes",
  "go", "last", "never", "them",
]);

function tokens(text: string): string[] {
  const found = text.toLowerCase().match(/[a-z][a-z0-9]*/g) ?? [];
  return [...new Set(found.filter((token) => token.length > 1 && !STOP.has(token)))];
}

function isOpening(step: ProgressStep): boolean {
  return /\b(place|insert|layout)\b/i.test(step.title);
}

function isClosing(step: ProgressStep): boolean {
  return /\b(test|upload|firmware|power on|turn on)\b/i.test(`${step.title} ${step.body}`);
}

function assignWires(steps: ProgressStep[], wires: ProgressWire[]): Map<string, string[]> {
  const opening = new Set(steps.filter(isOpening).map((step) => step.id));
  const stepTokens = steps.map((step) => ({
    id: step.id,
    tokens: new Set(tokens(`${step.title} ${step.body}`)),
  }));
  const counts = new Map<string, number>();
  for (const step of stepTokens) {
    if (opening.has(step.id)) continue;
    for (const token of step.tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const specific = new Set([...counts].filter(([, count]) => count === 1).map(([token]) => token));
  const owned = new Map<string, string[]>(steps.map((step) => [step.id, []]));
  const claimed = new Set<string>();

  for (const wire of wires) {
    const wireTokens = tokens(wire.text);
    let bestId: string | null = null;
    let bestScore = 0;
    let bestIndex = steps.length;
    stepTokens.forEach((step, index) => {
      if (opening.has(step.id)) return;
      let score = 0;
      for (const token of wireTokens) {
        if (specific.has(token) && step.tokens.has(token)) score += 1;
      }
      if (score > bestScore || (score === bestScore && score > 0 && index < bestIndex)) {
        bestScore = score;
        bestId = step.id;
        bestIndex = index;
      }
    });
    if (!bestId || bestScore === 0) continue;
    owned.get(bestId)?.push(wire.id);
    claimed.add(wire.id);
  }

  const firstWire = steps.findIndex((step) => (owned.get(step.id)?.length ?? 0) > 0);
  if (firstWire >= 0) {
    const bucket = owned.get(steps[firstWire].id);
    for (const wire of wires) {
      if (!claimed.has(wire.id)) bucket?.push(wire.id);
    }
  }

  return owned;
}

export function resolveUpNext(input: {
  steps: ProgressStep[];
  wires: ProgressWire[];
  tickedWireIds: string[];
  manualStepIds: string[];
}): { doneIds: string[]; currentId: string | null } {
  const { steps, wires } = input;
  if (steps.length === 0) return { doneIds: [], currentId: null };

  const owned = assignWires(steps, wires);
  const ticked = new Set(input.tickedWireIds);
  const manual = new Set(input.manualStepIds);
  const wireIndexes = steps
    .map((step, index) => ((owned.get(step.id)?.length ?? 0) > 0 ? index : -1))
    .filter((index) => index >= 0);
  const firstWire = wireIndexes[0] ?? steps.length;
  const lastWire = wireIndexes[wireIndexes.length - 1] ?? -1;
  const anyWire = wires.some((wire) => ticked.has(wire.id));
  const done = new Set<string>();

  steps.forEach((step, index) => {
    const ids = owned.get(step.id) ?? [];
    if (ids.length > 0) {
      if (manual.has(step.id) || ids.every((id) => ticked.has(id))) done.add(step.id);
      return;
    }
    const closing = index > lastWire && (isClosing(step) || index === steps.length - 1);
    if (closing) {
      if (manual.has(step.id)) done.add(step.id);
      return;
    }
    if (index < firstWire && firstWire < steps.length) {
      if (manual.has(step.id) || anyWire) done.add(step.id);
      return;
    }
    if (manual.has(step.id)) done.add(step.id);
  });

  return {
    doneIds: steps.filter((step) => done.has(step.id)).map((step) => step.id),
    currentId: steps.find((step) => !done.has(step.id))?.id ?? null,
  };
}
