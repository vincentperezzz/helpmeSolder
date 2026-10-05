import type { SchematicNet, SymbolKind } from "./types";

export type Explanation = { title: string; body: string };

const TEXT: Record<SymbolKind, { title: string; body: string }> = {
  resistor: {
    title: "Resistor",
    body: "Limits how much current flows. It protects parts like an LED from too much current. It has no polarity, so either way round works.",
  },
  led: {
    title: "LED",
    body: "A small light. Current only flows one way: in at the anode (the longer leg, the triangle side) and out at the cathode. Always use a resistor in series.",
  },
  potentiometer: {
    title: "Potentiometer",
    body: "A knob that changes resistance. The middle pin gives a voltage that goes up and down as you turn it, so the board can read the knob position.",
  },
  pushbutton: {
    title: "Push button",
    body: "Joins two sides of the circuit while you press it and lets go when you release. The board reads it as pressed or not pressed.",
  },
  battery: {
    title: "Battery",
    body: "The power source. The long line is plus (+) and the short line is minus (-). Never connect plus straight to minus.",
  },
  "usb-supply": {
    title: "USB power supply",
    body: "A USB charger or power bank that gives 5 volts. The 5V pin is plus and GND is minus.",
  },
  capacitor: {
    title: "Capacitor",
    body: "Stores a little charge and smooths out power bumps. Check the value and, for tall can types, which leg is negative.",
  },
  diode: {
    title: "Diode",
    body: "Lets current flow one way only. The bar marks the cathode, the side current leaves from.",
  },
  block: {
    title: "Board or module",
    body: "A box with named pins. Each wire goes to the pin with the same name on the real part.",
  },
};

export function explainSymbol(kind: SymbolKind, valueText: string): Explanation {
  const entry = TEXT[kind];
  const value = valueText.trim();
  return { title: value ? `${entry.title}, ${value}` : entry.title, body: entry.body };
}

export function symbolMeaning(kind: SymbolKind): string {
  return TEXT[kind].body.split(". ")[0].replace(/\.$/, "") + ".";
}

export function symbolName(kind: SymbolKind): string {
  return TEXT[kind].title;
}

export function explainNet(net: Pick<SchematicNet, "kind" | "label">): Explanation {
  if (net.kind === "ground") {
    return {
      title: "Ground (GND)",
      body: "The common return path for current. Every GND mark in the drawing is the same connection, even without a wire between them.",
    };
  }
  if (net.kind === "power") {
    return {
      title: `Power (${net.label})`,
      body: `Supply voltage. Every ${net.label} mark in the drawing is joined together, even without a wire between them.`,
    };
  }
  return {
    title: net.label ? `Signal wire (${net.label})` : "Signal wire",
    body: "Carries a signal between the pins it joins. Follow the same wire in the real-parts picture to see where it goes.",
  };
}
