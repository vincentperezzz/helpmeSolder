import type { Guide } from "@/lib/catalog/types";
import { toBreadboardLayout } from "@/lib/guides/layout-variants";

const direct: Guide = {
  id: "example-esp32-button-buzzer",
  title: "ESP32 Button Buzzer",
  power_source: "battery_3aa",
  board_id: "board.esp32.devkit",
  parts: [
    { instanceId: "mcu", catalogId: "board.esp32.devkit" },
    { instanceId: "buz", catalogId: "module.buzzer.active", label: "Active Buzzer" },
    { instanceId: "btn", catalogId: "passive.pushbutton", label: "Pushbutton" },
  ],
  connections: [
    {
      id: "c1",
      from: { instanceId: "mcu", pinId: "D5" },
      to: { instanceId: "buz", pinId: "1" },
    },
    {
      id: "c2",
      from: { instanceId: "buz", pinId: "2" },
      to: { instanceId: "mcu", pinId: "GND.1" },
    },
    {
      id: "c3",
      from: { instanceId: "mcu", pinId: "D4" },
      to: { instanceId: "btn", pinId: "1.l" },
    },
    {
      id: "c4",
      from: { instanceId: "btn", pinId: "2.l" },
      to: { instanceId: "mcu", pinId: "GND.2" },
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
      body: "Connect the 3xAA battery holder positive (red wire) to ESP32 VIN and negative (black wire) to ESP32 GND.",
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
    "3xAA batteries provide about 4.5 V into the ESP32 VIN pin. Do not feed more than 5 V directly into the 3V3 pin.",
    "Configure GPIO 4 in software as INPUT_PULLUP so pressing the button connects it cleanly to GND.",
  ],
  created_at: "2026-03-01T00:00:00.000Z",
  updated_at: "2026-03-01T00:00:00.000Z",
};

const laidOut = toBreadboardLayout(direct);

export const EXAMPLE_GUIDE: Guide = {
  ...laidOut,
  parts: laidOut.parts.map((part) =>
    part.catalogId.startsWith("passive.breadboard") ? { ...part, label: "Breadboard" } : part,
  ),
};

export const EXAMPLE_PART_ORDER = ["buz", "btn", "mcu", "breadboard"] as const;
