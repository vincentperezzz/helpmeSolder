import type { CatalogPart, CatalogPin, PartElectrical, PinElectrical, PinKind } from "../types";

/**
 * Expansion parts: boards. Ids must stay unique and are never removed or renamed.
 *
 * Pin lists only cover the pins that matter to a beginner. When a pin is left out
 * on purpose (reserved for flash, USB, the camera...) the part's description or
 * watchOuts say so and point at the pinout printed on the board.
 */

function pin(id: string, label: string, kinds: PinKind[], voltage?: "3v3" | "5v"): CatalogPin {
  return voltage ? { id, label, kinds, voltage } : { id, label, kinds };
}
const power = (id: string, label: string, voltage?: "3v3" | "5v") => pin(id, label, ["power"], voltage);
const gnd = (id: string, label = "GND") => pin(id, label, ["ground"]);
const dig = (id: string, label = id) => pin(id, label, ["digital"]);
const ana = (id: string, label = id) => pin(id, label, ["analog", "digital"]);
const i2c = (id: string, label = id) => pin(id, label, ["digital", "i2c"]);
const spi = (id: string, label = id) => pin(id, label, ["digital", "spi"]);
const uart = (id: string, label = id) => pin(id, label, ["digital", "uart"]);

/** Digital pins D<from>..D<to> on an Arduino-style board. */
function digRange(from: number, to: number): CatalogPin[] {
  const out: CatalogPin[] = [];
  for (let n = from; n <= to; n++) out.push(dig(`D${n}`));
  return out;
}

/* ------------------------------ electrical presets ------------------------------ */

const out3v3: PinElectrical = {
  source: { nominal: 3.3, min: 3.15, max: 3.45 },
  accepts: { min: 3.0, max: 3.6 },
};
const out5v: PinElectrical = {
  source: { nominal: 5, min: 4.5, max: 5.25 },
  accepts: { min: 4.5, max: 5.5 },
};
/** An unregulated or regulated input that tolerates a range (VIN / RAW style pins). */
const vinRange = (min: number, max: number, nominal = max < 9 ? max : 7): PinElectrical => ({
  source: { nominal, min, max },
  accepts: { min, max },
});

const ARDUINO_5V: PartElectrical = {
  logic: "5v",
  fiveVTolerantIo: true,
  pins: {
    "5V": out5v,
    "3V3": { source: { nominal: 3.3, min: 3.2, max: 3.4 } },
    VIN: vinRange(7, 12),
  },
};

const ESP32_3V3 = (extra: Record<string, PinElectrical> = {}): PartElectrical => ({
  logic: "3v3",
  fiveVTolerantIo: false,
  pins: { "3V3": out3v3, ...extra },
});

/** 3.3 V board with two 3V3 pins (ids 3V3.1 and 3V3.2). */
const TWO_3V3 = (extra: Record<string, PinElectrical> = {}): PartElectrical => ({
  logic: "3v3",
  fiveVTolerantIo: false,
  pins: { "3V3.1": out3v3, "3V3.2": out3v3, ...extra },
});

/* ------------------------------ the boards ------------------------------ */

