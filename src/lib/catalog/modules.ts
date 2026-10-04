import type { CatalogPart } from "./types";

export const modules: CatalogPart[] = [
  {
    id: "module.buzzer.active",
    name: "Active Buzzer",
    kind: "module",
    description: "Beeps when signal pin goes high.",
    photoHint: "buzzer-active",
    pins: [
      { id: "vcc", label: "VCC", kinds: ["power"], voltage: "5v" },
      { id: "gnd", label: "GND", kinds: ["ground"] },
      { id: "sig", label: "I/O", kinds: ["digital"] },
    ],
  },
  {
    id: "module.lcd.i2c.1602",
    name: "LCD 1602 (I2C)",
    kind: "module",
    description: "16x2 character LCD with I2C backpack.",
    photoHint: "lcd-1602-i2c",
    pins: [
      { id: "vcc", label: "VCC", kinds: ["power"], voltage: "5v" },
      { id: "gnd", label: "GND", kinds: ["ground"] },
      { id: "sda", label: "SDA", kinds: ["i2c"] },
      { id: "scl", label: "SCL", kinds: ["i2c"] },
    ],
  },
  {
    id: "module.soil.moisture",
    name: "Soil Moisture Sensor",
    kind: "module",
    description: "Analog soil moisture probe module.",
    photoHint: "soil-moisture",
    pins: [
      { id: "vcc", label: "VCC", kinds: ["power"], voltage: "3v3" },
      { id: "gnd", label: "GND", kinds: ["ground"] },
      { id: "ao", label: "A0", kinds: ["analog"] },
      { id: "do", label: "D0", kinds: ["digital"] },
    ],
  },
];
