import type { CatalogPart } from "./types";

function rail(id: string, label: string, kinds: CatalogPart["pins"][number]["kinds"], voltage?: "3v3" | "5v") {
  return { id, label, kinds, voltage };
}

function breadboardHolePins(): CatalogPart["pins"] {
  const cols = Array.from({ length: 30 }, (_, i) => i + 1);
  const rows = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;
  const holes = cols.flatMap((col) =>
    rows.map((row) => rail(`${row}${col}`, `${row}${col}`, ["digital", "analog"])),
  );
  const railHoles = cols.flatMap((col) => [
    rail(`+.t.${col}`, `+ top ${col}`, ["power"], "5v"),
    rail(`-.t.${col}`, `− top ${col}`, ["ground"]),
    rail(`+.b.${col}`, `+ bot ${col}`, ["power"], "5v"),
    rail(`-.b.${col}`, `− bot ${col}`, ["ground"]),
  ]);
  return [
    rail("+", "+ rail (top)", ["power"], "5v"),
    rail("-", "− rail (bottom)", ["ground"]),
    rail("+.t", "+ rail (top)", ["power"], "5v"),
    rail("-.t", "− rail (top)", ["ground"]),
    rail("+.b", "+ rail (bottom)", ["power"], "5v"),
    rail("-.b", "− rail (bottom)", ["ground"]),
    ...railHoles,
    ...holes,
  ];
}

export const passives: CatalogPart[] = [
  {
    id: "passive.breadboard.half",
    name: "Breadboard (half)",
    kind: "passive",
    description:
      "Half-size solderless breadboard (400 tie-points). Outer red + / blue − rails are for power & ground; center columns a–e and f–j are the component grid.",
    photoHint: "breadboard-half",
    photoCaption: "Half-size solderless breadboard with outer power rails and center terminal strips.",
    identify:
      "White plastic board with holes on a 0.1\" grid. Red/blue lines mark the outer power rails. Center gap is for DIP ICs.",
    variants: [
      {
        label: "Half-size (this guide)",
        detail: "About 400 points, 30 columns. Enough for one MCU + a few modules.",
        matchesGuide: true,
      },
      {
        label: "Full-size / MB-102",
        detail: "Longer board, more columns. Same rail rules; top/bottom rails may be split mid-board.",
      },
      {
        label: "Mini (no rails)",
        detail: "Tiny boards often have no +/− rails — you jump power into the grid instead.",
      },
    ],
    watchOuts: [
      "Top and bottom power rails are separate — bridge them if you need power on both sides.",
    ],
    pins: breadboardHolePins(),
  },
  {
    id: "passive.resistor.220",
    name: "Resistor 220Ω",
    kind: "passive",
    description: "Current-limiting resistor (red-red-brown). Wokwi MIT visual.",
    photoHint: "resistor-220",
    photoCaption: "Through-hole carbon film resistor — check color bands for value.",
    identify: "Small axial resistor. 220Ω bands are typically red-red-brown (plus tolerance band).",
    variants: [
      {
        label: "220Ω (this guide)",
        detail: "Common LED current limiter for 5V → LED.",
        matchesGuide: true,
      },
      {
        label: "330Ω / 1kΩ",
        detail: "Also used with LEDs; brighter/dimmer tradeoff. Not the same value.",
      },
    ],
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
    photoCaption: "Through-hole 1kΩ resistor (brown-black-red bands typical).",
    identify: "Axial resistor. 1kΩ is commonly brown-black-red.",
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
    photoCaption: "Through-hole 10kΩ resistor (brown-black-orange bands typical).",
    identify: "Axial resistor. 10kΩ is commonly brown-black-orange — popular for pull-ups.",
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
    photoCaption: "5mm through-hole LED — long leg is usually anode (+).",
    identify:
      "Plastic dome LED. Longer lead = anode (A), flat edge on the body marks cathode (C).",
    variants: [
      {
        label: "5mm red LED (this guide)",
        detail: "Needs a series resistor. Forward voltage ~1.8–2.2V.",
        matchesGuide: true,
      },
      {
        label: "SMD / addressable LEDs",
        detail: "Different footprint and wiring (e.g. WS2812) — not this part.",
      },
    ],
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
    photoCaption: "5mm green through-hole LED — polarity same as red LED.",
    identify: "Same through-hole LED shape as red; color of the plastic dome is green.",
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
    photoCaption: "Rotary potentiometer / trim pot with three legs.",
    identify: "Three-leg variable resistor. Outer legs are ends of the track; middle is the wiper.",
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
    photoCaption: "4-pin tactile pushbutton — pins short in pairs when pressed.",
    identify: "Square tactile switch. Opposite corners are typically connected when pressed.",
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
    photoCaption: "5V USB wall adapter used as the guide power source.",
    identify: "Wall wart with USB output. Provides 5V for USB/VIN on the board.",
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
    photoCaption: "9V rectangular cell — both snap terminals on the top face.",
    identify: "Rectangular 9V. Both snaps on top: larger = usually negative, smaller = positive.",
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
    photoCaption: "2×AA holder — + on the top end, − on the bottom end.",
    identify: "Two AA cells in a holder. Spring side is usually −; nub side is +.",
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
    photoCaption: "3×AA holder — + on top, − on bottom.",
    identify: "Three AA cells. Same polarity convention as 2×AA holders.",
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
    photoCaption: "18650 cell — button + on top, flat − on bottom.",
    identify: "Cylindrical Li-ion ~18×65mm. Raised button is +; flat end is −. Needs a protected holder.",
    watchOuts: [
      "Do not reverse polarity. Prefer a holder with protection for beginners.",
    ],
    pins: [
      { id: "+", label: "+ (top)", kinds: ["power"], voltage: "3v3" },
      { id: "-", label: "− (bottom)", kinds: ["ground"] },
    ],
  },
];
