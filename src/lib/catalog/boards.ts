import type { CatalogPart, PartElectrical, PinElectrical } from "./types";

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

const baseBoards: CatalogPart[] = [
  {
    id: "board.esp32.devkit",
    name: "ESP32 DevKit V1",
    kind: "board",
    description:
      "A small development board built around the ESP32 chip: a dual-core 3.3 V microcontroller with Wi-Fi and Bluetooth built in, programmed from the Arduino IDE or similar. Power it from USB (micro-USB or USB-C) or feed 5 V into the VIN pin; the 3V3 pin is a 3.3 V OUTPUT for small sensors. Most pins are general-purpose input/output (GPIO). Pins 34, 35, 36 (VP) and 39 (VN) can only be inputs, and the EN pin is the reset line.",
    photoCaption:
      "ESP32 DevKit V1: metal-shielded ESP32 module at one end, a row of pins down each side, EN and BOOT buttons near the USB port.",
    identify:
      "Narrow board (about 5 x 2.8 cm) with a silver metal shielded module marked ESP32-WROOM-32 (or similar) and a printed antenna trace at one end, a micro-USB or USB-C port at the other, two small buttons labelled EN and BOOT, and 15 pins down each side (30 total, though some clones have 36 or 38 pins). Check that the module says ESP32, not ESP32-S2/S3/C3, which look the same but have different pins.",
    variants: [
      {
        label: "ESP32 DevKit V1 (this guide)",
        detail: "Original ESP32 (dual-core, Wi-Fi + Bluetooth Classic + BLE), common 30-pin layout. Some clones have 36 or 38 pins, so check the pin labels on the board against the guide.",
        matchesGuide: true,
      },
      {
        label: "ESP32-S2 / S3 DevKit",
        detail: "Different chips and pinouts. S2 has Wi-Fi only (no Bluetooth). S3 has Wi-Fi + BLE (no classic Bluetooth) and often a second USB port.",
      },
      {
        label: "ESP32-C3 / C6",
        detail: "Newer RISC-V boards, usually smaller. Wi-Fi + BLE. Pin names differ from the DevKit V1.",
      },
      {
        label: "ESP32-WROVER",
        detail: "Same ESP32 with extra memory (PSRAM). Some GPIO pins are used for that memory, so check the silkscreen and avoid the reserved pins.",
      },
    ],
    watchOuts: [
      "Many cheap 'ESP32' listings are actually S2/S3/C3. Read the module label on the metal can.",
      "3.3 V logic only. Do not feed 5 V into any GPIO pin or you can damage it. A pin can safely source only about 20 mA (many guides use 12 mA to be safe), so LEDs need a resistor and motors, relays or buzzers that draw more must be switched through a transistor or driver, never straight from a pin.",
      "Some pins are special at boot: GPIO0, 2, 5, 12 and 15 are 'strapping' pins that set boot mode, so a pull-up/down or button on them can stop the board starting or uploading. GPIO12 especially should be LOW at boot. Safest first choices are D4, D13, D14, D16, D17, D18, D19, D21, D22, D23, D25, D26, D27, D32 and D33.",
      "D34, D35, VP (GPIO36) and VN (GPIO39) are input-only and have no internal pull-up, so a button there needs an external 10 kΩ resistor. Analog readings on ADC2 pins (GPIO 0, 2, 4, 12-15, 25-27) do not work while Wi-Fi is on; use D32-D39 for analog reads with Wi-Fi.",
      "USB-C vs micro-USB is only the connector; it does not tell you the chip variant.",
    ],
    photoHint: "esp32-devkit",
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
    description:
      "The classic beginner microcontroller board (ATmega328P chip, 16 MHz) with 5 V logic. It has 14 digital pins (D0-D13), 6 analog input pins (A0-A5), and 5V, 3.3V, GND and VIN power pins. Power it through the USB-B port, the round DC barrel jack (7-12 V recommended) or VIN. D0 and D1 are the USB serial port, so avoid them while uploading; D13 drives the small built-in LED; A4 and A5 double as the I2C pins (SDA and SCL).",
    photoCaption:
      "Arduino Uno R3: blue (or clone-coloured) board with a USB-B port, black DC barrel jack, ATmega328P chip and two long female header rows.",
    identify:
      "Board about 6.9 x 5.3 cm with a large square USB-B port (or USB-C on some clones) and a round black DC barrel jack on the left end, and a long black chip marked ATmega328P. Labelled UNO R3 (R3 = revision 3). UNO R4 looks very similar but has a different, smaller chip and says R4.",
    variants: [
      {
        label: "Uno R3 (this guide)",
        detail: "ATmega328P, 5 V logic, classic shield footprint. Most beginner tutorials use this.",
        matchesGuide: true,
      },
      {
        label: "Uno R4 Minima / WiFi",
        detail: "Different chip (Renesas RA4M1; the WiFi version adds an ESP32-S3). Same shield shape and 5 V logic, but software and libraries differ.",
      },
      {
        label: "Uno clones",
        detail: "Usually cheaper with a CH340 or CP2102 USB chip instead of the standard ATmega16U2; you may need to install a free driver. Work the same if they say Uno R3.",
      },
    ],
    watchOuts: [
      "5 V logic: its pins output 5 V, so a 3.3 V-only module or sensor can be damaged by it. Use a level shifter or a voltage divider when connecting 3.3 V parts' inputs.",
      "Each I/O pin can provide about 20 mA (40 mA absolute maximum), and the whole chip about 200 mA, so use a resistor with LEDs and never power a motor or relay straight from a pin. Use a transistor, driver module or relay module with its own supply.",
      "Do not use pins D0 and D1 for anything else while uploading code: they are the USB serial lines. The 3.3 V pin supplies at most about 50 mA.",
      "If the board says UNO R4, follow R4 documentation. Not every R3 sketch behaves identically.",
    ],
    photoHint: "arduino-uno",
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
    description:
      "A small breadboard-friendly version of the Uno (ATmega328P, 5 V logic) with the same code and nearly the same pins. It has D0-D13, analog pins A0-A7 (A6 and A7 are analog-input only), 5V, 3.3V, GND and VIN pins. Power it from the USB port (mini-USB, micro-USB or USB-C depending on clone) or 7-12 V into VIN. D13 drives the built-in LED; A4 and A5 are the I2C pins (SDA and SCL).",
    photoCaption:
      "Arduino Nano: thumb-sized board with two long pin rows on the sides, a USB port at one end and a square ATmega328P chip.",
    identify:
      "Tiny board about 4.5 x 1.8 cm with a mini-USB, micro-USB or USB-C port at one end, a small square ATmega328P chip, and 15 pins on each long side, often sold without headers soldered. Silkscreen says NANO. Nano 33 / Every look alike but are different (3.3 V) boards.",
    variants: [
      {
        label: "Nano (classic 328P, this guide)",
        detail: "5 V ATmega328P; works like an Uno for most sketches. Original Nanos use an FTDI USB chip; clones use CH340 and need a driver.",
        matchesGuide: true,
      },
      {
        label: "Nano with old bootloader",
        detail: "Some clones need Tools > Processor: ATmega328P (Old Bootloader) in the Arduino IDE or the upload fails.",
      },
      {
        label: "Nano Every",
        detail: "Different chip (ATmega4809); not identical to the classic Nano for upload and pin behaviour.",
      },
      {
        label: "Nano 33 IoT / BLE / Sense",
        detail: "3.3 V boards with wireless or sensors. Wrong voltage and pin maps vs the classic Nano.",
      },
    ],
    watchOuts: [
      "If it says Nano 33 or Every on the silkscreen, treat it as a different board.",
      "5 V logic, so 3.3 V-only parts can be damaged by its outputs. Each pin gives about 20 mA at most (40 mA absolute max): use resistors for LEDs and never power a motor or relay directly from a pin.",
      "Many Nanos arrive without header pins soldered; solder the headers (long side down into a breadboard) before using it on a breadboard.",
      "The VIN pin needs about 7-12 V; the 5V pin is a 5 V OUTPUT when powered by USB or VIN. Do not feed 9 V into the 5V pin.",
    ],
    photoHint: "arduino-nano",
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
    description:
      "A larger Arduino (ATmega2560, 5 V logic) with many more pins: 54 digital pins, 16 analog inputs (A0-A15), four hardware serial ports and more memory. Same power options as the Uno (USB-B, barrel jack 7-12 V, VIN). Pins 20 (SDA) and 21 (SCL) are the I2C pins, and pins 0 and 1 are the USB serial port.",
    photoCaption:
      "Arduino Mega 2560: a long board with double header rows at the sides and ends, a USB-B port and DC barrel jack.",
    identify:
      "Roughly twice as long as an Uno (about 10.2 x 5.3 cm) with extra pin rows along the top edge and end, a USB-B port and barrel jack, and a large square chip marked ATmega2560. Silkscreen says MEGA 2560.",
    variants: [
      {
        label: "Mega 2560 (this guide)",
        detail: "ATmega2560, 5 V logic, classic Mega pin layout.",
        matchesGuide: true,
      },
      {
        label: "Mega clones",
        detail: "Same footprint, often with a CH340 USB chip that needs a driver. Confirm the label says 2560.",
      },
    ],
    watchOuts: [
      "5 V logic: 3.3 V-only modules need a level shifter. Each pin gives about 20 mA at most (40 mA absolute max), so use resistors with LEDs and never power motors or relays from a pin.",
      "I2C is on pins 20 (SDA) and 21 (SCL), not A4/A5 as on the Uno.",
      "Uno shields fit, but some library/code assumes Uno pin numbers for SPI (pins 50-53) and I2C; check the pin map.",
    ],
    photoHint: "arduino-mega",
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
    description:
      "A small, cheap microcontroller board using the RP2040 chip (dual-core, 3.3 V logic). It has 26 usable GPIO pins named GP0-GP28 (GP26-GP28 can read analog values), a 3V3 pin that outputs 3.3 V, a VBUS pin that shows the 5 V from USB, VSYS for an external 1.8-5.5 V supply, and several GND pins. Plug it into USB while holding the BOOTSEL button and it appears as a USB drive for drag-and-drop programming (MicroPython or Arduino). This plain Pico has no Wi-Fi or Bluetooth.",
    photoCaption:
      "Raspberry Pi Pico (original): green board with a micro-USB port, BOOTSEL button and 20 pins on each long side.",
    identify:
      "Narrow green board about 5.1 x 2.1 cm with a micro-USB port at one end, a white BOOTSEL button, 40 pin positions (castellated holes, often unsoldered), and the RP2040 chip in the middle. Original Pico has no silver wireless can; Pico W has one and says Pico W.",
    variants: [
      {
        label: "Pico (RP2040, this guide)",
        detail: "No Wi-Fi or Bluetooth. Usually sold without headers soldered; the 'H' version has them.",
        matchesGuide: true,
      },
      {
        label: "Pico W",
        detail: "Adds Wi-Fi and Bluetooth. Same RP2040 and mostly the same pins, but wireless needs different firmware and libraries.",
      },
      {
        label: "Pico H / WH",
        detail: "Same as Pico / Pico W with headers pre-soldered. Buy these if you do not want to solder.",
      },
      {
        label: "Pico 2 / Pico 2 W",
        detail: "Newer RP2350 chip. Similar shape, not identical to RP2040 for all software.",
      },
    ],
    watchOuts: [
      "3.3 V logic ONLY: GPIO pins are NOT 5 V tolerant. VBUS is 5 V from USB, but never connect it to a GPIO pin.",
      "GPIO pins can supply only a few mA to about 12-16 mA each, so use a resistor with LEDs and switch motors, relays and buzzers through a transistor or driver, never straight from a pin.",
      "If you need Bluetooth or Wi-Fi on-board, buy a Pico W (or WH). This plain Pico does not have it.",
      "Many Picos come without headers; they need soldering to plug into a breadboard.",
    ],
    photoHint: "pico",
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
    id: "board.pico.w",
    name: "Raspberry Pi Pico W",
    kind: "board",
    description:
      "Same as the Raspberry Pi Pico (RP2040, 3.3 V logic, GP0-GP28 pins, BOOTSEL button for drag-and-drop programming) but with Wi-Fi and Bluetooth added by a small wireless chip. GP26-GP28 read analog values. The built-in LED is wired through the wireless chip, not a normal GPIO pin, so LED-blink code differs from the plain Pico.",
    photoCaption:
      "Raspberry Pi Pico W: like the Pico with a small silver wireless module and antenna at the USB end.",
    identify:
      "Looks like a Pico, but with a small shielded wireless module and printed antenna at one end, and 'Pico W' (or 'Pico WH' for headers) on the silkscreen.",
    variants: [
      {
        label: "Pico W (this guide)",
        detail: "Wi-Fi + Bluetooth LE. Mostly the same GPIO as Pico. Usually sold without headers soldered.",
        matchesGuide: true,
      },
      {
        label: "Pico WH",
        detail: "Pico W with headers pre-soldered. Buy this if you do not want to solder.",
      },
      {
        label: "Pico (no wireless)",
        detail: "Original Pico: no Wi-Fi or Bluetooth.",
      },
      {
        label: "Pico 2 W",
        detail: "Newer RP2350 chip with wireless; not identical software.",
      },
    ],
    watchOuts: [
      "3.3 V logic only: GPIO pins are NOT 5 V tolerant. VBUS is 5 V from USB; never connect it to a GPIO pin.",
      "Pins supply only a few mA to about 12-16 mA, so use resistors with LEDs and switch motors or relays through a transistor or driver.",
      "Wireless needs different firmware and libraries than plain Pico.",
    ],
    photoHint: "pico-w",
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
    id: "board.pico.2",
    name: "Raspberry Pi Pico 2",
    kind: "board",
    description:
      "The newer Raspberry Pi Pico with the RP2350 chip (dual-core, 3.3 V logic). It has the same shape and pin layout as the original Pico (GP0-GP28, GP26-GP28 analog, 3V3, VBUS, GND, BOOTSEL button for drag-and-drop programming), with more speed and memory.",
    photoCaption:
      "Raspberry Pi Pico 2: same shape as Pico, labelled Pico 2 / RP2350.",
    identify:
      "Looks like a Pico but the board and chip say Pico 2 / RP2350. Same size; check the silkscreen to avoid mixing it with the original Pico.",
    variants: [
      {
        label: "Pico 2 (this guide)",
        detail: "RP2350 dual-core. Check that your software supports RP2350 before reusing an RP2040 project.",
        matchesGuide: true,
      },
      {
        label: "Pico 2 W",
        detail: "Adds Wi-Fi and Bluetooth. Use for projects that need wireless.",
      },
      {
        label: "Header versions",
        detail: "Check the listing: if the board says no headers, you must solder pin headers yourself.",
      },
    ],
    watchOuts: [
      "Software and some peripherals differ from the RP2040 Pico.",
      "Treat GPIO as 3.3 V only; do not connect 5 V signals.",
      "Pins supply only a few mA to about 12-16 mA, so use resistors with LEDs and switch motors through a transistor or driver.",
    ],
    photoHint: "pico-2",
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
    id: "board.pi.zero.w",
    name: "Raspberry Pi Zero W",
    kind: "board",
    description:
      "A tiny full Linux computer (not a microcontroller) with Wi-Fi and Bluetooth, a 40-pin GPIO header (3.3 V logic), a micro-SD card slot and mini-HDMI. It runs an operating system from the SD card and needs to be shut down properly. Power it with 5 V into the micro-USB port marked PWR. Pins 1 and 17 are 3.3 V, pins 2 and 4 are 5 V, and many pins are GND. It has no analog input pins.",
    photoCaption:
      "Raspberry Pi Zero W: a small board with mini-HDMI, micro-USB ports, micro-SD slot and a 40-pin footprint.",
    identify:
      "Tiny board about 6.5 x 3 cm labelled Raspberry Pi Zero W, with a micro-SD slot, mini-HDMI port, two micro-USB ports, a camera connector, and 40 header holes (the 'WH' model has the header soldered).",
    variants: [
      {
        label: "Pi Zero W (this guide)",
        detail: "Wi-Fi + Bluetooth. Usually sold WITHOUT the 40-pin header; the 'WH' version has it soldered.",
        matchesGuide: true,
      },
      {
        label: "Pi Zero WH",
        detail: "Same board with the header soldered. Buy this to avoid soldering.",
      },
      {
        label: "Pi Zero 2 W",
        detail: "Faster quad-core version with the same size and pin layout.",
      },
    ],
    watchOuts: [
      "GPIO pins are 3.3 V only and NOT 5 V tolerant. Each pin can supply only a few mA to about 16 mA, so use resistors with LEDs and never drive motors or relays from a pin.",
      "It is a full computer: it needs a micro-SD card with the OS and a 5 V power supply of about 2.5 A (some projects need less), and should be shut down before power is removed.",
      "The Zero W header is often not soldered; you need to solder one yourself or buy the WH version.",
      "Wiring guides differ from microcontroller (Pico or ESP32) projects, and there is no analog input.",
    ],
    photoHint: "pi-zero-w",
    pins: [
      power("3V3", "3V3", "3v3"),
      power("5V", "5V", "5v"),
      gnd("GND", "GND"),
    ],
  },
  {
    id: "board.pi.3b.plus",
    name: "Raspberry Pi 3 Model B+",
    kind: "board",
    description:
      "A credit-card-sized Linux computer with 4 USB ports, Ethernet, Wi-Fi, Bluetooth, full-size HDMI and a 40-pin GPIO header (3.3 V logic). Pins 1 and 17 are 3.3 V, pins 2 and 4 are 5 V, and several pins are GND. Power it with a 5 V supply (about 2.5 A) into the micro-USB port. It has no analog input pins.",
    photoCaption:
      "Raspberry Pi 3 Model B+: a full-size board with Ethernet, four USB ports, HDMI and a 40-pin GPIO header.",
    identify:
      "Board about 8.5 x 5.6 cm labelled Raspberry Pi 3 Model B+, with Ethernet and 4 USB-A ports on one edge, full-size HDMI, a micro-USB power port and a 40-pin header already soldered.",
    variants: [
      {
        label: "Pi 3 B+ (this guide)",
        detail: "Broadcom BCM2837B0 quad-core chip, Wi-Fi + Bluetooth, 40-pin header.",
        matchesGuide: true,
      },
      {
        label: "Pi 3 B",
        detail: "Older version with similar pins and slightly lower performance.",
      },
    ],
    watchOuts: [
      "GPIO pins are 3.3 V only and NOT 5 V tolerant. Each pin gives a few mA to about 16 mA, so use resistors with LEDs and never drive motors or relays from a pin.",
      "It is a Linux computer needing a micro-SD card with the OS and a proper 5 V 2.5 A supply; shut down before removing power.",
      "No analog input pins; use an external ADC module for analog sensors.",
    ],
    photoHint: "pi-3b-plus",
    pins: [
      power("3V3", "3V3", "3v3"),
      power("5V", "5V", "5v"),
      gnd("GND", "GND"),
    ],
  },
  {
    id: "board.pi.4b",
    name: "Raspberry Pi 4 Model B",
    kind: "board",
    description:
      "A faster Raspberry Pi Linux computer with two micro-HDMI ports, USB-C power, USB 3, Gigabit Ethernet, Wi-Fi, Bluetooth and a 40-pin GPIO header (3.3 V logic). Pins 1 and 17 are 3.3 V, pins 2 and 4 are 5 V, and several pins are GND. It has no analog input pins.",
    photoCaption:
      "Raspberry Pi 4 Model B: a board with USB-C power, two micro-HDMI ports and a 40-pin header.",
    identify:
      "Board labelled Raspberry Pi 4 Model B with a USB-C power port and two micro-HDMI ports next to it, two blue USB 3 ports and two black USB 2 ports, Ethernet, and a soldered 40-pin header.",
    variants: [
      {
        label: "Pi 4 B (this guide)",
        detail: "USB-C power, dual micro-HDMI, 40-pin header. Comes in 1, 2, 4 or 8 GB RAM versions; all have the same pins.",
        matchesGuide: true,
      },
      {
        label: "Pi 400",
        detail: "Keyboard computer with the same chip; GPIO is on the back and not a pin strip.",
      },
    ],
    watchOuts: [
      "GPIO pins are 3.3 V only and NOT 5 V tolerant. Pins supply a few mA to about 16 mA, so use resistors with LEDs and never drive motors or relays from a pin.",
      "Needs a good 5 V 3 A USB-C supply; poor chargers cause brown-outs under load.",
      "It is a Linux computer needing a micro-SD card with the OS; shut it down before removing power. No analog input pins.",
    ],
    photoHint: "pi-4b",
    pins: [
      power("3V3", "3V3", "3v3"),
      power("5V", "5V", "5v"),
      gnd("GND", "GND"),
    ],
  },
  {
    id: "board.pi.5",
    name: "Raspberry Pi 5",
    kind: "board",
    description:
      "The current full-size Raspberry Pi: a Linux computer with a faster chip, USB-C power, two micro-HDMI ports, a PCIe connector, a power button and the 40-pin GPIO header (3.3 V logic). Pins 1 and 17 are 3.3 V, pins 2 and 4 are 5 V, and several are GND. It has no analog input pins.",
    photoCaption:
      "Raspberry Pi 5: board with USB-C power, two micro-HDMI ports, a PCIe ribbon connector and a 40-pin header.",
    identify:
      "Labelled Raspberry Pi 5; a small power button beside the USB-C port, two micro-HDMI ports, a PCIe flat-cable connector near the edge, and a 40-pin header already soldered.",
    variants: [
      {
        label: "Pi 5 (this guide)",
        detail: "Newer chip with stricter power needs than Pi 4. Comes in 2, 4, 8 or 16 GB RAM; all have the same pins.",
        matchesGuide: true,
      },
    ],
    watchOuts: [
      "Power requirements are strict: use the official 5 V 5 A USB-C power supply. Weaker chargers limit the USB ports and can cause crashes.",
      "GPIO pins are 3.3 V only and NOT 5 V tolerant. Pins supply only a few mA to about 16 mA, so use resistors with LEDs and never drive motors or relays from a pin.",
      "It is a Linux computer needing a micro-SD card with the OS; shut it down before removing power. No analog input pins.",
    ],
    photoHint: "pi-5",
    pins: [
      power("3V3", "3V3", "3v3"),
      power("5V", "5V", "5v"),
      gnd("GND", "GND"),
    ],
  },
  {
    id: "board.esp8266.nodemcu",
    name: "ESP8266 NodeMCU",
    kind: "board",
    description:
      "A Wi-Fi development board using the ESP8266 chip (3.3 V logic, no Bluetooth). It has pins D0-D8, one analog input (A0), a 3V pin that outputs 3.3 V, GND, and VIN for 5 V power; you power it from the micro-USB port. The D numbers printed on the board are NOT the same as the chip's GPIO numbers (for example D1 = GPIO5, D2 = GPIO4), so use the labels on your board's pin map.",
    photoCaption:
      "NodeMCU ESP8266: small board with a micro-USB port, a metal-shielded ESP-12 Wi-Fi module with a printed antenna, and a pin row down each side.",
    identify:
      "Narrow board (about 5 x 2.5 cm, V2 'Amica') with a micro-USB port, FLASH and RST buttons, and a small silver module marked ESP-12E/ESP8266 with a printed antenna. Silkscreen says NodeMCU. ESP32 boards look similar but say ESP32 on the module.",
    variants: [
      {
        label: "NodeMCU ESP8266 (this guide)",
        detail: "Wi-Fi only. Common Amica pin labelling (D0-D8).",
        matchesGuide: true,
      },
      {
        label: "LoLin / V3",
        detail: "A wider NodeMCU clone that does not leave breadboard holes free on either side; check the width before buying for a breadboard.",
      },
      {
        label: "ESP-01 / bare ESP-12 modules",
        detail: "Same chip but tiny with no USB; not breadboard-friendly NodeMCU layout.",
      },
      {
        label: "ESP32 boards",
        detail: "Different chip with more pins and Bluetooth. Not interchangeable with ESP8266 wiring.",
      },
    ],
    watchOuts: [
      "ESP8266 has Wi-Fi but no Bluetooth. If a project needs Bluetooth, use an ESP32 or Pico W instead.",
      "3.3 V logic only: do not connect 5 V signals to pins. Each pin gives about 12 mA safely, so use resistors with LEDs and switch motors and relays through a transistor, never straight from a pin.",
      "A0 is the only analog input and reads only about 0 to 3.3 V on NodeMCU boards (a bare chip handles only 1 V); check your board.",
      "Some pins are special at boot: D3 (GPIO0), D4 (GPIO2) and D8 (GPIO15) must be at certain levels (D3 and D4 high, D8 low) or the board will not start; D4 also drives the built-in LED. D0 (GPIO16) cannot do PWM or I2C.",
    ],
    photoHint: "esp8266-nodemcu",
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

const out3v3: PinElectrical = {
  source: { nominal: 3.3, min: 3.15, max: 3.45 },
  accepts: { min: 3.0, max: 3.6 },
};
const out5v: PinElectrical = {
  source: { nominal: 5, min: 4.5, max: 5.25 },
  accepts: { min: 4.5, max: 5.5 },
};

const ESP32_ELECTRICAL: PartElectrical = {
  logic: "3v3",
  fiveVTolerantIo: false,
  pins: {
    VIN: { source: { nominal: 5, min: 4.5, max: 5.25 }, accepts: { min: 4.5, max: 12 } },
    "3V3": out3v3,
  },
};

const ARDUINO_5V_ELECTRICAL: PartElectrical = {
  logic: "5v",
  fiveVTolerantIo: true,
  pins: {
    "5V": out5v,
    "3.3V": { source: { nominal: 3.3, min: 3.2, max: 3.4 } },
    VIN: { source: { nominal: 7, min: 6, max: 12 }, accepts: { min: 7, max: 12 } },
  },
};

const PICO_ELECTRICAL: PartElectrical = {
  logic: "3v3",
  fiveVTolerantIo: false,
  pins: {
    "3v3": out3v3,
    vbus: out5v,
  },
};

const PI_ELECTRICAL: PartElectrical = {
  logic: "3v3",
  fiveVTolerantIo: false,
  pins: {
    "3V3": out3v3,
    "5V": {
      source: { nominal: 5, min: 4.75, max: 5.25 },
      accepts: { min: 4.75, max: 5.25 },
    },
  },
};

const BOARD_ELECTRICAL: Record<string, PartElectrical> = {
  "board.esp32.devkit": ESP32_ELECTRICAL,
  "board.arduino.uno": ARDUINO_5V_ELECTRICAL,
  "board.arduino.nano": ARDUINO_5V_ELECTRICAL,
  "board.arduino.mega": ARDUINO_5V_ELECTRICAL,
  "board.pico.rp2040": PICO_ELECTRICAL,
  "board.pico.w": PICO_ELECTRICAL,
  // RP2350 GPIO is 5V tolerant only under specific conditions; treat as 3.3V-only.
  "board.pico.2": PICO_ELECTRICAL,
  "board.pi.zero.w": PI_ELECTRICAL,
  "board.pi.3b.plus": PI_ELECTRICAL,
  "board.pi.4b": PI_ELECTRICAL,
  "board.pi.5": PI_ELECTRICAL,
  "board.esp8266.nodemcu": {
    logic: "3v3",
    fiveVTolerantIo: false,
    pins: {
      "3v3": out3v3,
      vin: { source: { nominal: 5, min: 4.5, max: 5.25 }, accepts: { min: 4.5, max: 10 } },
    },
  },
};

export const boards: CatalogPart[] = baseBoards.map((board) => ({
  ...board,
  electrical: BOARD_ELECTRICAL[board.id],
}));
