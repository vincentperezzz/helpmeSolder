import type { Guide } from "@/lib/catalog/types";
import { toBreadboardLayout } from "@/lib/guides/layout-variants";

/** Frozen copy of production guide h025arr103368ja5g303f0 (ESP32 Button Buzzer). */
const direct: Guide = {
  id: "example-esp32-button-buzzer",
  title: "ESP32 Button Buzzer",
  power_source: "battery_3aa",
  board_id: "board.esp32.devkit",
  parts: [
    { instanceId: "breadboard1", catalogId: "passive.breadboard.half", label: "Half Breadboard" },
    { instanceId: "buzzer1", catalogId: "module.buzzer.active", label: "Active Buzzer" },
    { instanceId: "btn1", catalogId: "passive.pushbutton", label: "Pushbutton" },
    { instanceId: "board1", catalogId: "board.esp32.devkit", label: "ESP32 DevKit V1" },
  ],
  connections: [
    {
      id: "c1",
      from: { instanceId: "board1", pinId: "D5" },
      to: { instanceId: "buzzer1", pinId: "1" },
      note: "Buzzer signal to GPIO D5",
    },
    {
      id: "c2",
      from: { instanceId: "board1", pinId: "GND.1" },
      to: { instanceId: "buzzer1", pinId: "2" },
      note: "Buzzer ground to ESP32 GND",
    },
    {
      id: "c3",
      from: { instanceId: "board1", pinId: "D4" },
      to: { instanceId: "btn1", pinId: "1.l" },
      note: "Button signal to GPIO D4",
    },
    {
      id: "c4",
      from: { instanceId: "board1", pinId: "GND.2" },
      to: { instanceId: "btn1", pinId: "2.l" },
      note: "Button ground to ESP32 GND",
    },
  ],
  steps: [
    {
      id: "s1",
      order: 1,
      title: "Place components on the breadboard",
      body: "Insert the ESP32 DevKit straddling the center divider of the breadboard. Place the tactile pushbutton and active buzzer into separate breadboard rows.",
    },
    {
      id: "s2",
      order: 2,
      title: "Connect battery power",
      body: "Connect the 3×AA battery holder positive (red wire) to ESP32 VIN and negative (black wire) to ESP32 GND.",
    },
    {
      id: "s3",
      order: 3,
      title: "Wire the active buzzer",
      body: "Connect buzzer pin 1 (SIG) to ESP32 pin D5. Connect buzzer pin 2 (GND) to ESP32 pin GND.",
    },
    {
      id: "s4",
      order: 4,
      title: "Wire the pushbutton",
      body: "Connect pushbutton pin 1L to ESP32 pin D4. Connect pushbutton pin 2L to ESP32 pin GND.",
    },
    {
      id: "s5",
      order: 5,
      title: "Power on and test",
      body: "Upload your firmware with pin 4 configured as INPUT_PULLUP and pin 5 as OUTPUT. Pressing the button will sound the buzzer.",
    },
  ],
  notes: [
    "3×AA batteries provide ~4.5V into the ESP32 VIN pin. Do not feed more than 5V directly into 3V3 pin.",
    "Configure GPIO 4 in software as INPUT_PULLUP so pressing the button connects it cleanly to GND.",
  ],
  created_at: "2026-10-05T09:32:43.674Z",
  updated_at: "2026-10-06T09:45:01.108Z",
};

const laidOut = toBreadboardLayout(direct);

export const EXAMPLE_GUIDE: Guide = {
  ...laidOut,
  parts: laidOut.parts.map((part) =>
    part.catalogId.startsWith("passive.breadboard") ? { ...part, label: "Breadboard" } : part,
  ),
};

export const EXAMPLE_PART_ORDER = ["buzzer1", "btn1", "board1", "breadboard"] as const;