const baseBoards: CatalogPart[] = [
  /* ---------- Arduino family ---------- */
  {
    id: "board.arduino.leonardo",
    name: "Arduino Leonardo",
    kind: "board",
    description:
      "An Uno-shaped Arduino built on the ATmega32U4 chip (5 V logic, 16 MHz). Unlike the Uno, the chip handles USB itself, so the board can pretend to be a keyboard or mouse. It has D0-D13, analog pins A0-A5, 5V, 3.3V, GND and VIN power pins and a micro-USB port. D13 drives the built-in LED. I2C is on D2 (SDA) and D3 (SCL), NOT on A4/A5 as on the Uno. D0/D1 are a hardware serial port that is separate from the USB serial. SPI is only on the ICSP header in the middle of the board, not on D10-D13.",
    photoCaption:
      "Arduino Leonardo: Uno-sized blue board with a micro-USB port, DC barrel jack and two long female headers.",
    identify:
      "Looks like an Uno (about 6.9 x 5.3 cm, two long headers, black DC jack) but the USB connector is micro-USB and the main chip is a small square ATmega32U4. The silkscreen says LEONARDO. Leonardo clones exist and may use USB-C.",
    variants: [
      {
        label: "Leonardo (this guide)",
        detail: "ATmega32U4, 5 V logic. Uno shield footprint, but some shields that rely on the Uno's SPI pins D10-D13 or I2C on A4/A5 need adapting.",
        matchesGuide: true,
      },
      { label: "Leonardo ETH", detail: "Same chip with an Ethernet port; different pin usage. Check the label." },
      { label: "Pro Micro clones", detail: "Smaller boards using the same chip. They are not the same layout; check the pinout of your board." },
    ],
    watchOuts: [
      "5 V logic: its pins output 5 V and can damage 3.3 V-only modules. Use a level shifter or divider when a 3.3 V part's input is driven by this board.",
      "I2C is on D2 (SDA) and D3 (SCL), not A4/A5. SPI parts must use the ICSP header, not D10-D13. Code written for the Uno will not work unchanged.",
      "Each pin can supply about 20 mA (40 mA absolute max). Use a resistor with LEDs and never power a motor or relay directly from a pin.",
      "The USB port is part of the main chip: the serial monitor only opens after the sketch starts, and a sketch that crashes USB can make the port disappear. Double-tap the reset button to enter the bootloader and re-upload.",
      "The VIN pin wants about 7-12 V. The 5V pin is a 5 V output when powered by USB or VIN; do not feed 9 V into it.",
    ],
    photoHint: "arduino-leonardo",
    pins: [
      uart("D0", "D0 (RX)"),
      uart("D1", "D1 (TX)"),
      i2c("D2", "D2 (SDA)"),
      i2c("D3", "D3 (SCL)"),
      ...digRange(4, 13),
      ana("A0"),
      ana("A1"),
      ana("A2"),
      ana("A3"),
      ana("A4"),
      ana("A5"),
      power("5V", "5V", "5v"),
      power("3V3", "3.3V", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      gnd("GND.3"),
      power("VIN", "VIN", "5v"),
    ],
  },
  {
    id: "board.arduino.promini.5v",
    name: "Arduino Pro Mini 5V 16MHz",
    kind: "board",
    description:
      "A very small, cheap Arduino (ATmega328P, 5 V logic, 16 MHz) with NO USB port: you upload code through a separate USB-to-serial adapter (an 'FTDI' programmer, CP2102 or CH340 on the 6-pin header at one end). Pins: D2-D13, TXO (D1) and RXI (D0), A0-A3, A4/A5 (also I2C SDA/SCL), A6 and A7 (analog input only), RAW, VCC, GND and RST. Power it with 5-12 V on RAW, or a clean 5 V straight into VCC. The pins on this board are the same as the Uno's for most sketches.",
    photoCaption:
      "Arduino Pro Mini: tiny flat board with the ATmega328P, a six-pin programming header at one end and pin rows along the sides.",
    identify:
      "Tiny board (about 3.3 x 1.8 cm) with no USB connector: a 6-pin header (labelled DTR, TXO, RXI, VCC, GND, GND/BLK) at one end and rows of pins/pads along the sides. Check the text printed on the board: 5V/16MHz or 3.3V/8MHz. They look almost identical, and the voltage is often only printed in small letters or on the regulator.",
    variants: [
      {
        label: "5V / 16 MHz (this guide)",
        detail: "ATmega328P at 5 V and 16 MHz. Same speed and voltage as an Uno. Pick Arduino Pro or Pro Mini, ATmega328P (5V, 16 MHz) in the IDE.",
        matchesGuide: true,
      },
      {
        label: "3.3V / 8 MHz",
        detail: "Same board with a 3.3 V regulator and an 8 MHz crystal. Its pins output 3.3 V. Not what this guide describes: the RAW and VCC voltages and the code settings differ. Choose a programmer set to 3.3 V for it.",
      },
      {
        label: "Pro Micro",
        detail: "A different board (ATmega32U4 with USB). Lookalike name; the pinout is not the same.",
      },
    ],
    watchOuts: [
      "There is no USB port. Use a USB-to-serial adapter (FTDI, CP2102 or CH340) with the voltage jumper set to match the board: 5 V adapter for the 5V board, 3.3 V for the 3.3V board. Line up the GND/BLK-marked pin of the adapter with the BLK/GND pin on the board, because a flipped plug swaps power and ground.",
      "Mixing up the 3.3 V/8 MHz and 5 V/16 MHz versions is the most common mistake: check the printed text before applying power. Never feed more than about 5.5 V into VCC.",
      "RAW goes through the regulator (about 5-12 V). VCC is the regulated 5 V rail: you can power the board from a clean 5 V supply on VCC, but not from a battery above 5.5 V.",
      "5 V logic: do not connect 3.3 V-only module inputs without a level shifter. Pins give about 20 mA each (40 mA absolute max), so use resistors with LEDs and a transistor for motors or relays.",
      "A6 and A7 can only be analog inputs, not digital pins. The DTR pin of the header is wired to reset through a capacitor so the IDE can reset the board before upload; if upload fails check that DTR is connected.",
    ],
    photoHint: "arduino-pro-mini",
    pins: [
      uart("D0", "RXI / D0"),
      uart("D1", "TXO / D1"),
      ...digRange(2, 9),
      spi("D10"),
      spi("D11"),
      spi("D12"),
      spi("D13"),
      ana("A0"),
      ana("A1"),
      ana("A2"),
      ana("A3"),
      pin("A4", "A4 (SDA)", ["analog", "digital", "i2c"]),
      pin("A5", "A5 (SCL)", ["analog", "digital", "i2c"]),
      pin("A6", "A6", ["analog"]),
      pin("A7", "A7", ["analog"]),
      power("RAW", "RAW", "5v"),
      power("VCC", "VCC", "5v"),
      gnd("GND.1"),
      gnd("GND.2"),
      gnd("GND.3"),
    ],
  },
  {
    id: "board.arduino.micro",
    name: "Arduino Micro",
    kind: "board",
    description:
      "A small breadboard-friendly Arduino (ATmega32U4, 5 V logic, 16 MHz) with a micro-USB port that the chip handles itself, so it can act as a USB keyboard or mouse. It is about 4.8 x 1.8 cm with two rows of pins that fit a breadboard. Pins: D0-D13, A0-A5, 5V, 3.3V, GND and VIN. D13 drives the built-in LED. I2C is on D2 (SDA) and D3 (SCL), not A4/A5. SPI lives on the ICSP header and the SPI pins printed on the board, so check the pinout printed on your board before wiring SPI parts.",
    photoCaption:
      "Arduino Micro: narrow board with a micro-USB port, the ATmega32U4 chip and two rows of breadboard-spaced pins.",
    identify:
      "Narrow, thin board with a micro-USB port at one end, a small square ATmega32U4 chip, a reset button, and the word MICRO on the silkscreen. Looks like a Nano but the Nano has a different USB socket and chip. The Pro Micro is a similar but different, cheaper board.",
    variants: [
      {
        label: "Arduino Micro (this guide)",
        detail: "Official board, ATmega32U4, 5 V logic.",
        matchesGuide: true,
      },
      {
        label: "Pro Micro (SparkFun-style clones)",
        detail: "Cheaper board with the same chip but a different pin layout and no 3.3 V or VIN pin in the same places. Check its own pinout before using this guide.",
      },
      { label: "Pro Micro 3.3V/8MHz", detail: "Runs at 3.3 V and 8 MHz; needs a different board setting and 3.3 V logic. Check the label." },
    ],
    watchOuts: [
      "5 V logic: pins output 5 V and can damage 3.3 V-only parts. Pins give about 20 mA (40 mA absolute max); use resistors with LEDs and a transistor for motors and relays.",
      "I2C is on D2 (SDA) and D3 (SCL), not A4/A5. Uno code that assumes the Uno's I2C or SPI pins needs changing.",
      "USB is handled by the main chip, so a crashed sketch can make the port disappear; press the reset button twice quickly to enter the bootloader and re-upload.",
      "The board is very narrow and plugs into a breadboard with only one free hole row per side; solder pin headers and test fit before wiring.",
      "VIN needs about 7-12 V. The 5V pin is a 5 V output when powered by USB or VIN; do not feed 9 V into it.",
    ],
    photoHint: "arduino-micro",
    pins: [
      uart("D0", "D0 (RX)"),
      uart("D1", "D1 (TX)"),
      i2c("D2", "D2 (SDA)"),
      i2c("D3", "D3 (SCL)"),
      ...digRange(4, 13),
      ana("A0"),
      ana("A1"),
      ana("A2"),
      ana("A3"),
      ana("A4"),
      ana("A5"),
      power("5V", "5V", "5v"),
      power("3V3", "3.3V", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      power("VIN", "VIN", "5v"),
    ],
  },
  {
    id: "board.arduino.nano.every",
    name: "Arduino Nano Every",
    kind: "board",
    description:
      "A Nano-shaped Arduino with the newer ATmega4809 chip (5 V logic, 20 MHz) and a micro-USB port. Same 30-pin outline as the classic Nano: D0-D13, analog pins A0-A7 (A6 and A7 are analog inputs only), 5V, GND and VIN. D13 drives the built-in LED; A4 (SDA) and A5 (SCL) are the I2C pins. It needs the 'Arduino megaAVR' board package in the IDE, and some libraries written for the classic Nano may not work. The 3.3 V pin supplies only small loads; check the pinout printed on your board before drawing current from it.",
    photoCaption:
      "Arduino Nano Every: tiny board with a micro-USB port at one end and two rows of pins.",
    identify:
      "Looks like a classic Nano (about 4.5 x 1.8 cm) but the chip is a small square ATmega4809 and the silkscreen says NANO EVERY. The classic Nano has an FTDI/CH340 chip and a mini-USB socket in most cases; the Every has a micro-USB socket and no separate USB chip.",
    variants: [
      {
        label: "Nano Every (this guide)",
        detail: "ATmega4809, 5 V logic. Needs the megaAVR board package.",
        matchesGuide: true,
      },
      { label: "Classic Nano", detail: "ATmega328P; different chip, different libraries compatibility." },
      { label: "Nano 33 IoT / BLE", detail: "3.3 V boards; wrong voltage for this guide." },
    ],
    watchOuts: [
      "5 V logic: its pins output 5 V and can damage 3.3 V-only parts. Use resistors with LEDs and never power a motor or relay straight from a pin (about 20 mA per pin).",
      "Libraries that use AVR timers or registers directly (some LED strip, IR or servo libraries) may not work on the ATmega4809. Check that the library says it supports megaAVR or Nano Every.",
      "A6 and A7 are analog-only. Pick board 'Arduino Nano Every' (not Nano) in the IDE or upload will fail.",
      "VIN needs about 7-12 V (check the label on your board). Do not feed 9 V into the 5V pin.",
    ],
    photoHint: "arduino-nano-every",
    pins: [
      uart("D0", "D0 (RX)"),
      uart("D1", "D1 (TX)"),
      ...digRange(2, 13),
      ana("A0"),
      ana("A1"),
      ana("A2"),
      ana("A3"),
      pin("A4", "A4 (SDA)", ["analog", "digital", "i2c"]),
      pin("A5", "A5 (SCL)", ["analog", "digital", "i2c"]),
      pin("A6", "A6", ["analog"]),
      pin("A7", "A7", ["analog"]),
      power("5V", "5V", "5v"),
      power("3V3", "3.3V", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      power("VIN", "VIN", "5v"),
    ],
  },

  /* ---------- ESP32 / ESP8266 family ---------- */
  {
    id: "board.esp32.s3.devkitc1",
    name: "ESP32-S3-DevKitC-1",
    kind: "board",
    description:
      "Espressif's official ESP32-S3 development board: a dual-core 3.3 V microcontroller with Wi-Fi and Bluetooth LE, two USB-C ports (one labelled UART, one labelled USB) and a pin header on each long side. Power it from either USB-C port or feed 5 V into the 5V pin; the 3V3 pins are 3.3 V OUTPUTS. GPIO pins are named by number (GPIO4, GPIO5...). The Arduino default I2C pins are GPIO8 (SDA) and GPIO9 (SCL), but most pins can be reassigned in software. The built-in RGB LED is on a board-specific pin; check your board's silkscreen.",
    photoCaption:
      "ESP32-S3-DevKitC-1: dark green board with a shielded ESP32-S3 module at one end, two USB-C ports and two header rows.",
    identify:
      "Board about 6.9 x 2.8 cm with a metal-shielded module marked ESP32-S3-WROOM-1 (or -N8R8 etc.) and a printed antenna, two USB-C connectors at the bottom end (one marked UART, one marked USB), RESET and BOOT buttons, and 22 pins down each side. Third-party clones with the same name exist; the pin order is nearly identical.",
    variants: [
      {
        label: "DevKitC-1 (this guide)",
        detail: "ESP32-S3 with Wi-Fi and Bluetooth LE. Module options (N8, N16R8...) change flash and RAM, not the pin labels you wire to.",
        matchesGuide: true,
      },
      { label: "DevKitC-1U", detail: "Same board with an external antenna connector instead of the printed antenna." },
      { label: "ESP32 DevKit V1", detail: "The older ESP32; different chip and different pin names." },
      { label: "N16R8 / octal PSRAM modules", detail: "These modules use GPIO35, GPIO36 and GPIO37 for the memory. Do not use those pins." },
    ],
    watchOuts: [
      "3.3 V logic only. Do not feed 5 V into a GPIO. A pin can safely supply only about 20 mA, so LEDs need a resistor and motors, relays or buzzers must be switched through a transistor or driver.",
      "Some pins are reserved: GPIO19 and GPIO20 are the USB data lines, GPIO26-GPIO32 run the flash, and on octal-PSRAM modules (R8) GPIO35-GPIO37 are used too. Avoid them. Strapping pins GPIO0, GPIO3, GPIO45 and GPIO46 affect boot; do not hold them with a button or sensor at power-up.",
      "Two USB-C ports: the one marked UART goes through a USB-serial chip (always works for upload and serial monitor). The one marked USB is the chip's native USB; it needs 'USB CDC On Boot' enabled to see Serial output in the Arduino IDE.",
      "Analog reads on ADC2 pins (GPIO11-GPIO20) do not work while Wi-Fi is on. Use GPIO1-GPIO10 (ADC1) for analog sensors with Wi-Fi.",
      "If the board will not enter upload mode, hold BOOT, tap RESET and then release BOOT.",
    ],
    photoHint: "esp32-s3-devkitc",
    pins: [
      power("5V", "5V", "5v"),
      power("3V3.1", "3V3", "3v3"),
      power("3V3.2", "3V3", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      gnd("GND.3"),
      dig("EN", "RST (EN)"),
      ana("GPIO1"),
      ana("GPIO2"),
      ana("GPIO4"),
      ana("GPIO5"),
      ana("GPIO6"),
      ana("GPIO7"),
      pin("GPIO8", "GPIO8 (SDA)", ["analog", "digital", "i2c"]),
      pin("GPIO9", "GPIO9 (SCL)", ["analog", "digital", "i2c"]),
      pin("GPIO10", "GPIO10 (CS)", ["analog", "digital", "spi"]),
      pin("GPIO11", "GPIO11 (MOSI)", ["digital", "spi"]),
      pin("GPIO12", "GPIO12 (SCK)", ["digital", "spi"]),
      pin("GPIO13", "GPIO13 (MISO)", ["digital", "spi"]),
      dig("GPIO14"),
      dig("GPIO15"),
      dig("GPIO16"),
      dig("GPIO17"),
      dig("GPIO18"),
      dig("GPIO21"),
      dig("GPIO38"),
      dig("GPIO39"),
      dig("GPIO40"),
      dig("GPIO41"),
      dig("GPIO42"),
      dig("GPIO47"),
      uart("TX", "TX (GPIO43)"),
      uart("RX", "RX (GPIO44)"),
    ],
  },
  {
    id: "board.esp32.c3.devkitm1",
    name: "ESP32-C3-DevKitM-1",
    kind: "board",
    description:
      "Espressif's official ESP32-C3 development board: a single-core RISC-V 3.3 V microcontroller with Wi-Fi and Bluetooth LE on a small board with a micro-USB port. Pins: GPIO0-GPIO10 and the serial pins TX (GPIO21) and RX (GPIO20), a 5V pin, 3V3, GND and RST. Power it from micro-USB or the 5V pin; 3V3 is an OUTPUT. The Arduino default I2C pins are GPIO8 (SDA) and GPIO9 (SCL), but GPIO8 and GPIO9 are boot-strapping pins, so other pins such as GPIO4 and GPIO5 are friendlier choices for I2C if you remap it. Default SPI is GPIO4 (SCK), GPIO5 (MISO), GPIO6 (MOSI), GPIO7 (CS). The onboard RGB LED is on a board-specific pin; check the silkscreen.",
    photoCaption:
      "ESP32-C3-DevKitM-1: small board with a micro-USB port, a shielded ESP32-C3-MINI module and header pins on both long sides.",
    identify:
      "Small board (about 5.4 x 2.5 cm) with a micro-USB port, a small metal-shielded ESP32-C3-MINI-1 module with a printed antenna, BOOT and RST buttons and a pin header on each side. Clones with a similar name or USB-C exist. The C3 SuperMini is a much smaller, different board.",
    variants: [
      {
        label: "DevKitM-1 (this guide)",
        detail: "ESP32-C3-MINI-1 module with micro-USB. Pin names printed on the board are GPIO numbers.",
        matchesGuide: true,
      },
      { label: "ESP32-C3-DevKitC-02", detail: "Larger C3 board with a USB-C port; similar but not identical pin order. Check the pinout on your board." },
      { label: "ESP32-C3 SuperMini", detail: "Tiny board with its own pin order; see its own entry." },
    ],
    watchOuts: [
      "3.3 V logic only. Do not feed 5 V into any GPIO. A pin supplies about 20 mA at most, so use a resistor with LEDs and a transistor for motors, relays or buzzers.",
      "GPIO2, GPIO8 and GPIO9 are strapping pins that set the boot mode. Avoid holding them high or low with a button or sensor at power-up. GPIO9 is the BOOT button. GPIO18 and GPIO19 are the USB data lines.",
      "ADC2 (GPIO5) analog reads do not work while Wi-Fi is on. GPIO0-GPIO4 can read analog values.",
      "For serial output over the USB port, enable 'USB CDC On Boot' in the Arduino IDE, depending on how your board is set up.",
    ],
    photoHint: "esp32-c3-devkitm",
    pins: [
      power("5V", "5V", "5v"),
      power("3V3", "3V3", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      dig("RST"),
      ana("GPIO0"),
      ana("GPIO1"),
      ana("GPIO2"),
      ana("GPIO3"),
      pin("GPIO4", "GPIO4 (SCK)", ["analog", "digital", "spi"]),
      pin("GPIO5", "GPIO5 (MISO)", ["analog", "digital", "spi"]),
      pin("GPIO6", "GPIO6 (MOSI)", ["digital", "spi"]),
      pin("GPIO7", "GPIO7 (CS)", ["digital", "spi"]),
      pin("GPIO8", "GPIO8 (SDA)", ["digital", "i2c"]),
      pin("GPIO9", "GPIO9 (SCL)", ["digital", "i2c"]),
      dig("GPIO10"),
      uart("TX", "TX (GPIO21)"),
      uart("RX", "RX (GPIO20)"),
    ],
  },
  {
    id: "board.esp32.c3.supermini",
    name: "ESP32-C3 SuperMini",
    kind: "board",
    description:
      "A very small, cheap ESP32-C3 board (RISC-V, 3.3 V logic, Wi-Fi and Bluetooth LE) with a USB-C port, about 2.3 x 1.8 cm. Pins: GPIO0-GPIO10 plus TX (GPIO21) and RX (GPIO20), 5V, 3V3 and GND. The 5V pin is connected to USB and can also take a 5 V supply; 3V3 is an OUTPUT. The blue LED is on GPIO8 and the BOOT button on GPIO9. Common Arduino defaults are SDA = GPIO8, SCL = GPIO9 and SPI on GPIO4-GPIO7, but any pins can be remapped; check the pinout printed on your board.",
    photoCaption:
      "ESP32-C3 SuperMini: tiny board with a USB-C port, a small shielded module and header pads along both long sides.",
    identify:
      "Fingertip-sized board (about 2.3 x 1.8 cm) with a USB-C port, a tiny metal-shielded ESP32-C3 module with a printed antenna, two buttons (RST and BOOT) and 8 pads on each long side. Not the same as the larger DevKitM-1, and not the XIAO ESP32-C3; pin names and positions differ.",
    variants: [
      {
        label: "SuperMini (this guide)",
        detail: "Tiny ESP32-C3 board with USB-C. Many sellers; pin positions are nearly identical but boards vary slightly.",
        matchesGuide: true,
      },
      { label: "ESP32-C3 DevKitM-1", detail: "Larger official board with micro-USB; see its own entry." },
      { label: "XIAO ESP32-C3", detail: "Seeed's tiny board with its own pin names D0-D10; see its own entry." },
    ],
    watchOuts: [
      "3.3 V logic only. Do not feed 5 V into a GPIO. A pin supplies about 20 mA at most, so use a resistor with LEDs and a transistor for motors or relays.",
      "GPIO2, GPIO8 and GPIO9 are boot-strapping pins: GPIO9 is the BOOT button and GPIO8 drives the blue LED. Avoid holding them with a sensor or button at power-up. GPIO18 and GPIO19 are the USB data lines.",
      "Serial output over USB needs 'USB CDC On Boot' enabled in the Arduino IDE. To upload, hold BOOT while plugging the board in if it is not detected.",
      "Many SuperMini boards have a weak Wi-Fi antenna that gets unstable if the transmit power is too high; if Wi-Fi keeps dropping, lower the transmit power in code and keep the board away from metal.",
      "The pads are tiny and usually come without header pins. Solder headers before using a breadboard.",
    ],
    photoHint: "esp32-c3-supermini",
    pins: [
      power("5V", "5V", "5v"),
      power("3V3", "3V3", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      ana("GPIO0"),
      ana("GPIO1"),
      ana("GPIO2"),
      ana("GPIO3"),
      pin("GPIO4", "GPIO4 (SCK)", ["analog", "digital", "spi"]),
      pin("GPIO5", "GPIO5 (MISO)", ["analog", "digital", "spi"]),
      pin("GPIO6", "GPIO6 (MOSI)", ["digital", "spi"]),
      pin("GPIO7", "GPIO7 (CS)", ["digital", "spi"]),
      pin("GPIO8", "GPIO8 (SDA, LED)", ["digital", "i2c"]),
      pin("GPIO9", "GPIO9 (SCL, BOOT)", ["digital", "i2c"]),
      dig("GPIO10"),
      uart("TX", "TX (GPIO21)"),
      uart("RX", "RX (GPIO20)"),
    ],
  },
  {
    id: "board.esp32.cam",
    name: "ESP32-CAM (AI-Thinker)",
    kind: "board",
    description:
      "A tiny ESP32 board (3.3 V logic, Wi-Fi and Bluetooth) with an OV2640 camera, a microSD card slot and a very bright flash LED, popular for Wi-Fi cameras. It has NO USB port: you program it through an FTDI/USB-serial adapter (3.3 V logic) or a plug-in ESP32-CAM-MB base board. It needs a stable 5 V supply (a good 5 V pin source of at least 500 mA, ideally 1 A or more). The camera ribbon is built in. Free pins are few: GPIO2, 4, 12, 13, 14 and 15 are shared with the SD card; GPIO16 is used by the PSRAM memory.",
    photoCaption:
      "ESP32-CAM: small board with a camera module on the front, an antenna side, a microSD slot underneath and eight pins on each side.",
    identify:
      "Board about 2.7 x 4 cm with an ESP32-S module, a small camera (OV2640) on the front, a microSD slot on the back, a tiny ceramic or printed antenna, and eight pins along each long edge. The silkscreen shows 5V, 3V3, GND, GPIO numbers (IO0, IO2, IO12 ...) and U0R / U0T. It is sold with or without the ESP32-CAM-MB USB base board.",
    variants: [
      {
        label: "ESP32-CAM AI-Thinker (this guide)",
        detail: "ESP32 with OV2640 camera and microSD. No USB on the board itself.",
        matchesGuide: true,
      },
      { label: "ESP32-CAM-MB base board", detail: "A small USB board with a CH340 chip that the ESP32-CAM plugs into. It gives you USB programming without wiring." },
      { label: "ESP32-S3 camera boards", detail: "Different boards with different pins and often a USB port; not covered by this entry." },
    ],
    watchOuts: [
      "Power: the 5V pin needs a solid 5 V supply that can give at least 500 mA, preferably 1 A. A weak USB-serial adapter or long thin wires cause brown-outs and random resets while the camera or Wi-Fi is active.",
      "To upload code, connect GPIO0 (IO0) to GND, then press RESET or power the board. Remove the IO0-to-GND link and press reset again to run the sketch. Use a 3.3 V USB-serial adapter for the U0R/U0T lines.",
      "3.3 V logic only. Connect the adapter's TX to U0R and RX to U0T (crossed). Do not feed 5 V into a GPIO. The VCC pin beside U0R is 3.3 V or 5 V depending on a solder jumper; leave it unconnected unless you know your board.",
      "Few free pins: GPIO12 must be LOW at boot. GPIO4 also drives the flash LED and GPIO16 is used by the PSRAM. The camera uses many pins internally, so do not wire anything to GPIOs that are not printed on the header.",
      "Wi-Fi range depends on the antenna; boards with an external connector need the small jumper resistor moved. Check your board.",
    ],
    photoHint: "esp32-cam",
    pins: [
      power("5V", "5V", "5v"),
      power("3V3", "3V3", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      gnd("GND.3"),
      pin("IO0", "IO0 (flash)", ["digital"]),
      dig("IO2"),
      dig("IO4"),
      dig("IO12"),
      dig("IO13"),
      pin("IO14", "IO14 (SDA)", ["digital", "i2c"]),
      pin("IO15", "IO15 (SCL)", ["digital", "i2c"]),
      uart("U0R", "U0R (RX)"),
      uart("U0T", "U0T (TX)"),
    ],
  },
  {
    id: "board.esp8266.d1mini",
    name: "Wemos / LOLIN D1 Mini (ESP8266)",
    kind: "board",
    description:
      "A tiny Wi-Fi board (ESP8266, 3.3 V logic, 4 MB flash, no Bluetooth) with a micro-USB port and 8 pins on each side. Pins: D0-D8 (not the same as the chip's GPIO numbers: D1 = GPIO5, D2 = GPIO4), A0 (the only analog input, 0 to 3.3 V on this board), TX, RX, RST, 3V3 (OUTPUT), 5V and G (ground). I2C is D2 (SDA) and D1 (SCL); SPI is D5 (SCK), D6 (MISO), D7 (MOSI) and D8 (CS). The built-in blue LED is on D4 and is on when D4 is LOW. Many 'shields' stack onto it.",
    photoCaption:
      "Wemos D1 Mini: tiny square board with a shielded ESP-12 module, a micro-USB port and eight pins on each side.",
    identify:
      "Small board (about 3.4 x 2.5 cm) with a micro-USB port, a metal-shielded ESP8266 module with a printed antenna, a small CH340 chip and eight pins on each side, labelled RST A0 D0 D5 D6 D7 D8 3V3 on one side and TX RX D1 D2 D3 D4 G 5V on the other. Often called D1 Mini, Wemos D1 mini or LOLIN D1 mini; there are D1 Mini Pro and D1 Mini Lite variants.",
    variants: [
      {
        label: "D1 Mini (this guide)",
        detail: "ESP8266, 4 MB flash, CH340 USB. Many clones with identical pins.",
        matchesGuide: true,
      },
      { label: "D1 Mini Pro", detail: "More flash and an external antenna socket; same pin names." },
      { label: "D1 Mini Lite", detail: "Smaller flash (ESP8285); mostly the same pins. Check the label." },
      { label: "D1 Mini ESP32", detail: "A different board with an ESP32 chip; pins and code differ." },
    ],
    watchOuts: [
      "3.3 V logic only: do not connect 5 V signals to pins. Each pin gives about 12 mA safely, so use a resistor with LEDs and a transistor for motors or relays.",
      "Boot pins: D3 (GPIO0) and D4 (GPIO2) must be HIGH and D8 (GPIO15) LOW at start-up or the board won't boot. Don't hold them with buttons or sensors. D0 (GPIO16) has no PWM or I2C.",
      "A0 reads about 0 to 3.3 V on the D1 Mini (a divider is on the board); a bare ESP8266 chip handles only 1 V. Check your board before wiring a 3.3 V sensor.",
      "The 5V pin is connected to USB 5 V. It can also be used as an input from a 5 V supply; the 3V3 pin is the regulator output and is for small loads.",
      "The CH340 USB chip needs a driver on some computers.",
    ],
    photoHint: "wemos-d1-mini",
    pins: [
      power("5V", "5V", "5v"),
      power("3V3", "3V3", "3v3"),
      gnd("GND", "G"),
      dig("RST"),
      ana("A0"),
      dig("D0"),
      pin("D1", "D1 (SCL)", ["digital", "i2c"]),
      pin("D2", "D2 (SDA)", ["digital", "i2c"]),
      dig("D3"),
      dig("D4"),
      pin("D5", "D5 (SCK)", ["digital", "spi"]),
      pin("D6", "D6 (MISO)", ["digital", "spi"]),
      pin("D7", "D7 (MOSI)", ["digital", "spi"]),
      pin("D8", "D8 (CS)", ["digital", "spi"]),
      uart("TX"),
      uart("RX"),
    ],
  },

  /* ---------- Raspberry Pi family ---------- */
  {
    id: "board.pi.zero.2w",
    name: "Raspberry Pi Zero 2 W",
    kind: "board",
    description:
      "A tiny Linux computer (not a microcontroller) with a quad-core 64-bit chip, 512 MB RAM, Wi-Fi and Bluetooth. It has a 40-pin GPIO header (3.3 V logic; the header is often NOT soldered), a micro-SD slot, a mini-HDMI port, a camera connector and two micro-USB ports (one for data, one marked PWR for power). Header pins are named by their physical number and BCM GPIO name: pins 1 and 17 are 3.3 V, pins 2 and 4 are 5 V, and several are GND. I2C is GPIO2 (SDA) and GPIO3 (SCL), UART is GPIO14 (TX) and GPIO15 (RX), SPI is GPIO10 (MOSI), GPIO9 (MISO), GPIO11 (SCLK), GPIO8 (CE0). There are no analog inputs.",
    photoCaption:
      "Raspberry Pi Zero 2 W: tiny green board with a mini-HDMI port, two micro-USB ports, a micro-SD slot and a 40-pin footprint.",
    identify:
      "Board about 6.5 x 3 cm labelled Raspberry Pi Zero 2 W with a micro-SD slot, mini-HDMI and two micro-USB ports. Same size and layout as the older Zero W, so read the silkscreen to tell them apart. The 'WH' versions have the 40-pin header soldered.",
    variants: [
      {
        label: "Zero 2 W (this guide)",
        detail: "Quad-core, Wi-Fi + Bluetooth, same size and GPIO layout as the Zero W. Header usually not soldered.",
        matchesGuide: true,
      },
      { label: "Zero 2 WH", detail: "Same board with the header pre-soldered." },
      { label: "Zero W / WH", detail: "Older single-core version with the same pin layout." },
    ],
    watchOuts: [
      "GPIO pins are 3.3 V only and NOT 5 V tolerant. Each pin gives only a few mA to about 16 mA, so use a resistor with LEDs and never drive motors or relays from a pin.",
      "It is a full computer: it needs a micro-SD card with the operating system and a good 5 V power supply (around 2.5 A is recommended) into the micro-USB port marked PWR. Shut it down properly before removing power.",
      "GPIO2 and GPIO3 already have 1.8 kΩ pull-up resistors on the board, so use them for I2C only. I2C, SPI and serial must be enabled in the Raspberry Pi settings first.",
      "The header is often not soldered; you must solder it yourself or buy the WH version.",
      "Pins are counted by physical position (pin 1 is the square pad near the SD card end). Mixing up BCM and physical numbers is a common mistake.",
    ],
    photoHint: "pi-zero-2w",
    pins: [
      power("3V3.1", "3V3 (pin 1)", "3v3"),
      power("3V3.2", "3V3 (pin 17)", "3v3"),
      power("5V.1", "5V (pin 2)", "5v"),
      power("5V.2", "5V (pin 4)", "5v"),
      gnd("GND.6", "GND (pin 6)"),
      gnd("GND.9", "GND (pin 9)"),
      gnd("GND.14", "GND (pin 14)"),
      gnd("GND.20", "GND (pin 20)"),
      gnd("GND.25", "GND (pin 25)"),
      gnd("GND.30", "GND (pin 30)"),
      gnd("GND.34", "GND (pin 34)"),
      gnd("GND.39", "GND (pin 39)"),
      i2c("GPIO2", "GPIO2 SDA (pin 3)"),
      i2c("GPIO3", "GPIO3 SCL (pin 5)"),
      dig("GPIO4", "GPIO4 (pin 7)"),
      uart("GPIO14", "GPIO14 TXD (pin 8)"),
      uart("GPIO15", "GPIO15 RXD (pin 10)"),
      dig("GPIO17", "GPIO17 (pin 11)"),
      dig("GPIO18", "GPIO18 (pin 12)"),
      dig("GPIO27", "GPIO27 (pin 13)"),
      dig("GPIO22", "GPIO22 (pin 15)"),
      dig("GPIO23", "GPIO23 (pin 16)"),
      dig("GPIO24", "GPIO24 (pin 18)"),
      spi("GPIO10", "GPIO10 MOSI (pin 19)"),
      spi("GPIO9", "GPIO9 MISO (pin 21)"),
      dig("GPIO25", "GPIO25 (pin 22)"),
      spi("GPIO11", "GPIO11 SCLK (pin 23)"),
      spi("GPIO8", "GPIO8 CE0 (pin 24)"),
      spi("GPIO7", "GPIO7 CE1 (pin 26)"),
      dig("GPIO5", "GPIO5 (pin 29)"),
      dig("GPIO6", "GPIO6 (pin 31)"),
      dig("GPIO12", "GPIO12 (pin 32)"),
      dig("GPIO13", "GPIO13 (pin 33)"),
      dig("GPIO19", "GPIO19 (pin 35)"),
      dig("GPIO16", "GPIO16 (pin 36)"),
      dig("GPIO26", "GPIO26 (pin 37)"),
      dig("GPIO20", "GPIO20 (pin 38)"),
      dig("GPIO21", "GPIO21 (pin 40)"),
    ],
  },

  /* ---------- Raspberry Pi Pico family ---------- */
  {
    id: "board.pico.2w",
    name: "Raspberry Pi Pico 2 W",
    kind: "board",
    description:
      "The newer Pico with the RP2350 chip (dual-core, 3.3 V logic) plus Wi-Fi and Bluetooth, on a board the same shape as the original Pico with a micro-USB port and a BOOTSEL button for drag-and-drop programming (MicroPython or Arduino). Pins: GP0-GP22 and GP26-GP28 (GP26-GP28 read analog values), 3V3 (OUTPUT), VBUS (5 V from USB), VSYS (power input, about 1.8-5.5 V) and GND. Typical defaults: UART0 on GP0 (TX) and GP1 (RX), I2C0 on GP4 (SDA) and GP5 (SCL), SPI0 on GP16 (MISO), GP18 (SCK), GP19 (MOSI). Most pins can take other functions; check the pinout printed on your board for the rest. The built-in LED is wired through the wireless chip, not an ordinary GPIO.",
    photoCaption:
      "Raspberry Pi Pico 2 W: Pico-shaped board with a micro-USB port, a BOOTSEL button and a small wireless module and antenna at one end.",
    identify:
      "Narrow board about 5.1 x 2.1 cm with a micro-USB port, a white BOOTSEL button, a silver wireless module with a printed antenna and the text 'Pico 2 W' on the silkscreen. It looks the same as the Pico W, whose silkscreen says Pico W; the Pico 2 W's larger chip is marked RP2350. The 'WH' versions have headers soldered.",
    variants: [
      {
        label: "Pico 2 W (this guide)",
        detail: "RP2350 with Wi-Fi and Bluetooth LE. Usually sold without headers; the WH version has them.",
        matchesGuide: true,
      },
      { label: "Pico 2", detail: "Same chip, no wireless." },
      { label: "Pico W", detail: "Older RP2040 chip with wireless; very similar pins, different firmware." },
    ],
    watchOuts: [
      "Treat GPIO as 3.3 V only and NOT 5 V tolerant. VBUS is 5 V from USB; never connect it to a GPIO pin.",
      "GPIO pins supply only a few mA to about 12-16 mA, so use resistors with LEDs and a transistor or driver for motors, relays and buzzers.",
      "Use firmware made for the Pico 2 W (the RP2350 build), not the RP2040 Pico W build; they are different files.",
      "The built-in LED is accessed through the wireless chip, so a plain GPIO blink example may not make it flash.",
      "Many Picos come without headers; they need soldering to plug into a breadboard.",
    ],
    photoHint: "pico-2w",
    pins: [
      power("3V3", "3V3 (pin 36)", "3v3"),
      power("VBUS", "VBUS (pin 40)", "5v"),
      power("VSYS", "VSYS (pin 39)", "5v"),
      gnd("GND.3", "GND (pin 3)"),
      gnd("GND.8", "GND (pin 8)"),
      gnd("GND.13", "GND (pin 13)"),
      gnd("GND.18", "GND (pin 18)"),
      gnd("GND.23", "GND (pin 23)"),
      gnd("GND.28", "GND (pin 28)"),
      gnd("GND.33", "GND (pin 33)"),
      gnd("GND.38", "GND (pin 38)"),
      uart("GP0", "GP0 (UART TX)"),
      uart("GP1", "GP1 (UART RX)"),
      i2c("GP2"),
      i2c("GP3"),
      i2c("GP4", "GP4 (I2C0 SDA)"),
      i2c("GP5", "GP5 (I2C0 SCL)"),
      i2c("GP6"),
      i2c("GP7"),
      pin("GP8", "GP8", ["digital", "i2c", "uart"]),
      pin("GP9", "GP9", ["digital", "i2c", "uart"]),
      spi("GP10"),
      spi("GP11"),
      spi("GP12"),
      spi("GP13"),
      dig("GP14"),
      dig("GP15"),
      spi("GP16", "GP16 (SPI0 MISO)"),
      dig("GP17"),
      spi("GP18", "GP18 (SPI0 SCK)"),
      spi("GP19", "GP19 (SPI0 MOSI)"),
      dig("GP20"),
      dig("GP21"),
      dig("GP22"),
      ana("GP26", "GP26 (ADC0)"),
      ana("GP27", "GP27 (ADC1)"),
      ana("GP28", "GP28 (ADC2)"),
    ],
  },

  /* ---------- other families ---------- */
  {
    id: "board.teensy.40",
    name: "Teensy 4.0",
    kind: "board",
    description:
      "A very fast, tiny development board (NXP i.MX RT1062, ARM Cortex-M7 at 600 MHz) from PJRC with 3.3 V logic and a micro-USB port. It is about 3.6 x 1.8 cm with pins in two rows. Programming uses the Teensyduino add-on for the Arduino IDE and a small button on the board. Pins D0-D23 are on the edge (D14-D23 are also analog A0-A9); more pads are on the underside. D13 drives the built-in LED. I2C is on D18 (SDA) and D19 (SCL), SPI on D11 (MOSI), D12 (MISO), D13 (SCK) and D10 (CS), Serial1 on D0 (RX) and D1 (TX).",
    photoCaption:
      "Teensy 4.0: small dark-red board with a micro-USB port, a button and the ARM chip in the middle of two pin rows.",
    identify:
      "Small board (about 3.6 x 1.8 cm) with a micro-USB port, a small push button, a large square chip and a printed 'Teensy 4.0' on the back. The Teensy 4.1 is longer (with an SD card slot and an Ethernet header) and the older 3.x boards have a different chip. Many beginners confuse them; check the text on the board.",
    variants: [
      {
        label: "Teensy 4.0 (this guide)",
        detail: "Small 40-pin-style board with 24 pins on the edge. 3.3 V logic.",
        matchesGuide: true,
      },
      { label: "Teensy 4.1", detail: "Longer board with a microSD slot and more pins; the pin numbers on the edge differ." },
      { label: "Teensy LC / 3.x", detail: "Older boards; some 3.x pins are 5 V tolerant, the 4.x ones are not." },
    ],
    watchOuts: [
      "3.3 V logic only, and the pins are NOT 5 V tolerant. A 5 V signal on a pin can damage the chip. Use a level shifter for 5 V parts.",
      "Pins supply only a small current (check the PJRC documentation), so use resistors with LEDs and a transistor for motors, relays and buzzers.",
      "Power: VIN takes about 3.6-5.5 V. If you power VIN while USB is also plugged in, the two supplies can fight; check PJRC's power instructions (there is a pair of pads on the board that you may need to cut) before using both.",
      "You must install Teensyduino to program it. If a sketch locks up USB, press the small button on the board to re-enter the bootloader.",
      "Some pads are on the underside (D24 and higher). They are tiny; solder wires only if you are comfortable with small pads.",
    ],
    photoHint: "teensy-40",
    pins: [
      power("VIN", "VIN", "5v"),
      power("VUSB", "VUSB (5V from USB)", "5v"),
      power("3V3.1", "3V3", "3v3"),
      power("3V3.2", "3V3", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      uart("D0", "D0 (RX1)"),
      uart("D1", "D1 (TX1)"),
      ...digRange(2, 9),
      spi("D10", "D10 (CS)"),
      spi("D11", "D11 (MOSI)"),
      spi("D12", "D12 (MISO)"),
      spi("D13", "D13 (SCK, LED)"),
      ana("D14", "D14 (A0)"),
      ana("D15", "D15 (A1)"),
      ana("D16", "D16 (A2)"),
      ana("D17", "D17 (A3)"),
      pin("D18", "D18 (A4, SDA)", ["analog", "digital", "i2c"]),
      pin("D19", "D19 (A5, SCL)", ["analog", "digital", "i2c"]),
      ana("D20", "D20 (A6)"),
      ana("D21", "D21 (A7)"),
      ana("D22", "D22 (A8)"),
      ana("D23", "D23 (A9)"),
    ],
  },
  {
    id: "board.stm32.bluepill",
    name: "STM32 Blue Pill (STM32F103C8T6)",
    kind: "board",
    description:
      "A cheap development board with the STM32F103C8T6 chip (ARM Cortex-M3, 72 MHz, 3.3 V logic), usually a blue board with two rows of 20 pins and a micro-USB port. Pins are named by port: PA0-PA15, PB0-PB15, PC13-PC15. Power: 5V (USB), 3.3 (OUTPUT) and GND in several places. PC13 drives the on-board LED (it lights when PC13 is LOW). Defaults: I2C1 on PB6 (SCL) and PB7 (SDA), SPI1 on PA4 (CS), PA5 (SCK), PA6 (MISO), PA7 (MOSI), serial USART1 on PA9 (TX) and PA10 (RX). Pins PA11/PA12 (USB), PA13/PA14 (programming) and the PC14/PC15 crystal pins are left out of this list on purpose.",
    photoCaption:
      "STM32 Blue Pill: a blue board with a micro-USB port, an STM32F103 chip in the middle, a reset button and two rows of pins.",
    identify:
      "Blue board about 5.3 x 2.3 cm with a micro-USB port, a reset button, a small 4-pin SWD header, two yellow jumpers marked BOOT0 and BOOT1 and the chip marked STM32F103C8T6. Beware of look-alikes: boards sold as Blue Pill may carry a different chip (CKS32, CS32 or GD32 clones) or have a pull-up resistor of the wrong value on the USB D+ line.",
    variants: [
      {
        label: "Blue Pill (this guide)",
        detail: "STM32F103C8T6 with 64 KB listed flash (often 128 KB). 3.3 V logic.",
        matchesGuide: true,
      },
      { label: "Black Pill (STM32F411 / F401)", detail: "A newer board with a faster chip and USB-C; different pin positions and bootloader. See its own pinout." },
      { label: "Clone chips (CKS32 / CS32 / GD32)", detail: "Look like the STM32 chip but report a different ID. Some tools refuse to flash them; others work. Check the chip text." },
    ],
    watchOuts: [
      "3.3 V logic. Many pins marked FT in the datasheet tolerate 5 V, but the analog-capable pins (PA0-PA7, PB0, PB1) and the PC13-PC15 pins do not. Treat the whole board as 3.3 V-only unless you have checked the datasheet.",
      "GPIO pins supply only a few mA (check the datasheet; PC13-PC15 are even weaker), so use a resistor with LEDs and a transistor for motors, relays and buzzers.",
      "There is no ready-to-use USB bootloader on a new board. You usually flash it through an ST-Link V2 adapter (SWDIO, SWCLK, GND, 3V3) or through a USB-serial adapter on PA9/PA10 with the BOOT0 jumper moved to 1. Move the jumper back to 0 afterwards.",
      "Do not use PA13 and PA14 (they are the programming pins) or PA11 and PA12 (USB data) for other jobs, or you may lose the ability to upload.",
      "Fake or faulty boards are common: a wrong pull-up resistor (10 kΩ instead of 1.5 kΩ) on the USB D+ line stops the USB port being detected, and clone chips may not match the datasheet. Check the chip marking and 3.3 V regulator before blaming your code.",
    ],
    photoHint: "blue-pill",
    pins: [
      power("5V", "5V", "5v"),
      power("3V3.1", "3.3", "3v3"),
      power("3V3.2", "3.3", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      gnd("GND.3"),
      ana("PA0"),
      ana("PA1"),
      pin("PA2", "PA2 (USART2 TX)", ["analog", "digital", "uart"]),
      pin("PA3", "PA3 (USART2 RX)", ["analog", "digital", "uart"]),
      pin("PA4", "PA4 (SPI1 CS)", ["analog", "digital", "spi"]),
      pin("PA5", "PA5 (SPI1 SCK)", ["analog", "digital", "spi"]),
      pin("PA6", "PA6 (SPI1 MISO)", ["analog", "digital", "spi"]),
      pin("PA7", "PA7 (SPI1 MOSI)", ["analog", "digital", "spi"]),
      dig("PA8"),
      uart("PA9", "PA9 (USART1 TX)"),
      uart("PA10", "PA10 (USART1 RX)"),
      ana("PB0"),
      ana("PB1"),
      dig("PB5"),
      i2c("PB6", "PB6 (I2C1 SCL)"),
      i2c("PB7", "PB7 (I2C1 SDA)"),
      dig("PB8"),
      dig("PB9"),
      pin("PB10", "PB10 (I2C2 SCL)", ["digital", "i2c", "uart"]),
      pin("PB11", "PB11 (I2C2 SDA)", ["digital", "i2c", "uart"]),
      spi("PB12", "PB12 (SPI2 CS)"),
      spi("PB13", "PB13 (SPI2 SCK)"),
      spi("PB14", "PB14 (SPI2 MISO)"),
      spi("PB15", "PB15 (SPI2 MOSI)"),
      dig("PC13", "PC13 (LED)"),
    ],
  },
  {
    id: "board.digispark.attiny85",
    name: "Digispark ATtiny85",
    kind: "board",
    description:
      "An extremely small USB-stick board with an ATtiny85 chip (5 V logic, 16.5 MHz) and a USB-A plug etched onto the PCB itself: you plug it straight into a computer. It has only six I/O pins, P0-P5, plus 5V, GND and VIN pads. P0 is SDA, P2 is SCL, and The on-board LED is on P1 (on some versions P0). P3 and P4 are used by the USB connection, and P5 is the reset pin (usable only if the board's fuses are changed, which is risky). It uses the Digispark (Micronucleus) bootloader: start the upload, then plug the board in when asked.",
    photoCaption:
      "Digispark ATtiny85: a tiny blue or black board shaped like a USB stick, with a USB-A plug at one end, a chip and six I/O pads.",
    identify:
      "Very small board (about 2.5 x 1.9 cm) with a USB-A connector formed by the PCB edge, an 8-pin ATtiny85 chip, a small 5 V regulator, a green power LED and a row of pads labelled P0 P1 P2 P3 P4 P5, 5V, GND and VIN. There is no USB socket or cable; the board is plugged directly into a port. It is easily mistaken for a USB flash drive.",
    variants: [
      {
        label: "Digispark Rev 3 (this guide)",
        detail: "ATtiny85, USB-A edge connector. Pads P0-P5, 5V, GND, VIN.",
        matchesGuide: true,
      },
      { label: "Digispark with micro-USB / USB-C", detail: "A clone with a real USB socket and the same chip. Pins may be in a different order." },
      { label: "Digispark Pro", detail: "A larger board with an ATtiny167 and more pins." },
    ],
    watchOuts: [
      "Only six pins and very little memory (about 6 KB usable). Many Arduino sketches will not fit.",
      "Install the Digistump board support and Windows drivers first. To upload, press Upload in the IDE and plug the board in only when the IDE asks. Use a short USB port or a hub: it will not be detected through some long cables.",
      "P3 and P4 are used by USB; avoid driving them from outside while uploading. P5 (reset) can be used as an input only if the chip fuses are changed; do not wire anything important to P5.",
      "5 V logic and each pin supplies only about 20 mA. Use resistors with LEDs and a transistor for motors and relays. The 5V pin is a 5 V output when the board is powered over USB.",
      "The board waits a few seconds in the bootloader after power-up before running your program; that is normal. The VIN pad takes about 7-12 V (check the label).",
    ],
    photoHint: "digispark",
    pins: [
      power("5V", "5V", "5v"),
      power("VIN", "VIN", "5v"),
      gnd("GND"),
      pin("P0", "P0 (SDA)", ["digital", "i2c"]),
      dig("P1"),
      pin("P2", "P2 (SCL, A1)", ["analog", "digital", "i2c"]),
      ana("P3", "P3 (USB, A3)"),
      ana("P4", "P4 (USB, A2)"),
      ana("P5", "P5 (RESET, A0)"),
    ],
  },
  {
    id: "board.microbit.v2",
    name: "BBC micro:bit V2",
    kind: "board",
    description:
      "A small educational board (nRF52833 Cortex-M4 chip, 3.3 V logic, Bluetooth LE) with a 5x5 LED display, two buttons (A and B), a touch logo, a speaker, a microphone, a motion sensor and a compass, all built in. It has a micro-USB port and a 2-pin battery socket. Outside connections are an edge connector with 25 gold pads: five large pads (0, 1, 2, 3V, GND) that crocodile clips can grip, and small pads on the rest of the edge that need a breakout board. Pads P0-P2 are analog, P19 is SCL and P20 is SDA (I2C), P13 (SCK), P14 (MISO) and P15 (MOSI) are the SPI pins. Pads P3, P4, P6, P7, P9, P10 are shared with the LED display and P5/P11 with the buttons.",
    photoCaption:
      "BBC micro:bit V2: a white-and-gold square board with a 5x5 LED display, buttons A and B, a gold edge connector and a gold touch logo.",
    identify:
      "A square board about 5 x 4 cm with a 5x5 grid of LEDs, buttons A and B, a gold touch logo above the display, a micro-USB port and a battery socket on the top edge, and a gold edge connector at the bottom. V1 and V2 look similar; V2 has the touch logo and a speaker/microphone on the back. Check the label.",
    variants: [
      {
        label: "micro:bit V2 (this guide)",
        detail: "nRF52833, built-in speaker, microphone and touch logo.",
        matchesGuide: true,
      },
      { label: "micro:bit V1", detail: "Older version without speaker or microphone; the edge pads are the same but memory is smaller. Check the board before using V2 features." },
      { label: "Calliope mini", detail: "A similar educational board with different pad names." },
    ],
    watchOuts: [
      "3.3 V logic and the 3V pad is a 3.3 V OUTPUT with limited current, so do not power motors or many LEDs from it. Use a transistor or a driver board with its own supply.",
      "Pads are not spaced for a breadboard. Use crocodile clips on the large pads, or an edge-connector breakout board for the small pads.",
      "Pads P3, P4, P6, P7, P9 and P10 drive the LED display; P5 and P11 are the buttons. Using them for other jobs can make the display flicker or the buttons misbehave.",
      "Power the board through USB or a 2 x AAA pack on the battery socket. Do not apply more than about 3.3 V to the 3V pad or the battery socket (check the micro:bit documentation).",
      "The display uses the MakeCode or MicroPython environment; the Arduino IDE needs extra setup.",
    ],
    photoHint: "microbit-v2",
    pins: [
      power("3V", "3V", "3v3"),
      gnd("GND.1"),
      gnd("GND.2"),
      ana("P0", "P0 (ring 0)"),
      ana("P1", "P1 (ring 1)"),
      ana("P2", "P2 (ring 2)"),
      ana("P3", "P3 (display)"),
      ana("P4", "P4 (display)"),
      dig("P5", "P5 (button A)"),
      dig("P6", "P6 (display)"),
      dig("P7", "P7 (display)"),
      dig("P8"),
      dig("P9", "P9 (display)"),
      ana("P10", "P10 (display)"),
      dig("P11", "P11 (button B)"),
      dig("P12"),
      spi("P13", "P13 (SCK)"),
      spi("P14", "P14 (MISO)"),
      spi("P15", "P15 (MOSI)"),
      dig("P16"),
      i2c("P19", "P19 (SCL)"),
      i2c("P20", "P20 (SDA)"),
    ],
  },
  {
    id: "board.xiao.esp32c3",
    name: "Seeed XIAO ESP32-C3",
    kind: "board",
    description:
      "A thumb-sized board (about 2.1 x 1.8 cm) with an ESP32-C3 chip (RISC-V, 3.3 V logic, Wi-Fi and Bluetooth LE) and a USB-C port. It has 11 pins numbered D0-D10 along the two long sides plus 5V, GND and 3V3. Pin map: D0-D3 are GPIO2-GPIO5 (analog), D4 (SDA) and D5 (SCL) are I2C, D6 (TX) and D7 (RX) are serial, D8 (SCK), D9 (MISO) and D10 (MOSI) are SPI. A small connector on the board takes an external antenna, and pads on the underside connect a LiPo battery.",
    photoCaption:
      "Seeed XIAO ESP32-C3: tiny thumb-sized board with a USB-C port, a shielded module and 7 castellated pads on each side.",
    identify:
      "Very small board (about 2.1 x 1.8 cm) with a USB-C port at one end, a metal-shielded ESP32-C3 module with an antenna connector and two small buttons (RESET and BOOT). Pads are labelled 5V, GND, 3V3 and D0-D10. It looks like the XIAO RP2040 and SAMD21; read the chip name on the shield or the silkscreen.",
    variants: [
      {
        label: "XIAO ESP32-C3 (this guide)",
        detail: "Wi-Fi and Bluetooth LE. Pin names D0-D10.",
        matchesGuide: true,
      },
      { label: "XIAO RP2040", detail: "Same shape, RP2040 chip, no wireless; different D-number mapping to GPIO." },
      { label: "XIAO ESP32-S3 / C6", detail: "Same shape, newer chips; the pin maps differ." },
    ],
    watchOuts: [
      "3.3 V logic only. Do not feed 5 V into a pin. Each pin supplies about 20 mA at most, so use a resistor with LEDs and a transistor for motors or relays.",
      "D9 is also the BOOT button (GPIO9) and D8 is a boot strapping pin (GPIO8): do not hold them with sensors or buttons at power-up.",
      "The 5V pin is connected to USB 5 V. It works as an output on USB, or as an input from a 5 V supply. 3V3 is an OUTPUT only for small loads.",
      "Attach the supplied antenna to the small connector for good Wi-Fi range; without it, range is very poor.",
      "Pads are very small and are usually sold with separate header pins that must be soldered.",
    ],
    photoHint: "xiao-esp32c3",
    pins: [
      power("5V", "5V", "5v"),
      power("3V3", "3V3", "3v3"),
      gnd("GND"),
      ana("D0", "D0 (GPIO2)"),
      ana("D1", "D1 (GPIO3)"),
      ana("D2", "D2 (GPIO4)"),
      ana("D3", "D3 (GPIO5)"),
      pin("D4", "D4 (SDA)", ["digital", "i2c"]),
      pin("D5", "D5 (SCL)", ["digital", "i2c"]),
      uart("D6", "D6 (TX)"),
      uart("D7", "D7 (RX)"),
      pin("D8", "D8 (SCK)", ["digital", "spi"]),
      pin("D9", "D9 (MISO)", ["digital", "spi"]),
      pin("D10", "D10 (MOSI)", ["digital", "spi"]),
    ],
  },
  {
    id: "board.xiao.rp2040",
    name: "Seeed XIAO RP2040",
    kind: "board",
    description:
      "A thumb-sized board (about 2.1 x 1.8 cm) with an RP2040 chip (dual-core, 3.3 V logic, no wireless) and a USB-C port. It has 11 pins numbered D0-D10 plus 5V, GND and 3V3. Pin map: D0-D3 are analog inputs, D4 (SDA) and D5 (SCL) are I2C, D6 (TX) and D7 (RX) are serial, D8 (SCK), D9 (MISO) and D10 (MOSI) are SPI. It has an LEDs on board and BOOT and RESET buttons; hold BOOT while plugging in USB to get a drag-and-drop drive for programming.",
    photoCaption:
      "Seeed XIAO RP2040: tiny thumb-sized board with a USB-C port, two small buttons and seven pads along each side.",
    identify:
      "Very small board (about 2.1 x 1.8 cm) with a USB-C port, two tiny buttons (B and R) and seven pads on each long side labelled D0-D10, 5V, 3V3 and GND. It looks like the XIAO ESP32-C3 but has an open RP2040 chip and no antenna or metal can.",
    variants: [
      {
        label: "XIAO RP2040 (this guide)",
        detail: "RP2040 chip, no wireless.",
        matchesGuide: true,
      },
      { label: "XIAO ESP32-C3", detail: "Same shape with Wi-Fi and Bluetooth; see its own entry." },
      { label: "XIAO SAMD21", detail: "Same shape with a different chip; pin numbers map to other GPIOs." },
    ],
    watchOuts: [
      "3.3 V logic only: GPIO pins are NOT 5 V tolerant. The 5V pin is connected to USB 5 V; never connect it to a GPIO pin.",
      "GPIO pins supply only a few mA to about 12-16 mA, so use resistors with LEDs and a transistor or driver for motors, relays and buzzers.",
      "D numbers are not the RP2040 GPIO numbers; use the D labels when wiring and the matching board settings in the IDE.",
      "Pads are very small and the board is usually sold without header pins; solder them before using a breadboard.",
    ],
    photoHint: "xiao-rp2040",
    pins: [
      power("5V", "5V", "5v"),
      power("3V3", "3V3", "3v3"),
      gnd("GND"),
      ana("D0", "D0 (A0)"),
      ana("D1", "D1 (A1)"),
      ana("D2", "D2 (A2)"),
      ana("D3", "D3 (A3)"),
      pin("D4", "D4 (SDA)", ["digital", "i2c"]),
      pin("D5", "D5 (SCL)", ["digital", "i2c"]),
      uart("D6", "D6 (TX)"),
      uart("D7", "D7 (RX)"),
      pin("D8", "D8 (SCK)", ["digital", "spi"]),
      pin("D9", "D9 (MISO)", ["digital", "spi"]),
      pin("D10", "D10 (MOSI)", ["digital", "spi"]),
    ],
  },
];

/* ------------------------------ board electrical data ------------------------------ */

const ESP32_USB_5V: PinElectrical = {
  source: { nominal: 5, min: 4.5, max: 5.25 },
  accepts: { min: 4.5, max: 5.5 },
};

const PI_5V: PinElectrical = {
  source: { nominal: 5, min: 4.75, max: 5.25 },
  accepts: { min: 4.75, max: 5.25 },
};

const BOARD_ELECTRICAL: Record<string, PartElectrical> = {
  "board.arduino.leonardo": ARDUINO_5V,
  "board.arduino.micro": ARDUINO_5V,
  "board.arduino.nano.every": ARDUINO_5V,
  "board.arduino.promini.5v": {
    logic: "5v",
    fiveVTolerantIo: true,
    pins: {
      // RAW feeds the on-board regulator; VCC is the regulated 5 V rail (or a direct 5 V input).
      RAW: vinRange(5, 12, 7),
      VCC: out5v,
    },
  },
  "board.esp32.s3.devkitc1": TWO_3V3({ "5V": ESP32_USB_5V }),
  "board.esp32.c3.devkitm1": ESP32_3V3({ "5V": ESP32_USB_5V }),
  "board.esp32.c3.supermini": ESP32_3V3({ "5V": ESP32_USB_5V }),
  "board.esp32.cam": ESP32_3V3({ "5V": ESP32_USB_5V }),
  "board.esp8266.d1mini": ESP32_3V3({ "5V": ESP32_USB_5V }),
  "board.pi.zero.2w": {
    logic: "3v3",
    fiveVTolerantIo: false,
    pins: { "3V3.1": out3v3, "3V3.2": out3v3, "5V.1": PI_5V, "5V.2": PI_5V },
  },
  "board.pico.2w": {
    logic: "3v3",
    fiveVTolerantIo: false,
    pins: {
      "3V3": out3v3,
      VBUS: out5v,
      // VSYS is the main power input; it feeds the board's regulator.
      VSYS: { accepts: { min: 1.8, max: 5.5 } },
    },
  },
  "board.teensy.40": TWO_3V3({ VIN: { accepts: { min: 3.6, max: 5.5 } }, VUSB: out5v }),
  "board.stm32.bluepill": TWO_3V3({ "5V": ESP32_USB_5V }),
  "board.digispark.attiny85": {
    logic: "5v",
    fiveVTolerantIo: true,
    pins: {
      "5V": out5v,
      VIN: vinRange(7, 12),
    },
  },
  "board.microbit.v2": {
    logic: "3v3",
    fiveVTolerantIo: false,
    pins: { "3V": out3v3 },
  },
  "board.xiao.esp32c3": ESP32_3V3({ "5V": ESP32_USB_5V }),
  "board.xiao.rp2040": ESP32_3V3({ "5V": ESP32_USB_5V }),
};

export const EXTRA_BOARDS: CatalogPart[] = baseBoards.map((board) => {
  const electrical = BOARD_ELECTRICAL[board.id];
  if (!electrical) throw new Error(`Missing electrical data for ${board.id}`);
  return { ...board, electrical };
});
