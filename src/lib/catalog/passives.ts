import type { CatalogPart } from "./types";

function rail(id: string, label: string, kinds: CatalogPart["pins"][number]["kinds"], voltage?: "3v3" | "5v") {
  return { id, label, kinds, voltage };
}

function breadboardHolePins(): CatalogPart["pins"] {
  const cols = [1, 5, 10, 15, 20, 25, 30];
  const rows = ["a", "e", "f", "j"] as const;
  const holes = cols.flatMap((col) =>
    rows.map((row) => rail(`${row}${col}`, `${row}${col}`, ["digital", "analog"])),
  );
  return [
    rail("+", "+ rail", ["power"], "5v"),
    rail("-", "- rail", ["ground"]),
    ...holes,
  ];
}

export const passives: CatalogPart[] = [
  {
    id: "passive.breadboard.half",
    name: "Breadboard (half)",
    kind: "passive",
    description: "Half-size solderless breadboard for prototype wiring. Custom MIT-style visual.",
    photoHint: "breadboard-half",
    pins: breadboardHolePins(),
  },
  {
    id: "passive.resistor.220",
    name: "Resistor 220Ω",
    kind: "passive",
    description: "Current-limiting resistor (red-red-brown). Wokwi MIT visual.",
    photoHint: "resistor-220",
    wokwi: { tag: "wokwi-resistor", attrs: { value: "220" } },
    pins: [
      { id: "1", label: "1", kinds: ["digital", "analog", "power"] },
      { id: "2", label: "2", kinds: ["digital", "analog", "power"] },
    ],
  },
  {
    id: "passive.resistor.1k",
    name: "Resistor 1kΩ",
    kind: "passive",
    description: "1k pull-up/down or series resistor. Wokwi MIT visual.",
    photoHint: "resistor-1k",
    wokwi: { tag: "wokwi-resistor", attrs: { value: "1000" } },
    pins: [
      { id: "1", label: "1", kinds: ["digital", "analog", "power"] },
      { id: "2", label: "2", kinds: ["digital", "analog", "power"] },
    ],
  },
  {
    id: "passive.resistor.10k",
    name: "Resistor 10kΩ",
    kind: "passive",
    description: "10k pull-up/down resistor. Wokwi MIT visual.",
    photoHint: "resistor-10k",
    wokwi: { tag: "wokwi-resistor", attrs: { value: "10000" } },
    pins: [
      { id: "1", label: "1", kinds: ["digital", "analog", "power"] },
      { id: "2", label: "2", kinds: ["digital", "analog", "power"] },
    ],
  },
  {
    id: "passive.led.red",
    name: "LED (red)",
    kind: "passive",
    description: "Through-hole LED. A = anode, C = cathode. Wokwi MIT visual.",
    photoHint: "led-red",
    wokwi: { tag: "wokwi-led", attrs: { color: "red", label: "LED" } },
    pins: [
      { id: "A", label: "A (anode)", kinds: ["digital", "power"] },
      { id: "C", label: "C (cathode)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.led.green",
    name: "LED (green)",
    kind: "passive",
    description: "Through-hole green LED. Wokwi MIT visual.",
    photoHint: "led-green",
    wokwi: { tag: "wokwi-led", attrs: { color: "green", label: "LED" } },
    pins: [
      { id: "A", label: "A (anode)", kinds: ["digital", "power"] },
      { id: "C", label: "C (cathode)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.potentiometer",
    name: "Potentiometer",
    kind: "passive",
    description: "10k trim pot for contrast/volume/analog input. Wokwi MIT visual.",
    photoHint: "potentiometer",
    wokwi: { tag: "wokwi-potentiometer", attrs: { value: "0.5" } },
    pins: [
      { id: "GND", label: "GND", kinds: ["ground"] },
      { id: "SIG", label: "SIG/wiper", kinds: ["analog"] },
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "5v" },
    ],
  },
  {
    id: "passive.pushbutton",
    name: "Pushbutton",
    kind: "passive",
    description: "Tactile momentary switch. Wokwi MIT visual.",
    photoHint: "pushbutton",
    wokwi: { tag: "wokwi-pushbutton", attrs: { color: "red" } },
    pins: [
      { id: "1.l", label: "1L", kinds: ["digital"] },
      { id: "2.l", label: "2L", kinds: ["digital"] },
      { id: "1.r", label: "1R", kinds: ["digital"] },
      { id: "2.r", label: "2R", kinds: ["digital"] },
    ],
  },
  {
    id: "passive.power.usb_wall",
    name: "USB Wall Adapter",
    kind: "passive",
    description:
      "5V USB wall power brick. Ask the user before choosing this vs battery. Shown on diagram when power_source=usb_wall.",
    photoHint: "usb-wall",
    pins: [
      { id: "5V", label: "5V OUT", kinds: ["power"], voltage: "5v" },
      { id: "GND", label: "GND", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.power.battery.9v",
    name: "9V Battery (snap)",
    kind: "passive",
    description:
      "Classic 9V snap battery. Both + and − snaps sit on top. Wires leave those top terminals.",
    photoHint: "battery-9v",
    pins: [
      { id: "+", label: "+ (top snap)", kinds: ["power"], voltage: "5v" },
      { id: "-", label: "− (top snap)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.power.battery.2aa",
    name: "2×AA Batteries",
    kind: "passive",
    description:
      "Two AA cells (~3V). Positive nubs on top, flat negatives on bottom — wires leave those ends.",
    photoHint: "battery-2aa",
    pins: [
      { id: "+", label: "+ (top)", kinds: ["power"], voltage: "3v3" },
      { id: "-", label: "− (bottom)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.power.battery.3aa",
    name: "3×AA Batteries",
    kind: "passive",
    description:
      "Three AA cells (~4.5V). Positive on top, negative on bottom — wires leave those ends.",
    photoHint: "battery-3aa",
    pins: [
      { id: "+", label: "+ (top)", kinds: ["power"], voltage: "5v" },
      { id: "-", label: "− (bottom)", kinds: ["ground"] },
    ],
  },
  {
    id: "passive.power.battery.18650",
    name: "18650 Li-ion Cell",
    kind: "passive",
    description:
      "Single 18650 Li-ion (~3.7V). Button + on top, flat − on bottom.",
    photoHint: "battery-18650",
    pins: [
      { id: "+", label: "+ (top)", kinds: ["power"], voltage: "3v3" },
      { id: "-", label: "− (bottom)", kinds: ["ground"] },
    ],
  },
];
