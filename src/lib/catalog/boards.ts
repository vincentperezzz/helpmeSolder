import type { CatalogPart } from "./types";

function power(id: string, label: string, voltage?: "3v3" | "5v") {
  return { id, label, kinds: ["power" as const], voltage };
}
function gnd(id: string, label = "GND") {
  return { id, label, kinds: ["ground" as const] };
}
function dig(id: string, label?: string) {
  return { id, label: label ?? id, kinds: ["digital" as const] };
}
function ana(id: string, label?: string) {
  return { id, label: label ?? id, kinds: ["analog" as const, "digital" as const] };
}

export const boards: CatalogPart[] = [
  {
    id: "board.esp32.devkit",
    name: "ESP32 DevKit V1",
    kind: "board",
    description: "Classic 30-pin ESP32-WROOM DevKit V1 look, 3.3V logic. Wi-Fi + Bluetooth classic/BLE.",
    photoHint: "esp32-devkit",
    photoCaption: "ESP32 DevKit V1 style board / pinout reference — WROOM module with dual headers.",
    identify:
      "Look for a dual-row 30-pin board labeled ESP32 DevKit, usually with a micro-USB (or USB-C clone) and an ESP32-WROOM metal can. Chip says ESP32, not ESP32-S2/S3/C3.",
    variants: [
      {
        label: "ESP32 DevKit V1 (this guide)",
        detail: "Original ESP32 (Xtensa dual-core). Has Wi-Fi + Bluetooth Classic + BLE. Common 30-pin layout.",
        matchesGuide: true,
      },
      {
        label: "ESP32-S2 / S3 DevKit",
        detail: "Different chip family. S2 has Wi-Fi only (no Bluetooth). S3 has Wi-Fi + BLE but not classic BT, and often USB-OTG. Pinouts differ.",
      },
      {
        label: "ESP32-C3 / C6",
        detail: "RISC-V boards, usually narrower. Wi-Fi + BLE. Do not treat pin names as the same as DevKit V1.",
      },
      {
        label: "ESP32-WROVER",
        detail: "Same ESP32 family but with PSRAM; module looks longer. Some GPIO reserved for PSRAM — check silkscreen.",
      },
    ],
    watchOuts: [
      "Many cheap 'ESP32' listings are S2/S3/C3 — read the module label on the metal can.",
      "USB-C vs micro-USB is only the connector; it does not tell you the chip variant.",
      "3.3V logic only — do not feed 5V into GPIO.",
    ],
    wokwi: { tag: "wokwi-esp32-devkit-v1" },
    pins: [
      power("VIN", "VIN", "5v"),
      gnd("GND.2", "GND"),
      dig("D13"),
      dig("D12"),
      dig("D14"),
      dig("D27"),
      dig("D26"),
      dig("D25"),
      dig("D33"),
      dig("D32"),
      ana("D35"),
      ana("D34"),
      dig("VN"),
      dig("VP"),
      dig("EN"),
      power("3V3", "3V3", "3v3"),
      gnd("GND.1", "GND"),
      dig("D15"),
      dig("D2"),
      dig("D4"),
      dig("RX2"),
      dig("TX2"),
      { id: "D5", label: "D5", kinds: ["digital", "spi"] },
      { id: "D18", label: "D18", kinds: ["digital", "spi"] },
      { id: "D19", label: "D19", kinds: ["digital", "spi"] },
      { id: "D21", label: "D21", kinds: ["digital", "i2c"] },
      dig("RX0"),
      dig("TX0"),
      { id: "D22", label: "D22", kinds: ["digital", "i2c"] },
      { id: "D23", label: "D23", kinds: ["digital", "spi"] },
    ],
  },
  {
    id: "board.arduino.uno",
    name: "Arduino Uno",
    kind: "board",
    description: "Arduino Uno R3 style, 5V logic, ATmega328P.",
    photoHint: "arduino-uno",
    photoCaption: "Arduino Uno R3 (or compatible) with the long DIP/SMD MCU and USB-B / USB-C clone port.",
    identify:
      "Blue (or clone) board with DC barrel jack + USB, labeled UNO R3 or compatible. MCU is ATmega328P on classic R3 — not the larger UNO R4 chip.",
    variants: [
      {
        label: "Uno R3 (this guide)",
        detail: "ATmega328P, 5V, classic shield footprint. Most beginner tutorials assume this.",
        matchesGuide: true,
      },
      {
        label: "Uno R4 Minima / WiFi",
        detail: "Renesas RA4M1 (and ESP32-S3 on WiFi). Same shield shape, different MCU/libraries. Pin electricals mostly similar, software differs.",
      },
      {
        label: "Uno clones",
        detail: "CH340/CP2102 USB chips are common. Still R3-compatible if labeled Uno R3.",
      },
    ],
    watchOuts: [
      "If the board says UNO R4, follow R4 docs — not every R3 sketch assumes are identical.",
    ],
    wokwi: { tag: "wokwi-arduino-uno" },
    pins: [
      dig("0", "D0"),
      dig("1", "D1"),
      dig("2", "D2"),
      dig("3", "D3"),
      dig("4", "D4"),
      dig("5", "D5"),
      dig("6", "D6"),
      dig("7", "D7"),
      dig("8", "D8"),
      dig("9", "D9"),
      { id: "10", label: "D10", kinds: ["digital", "spi"] },
      { id: "11", label: "D11", kinds: ["digital", "spi"] },
      { id: "12", label: "D12", kinds: ["digital", "spi"] },
      { id: "13", label: "D13", kinds: ["digital", "spi"] },
      ana("A0"),
      ana("A1"),
      ana("A2"),
      ana("A3"),
      { id: "A4", label: "A4", kinds: ["analog", "digital", "i2c"] },
      { id: "A5", label: "A5", kinds: ["analog", "digital", "i2c"] },
      power("5V", "5V", "5v"),
      power("3.3V", "3.3V", "3v3"),
      gnd("GND.1", "GND"),
      gnd("GND.2", "GND"),
      gnd("GND.3", "GND"),
      power("VIN", "VIN", "5v"),
    ],
  },
  {
    id: "board.arduino.nano",
    name: "Arduino Nano",
    kind: "board",
    description: "Classic Nano (ATmega328P), 5V logic, mini USB or USB-C clone.",
    photoHint: "arduino-nano",
    photoCaption: "Small Nano stick with two long header rows — classic 328P Nano, not Nano 33 / Every.",
    identify:
      "Tiny board with mini-USB or USB-C, silkscreen often says NANO. Classic has ATmega328P. Nano 33 / Every look similar but are different chips.",
    variants: [
      {
        label: "Nano (classic 328P, this guide)",
        detail: "5V ATmega328P. Same family as Uno for most sketches.",
        matchesGuide: true,
      },
      {
        label: "Nano Every",
        detail: "ATmega4809. Different USB/upload quirks; not drop-in identical to classic Nano.",
      },
      {
        label: "Nano 33 IoT / BLE / Sense",
        detail: "3.3V boards with wireless/IMU. Wrong voltage and pin maps vs classic Nano.",
      },
    ],
    watchOuts: [
      "If it says Nano 33 or Every on the silkscreen, treat it as a different board.",
    ],
    wokwi: { tag: "wokwi-arduino-nano" },
    pins: [
      dig("0", "D0"),
      dig("1", "D1"),
      dig("2", "D2"),
      dig("3", "D3"),
      dig("4", "D4"),
      dig("5", "D5"),
      dig("6", "D6"),
      dig("7", "D7"),
      dig("8", "D8"),
      dig("9", "D9"),
      { id: "10", label: "D10", kinds: ["digital", "spi"] },
      { id: "11", label: "D11", kinds: ["digital", "spi"] },
      { id: "12", label: "D12", kinds: ["digital", "spi"] },
      { id: "13", label: "D13", kinds: ["digital", "spi"] },
      ana("A0"),
      ana("A1"),
      ana("A2"),
      ana("A3"),
      { id: "A4", label: "A4", kinds: ["analog", "digital", "i2c"] },
      { id: "A5", label: "A5", kinds: ["analog", "digital", "i2c"] },
      power("5V", "5V", "5v"),
      power("3.3V", "3.3V", "3v3"),
      gnd("GND.1", "GND"),
      power("VIN", "VIN", "5v"),
    ],
  },
  {
    id: "board.arduino.mega",
    name: "Arduino Mega",
    kind: "board",
    description: "Arduino Mega 2560 style — lots of IO, 5V logic.",
    photoHint: "arduino-mega",
    photoCaption: "Long Mega 2560 board with double header rows and DC jack.",
    identify: "Much longer than an Uno. Label usually MEGA 2560. Extra headers along the top edge.",
    variants: [
      {
        label: "Mega 2560 (this guide)",
        detail: "ATmega2560, 5V, classic Mega pinout.",
        matchesGuide: true,
      },
      {
        label: "Mega clones",
        detail: "Same footprint; confirm CH340/16U2 USB chip is fine for serial upload.",
      },
    ],
    wokwi: { tag: "wokwi-arduino-mega" },
    pins: [
      dig("0", "D0"),
      dig("1", "D1"),
      dig("2", "D2"),
      dig("13", "D13"),
      ana("A0"),
      { id: "20", label: "D20/SDA", kinds: ["digital", "i2c"] },
      { id: "21", label: "D21/SCL", kinds: ["digital", "i2c"] },
      power("5V", "5V", "5v"),
      power("3.3V", "3.3V", "3v3"),
      gnd("GND.1", "GND"),
      power("VIN", "VIN", "5v"),
    ],
  },
  {
    id: "board.pico.rp2040",
    name: "Raspberry Pi Pico",
    kind: "board",
    description: "Original Raspberry Pi Pico (RP2040) — no onboard Wi-Fi/Bluetooth.",
    photoHint: "pico",
    photoCaption: "Green Pico with micro-USB and BOOTSEL button — original Pico, not Pico W.",
    identify:
      "Small green board, micro-USB at one end, BOOTSEL button. Original Pico has no metal wireless module near the USB end. Pico W has a wireless package and usually says Pico W.",
    variants: [
      {
        label: "Pico (RP2040, this guide)",
        detail: "No onboard Wi-Fi or Bluetooth. USB device only for serial/USB. Cheapest Pico.",
        matchesGuide: true,
      },
      {
        label: "Pico W",
        detail: "Adds Infineon CYW43439 — Wi-Fi + Bluetooth/BLE. Same RP2040 core and mostly same pins, but wireless needs different firmware/libs.",
      },
      {
        label: "Pico H / WH",
        detail: "Pre-soldered headers (H) or headers + wireless (WH). Same electronics as Pico / Pico W.",
      },
      {
        label: "Pico 2 / Pico 2 W",
        detail: "RP2350 family — not drop-in identical to RP2040 for all software.",
      },
    ],
    watchOuts: [
      "If you need Bluetooth or Wi-Fi on-board, you want Pico W / WH — not this plain Pico.",
      "3.3V logic. VBUS is 5V from USB; GPIO stays 3.3V.",
    ],
    pins: [
      power("3v3", "3V3", "3v3"),
      gnd("gnd", "GND"),
      power("vbus", "VBUS", "5v"),
      dig("gp0", "GP0"),
      dig("gp1", "GP1"),
      { id: "gp2", label: "GP2", kinds: ["digital", "i2c"] },
      { id: "gp3", label: "GP3", kinds: ["digital", "i2c"] },
      dig("gp15", "GP15"),
      ana("gp26", "GP26"),
      ana("gp27", "GP27"),
      ana("gp28", "GP28"),
    ],
  },
  {
    id: "board.esp8266.nodemcu",
    name: "ESP8266 NodeMCU",
    kind: "board",
    description: "NodeMCU ESP8266 (Wi-Fi only — no Bluetooth).",
    photoHint: "esp8266-nodemcu",
    photoCaption: "NodeMCU-style ESP8266 board with Wi-Fi antenna area — not an ESP32.",
    identify:
      "Usually says NodeMCU or ESP8266 on the silkscreen. Single-core Wi-Fi MCU. No Bluetooth. Do not confuse with ESP32 DevKits that look similar.",
    variants: [
      {
        label: "NodeMCU ESP8266 (this guide)",
        detail: "Wi-Fi only. Common Amica / LoLin pin labeling (D0–D8).",
        matchesGuide: true,
      },
      {
        label: "ESP-01 / ESP-12 bare modules",
        detail: "Same chip family, tiny pinouts — not the NodeMCU breadboard layout.",
      },
      {
        label: "ESP32 boards",
        detail: "Different chip. Has Bluetooth options and different pins — not interchangeable with ESP8266 wiring.",
      },
    ],
    watchOuts: [
      "ESP8266 has Wi-Fi but no Bluetooth — if a project needs BT, use ESP32 / Pico W instead.",
    ],
    pins: [
      power("3v3", "3V", "3v3"),
      gnd("gnd", "GND"),
      power("vin", "VIN", "5v"),
      dig("d0", "D0"),
      { id: "d1", label: "D1", kinds: ["digital", "i2c"] },
      { id: "d2", label: "D2", kinds: ["digital", "i2c"] },
      dig("d3", "D3"),
      dig("d4", "D4"),
      dig("d5", "D5"),
      dig("d6", "D6"),
      dig("d7", "D7"),
      dig("d8", "D8"),
      ana("a0", "A0"),
    ],
  },
];
