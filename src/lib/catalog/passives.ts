import type { CatalogPart } from "./types";

function rail(id: string, label: string, kinds: CatalogPart["pins"][number]["kinds"], voltage?: "3v3" | "5v") {
  return { id, label, kinds, voltage };
}

export const passives: CatalogPart[] = [
  {
    id: "passive.breadboard.half",
    name: "Breadboard (half)",
    kind: "passive",
    description: "Half-size solderless breadboard for prototype wiring. Custom MIT-style visual.",
    photoHint: "breadboard-half",
    pins: [
      rail("+", "+ rail", ["power"], "5v"),
      rail("-", "- rail", ["ground"]),
      rail("a1", "a1", ["digital", "analog"]),
      rail("e1", "e1", ["digital", "analog"]),
      rail("f1", "f1", ["digital", "analog"]),
      rail("j1", "j1", ["digital", "analog"]),
      rail("a15", "a15", ["digital", "analog"]),
      rail("e15", "e15", ["digital", "analog"]),
      rail("f15", "f15", ["digital", "analog"]),
      rail("j15", "j15", ["digital", "analog"]),
      rail("a30", "a30", ["digital", "analog"]),
      rail("e30", "e30", ["digital", "analog"]),
      rail("f30", "f30", ["digital", "analog"]),
      rail("j30", "j30", ["digital", "analog"]),
    ],
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
    id: "passive.power.battery",
    name: "Battery Pack",
    kind: "passive",
    description:
      "Battery pack (AA/LiPo). Ask the user before choosing this vs USB wall. Shown on diagram when power_source=battery.",
    photoHint: "battery-pack",
    pins: [
      { id: "+", label: "+", kinds: ["power"], voltage: "5v" },
      { id: "-", label: "−", kinds: ["ground"] },
    ],
  },
];
