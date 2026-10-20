import {
  ana,
  ARDUINO_5V,
  BOARD_3V3,
  dig,
  digRange,
  gnd,
  i2c,
  out5v,
  pin,
  power,
  spi,
  uart,
  vinRange,
} from "./_helpers";
import type { CatalogPart, CatalogPin, NewBoardsGroup, PartElectrical } from "./_helpers";

/** Uno-style header pins shared by the two UNO R4 boards. */
function unoR4Pins(): CatalogPin[] {
  return [
    uart("D0", "D0 (RX)"),
    uart("D1", "D1 (TX)"),
    ...digRange(2, 9),
    spi("D10", "D10 (SS)"),
    spi("D11", "D11 (MOSI)"),
    spi("D12", "D12 (MISO)"),
    spi("D13", "D13 (SCK, LED)"),
    pin("A0", "A0 (DAC)", ["analog", "digital"]),
    ana("A1"),
    ana("A2"),
    ana("A3"),
    pin("A4", "A4 (SDA)", ["analog", "digital", "i2c"]),
    pin("A5", "A5 (SCL)", ["analog", "digital", "i2c"]),
    i2c("SDA", "SDA (next to AREF)"),
    i2c("SCL", "SCL (next to AREF)"),
    power("5V", "5V", "5v"),
    power("3V3", "3.3V", "3v3"),
    gnd("GND.1"),
    gnd("GND.2"),
    gnd("GND.3"),
    power("VIN", "VIN", "5v"),
  ];
}

/** 5 V logic like the Uno, but the R4 boards accept 6-24 V on VIN / the barrel jack. */
const UNO_R4_ELECTRICAL: PartElectrical = {
  ...ARDUINO_5V,
  pins: { ...ARDUINO_5V.pins, VIN: vinRange(6, 24, 9) },
};

const unoR4Common = {
  kind: "board" as const,
  pins: unoR4Pins(),
};

const minima: CatalogPart = {
  id: "board.arduino.uno.r4.minima",
  name: "Arduino UNO R4 Minima",
  ...unoR4Common,
  description:
    "The newer, faster Uno-shaped Arduino. It uses a Renesas RA4M1 chip (32-bit Arm Cortex-M4, 48 MHz) and, like the classic Uno, runs at 5 V logic. It has the same shield-friendly header layout: D0-D13, analog pins A0-A5, 5V, 3.3V, GND and VIN. Plug in a USB-C cable or feed 6-24 V into the barrel jack or VIN. A0 can also output a real analog voltage (12-bit DAC), A4/A5 are the I2C pins (SDA/SCL, also repeated on two pins next to AREF), D13 drives the built-in LED, and D0/D1 are a hardware serial port that is separate from USB.",
  photoCaption:
    "Arduino UNO R4 Minima: teal Uno-shaped board with a USB-C port, a black DC barrel jack and a square Renesas RA4M1 chip.",
  identify:
    "Looks like an Uno (about 6.9 x 5.3 cm, two long headers, black barrel jack) but the USB port is the small oval USB-C type and the main chip is a square Renesas RA4M1 instead of the long ATmega328P. The silkscreen says UNO R4 MINIMA. The UNO R4 WiFi looks nearly the same but has a red LED grid and a silver wireless module.",
  variants: [
    {
      label: "UNO R4 Minima (this guide)",
      detail: "Renesas RA4M1, 5 V logic, USB-C. No Wi-Fi or Bluetooth. Same shield footprint as the Uno R3.",
      matchesGuide: true,
    },
    {
      label: "UNO R4 WiFi",
      detail: "Same chip plus an ESP32-S3 for Wi-Fi/Bluetooth, an LED matrix and a Qwiic connector. Pick the R4 WiFi entry for that board.",
    },
    {
      label: "Uno R3",
      detail: "The older ATmega328P board. Same pin layout, different chip, so some libraries and registers differ.",
    },
  ],
  watchOuts: [
    "5 V logic like the classic Uno, so a 3.3 V-only module can be damaged by its outputs. Use a level shifter or voltage divider on lines going into a 3.3 V part.",
    "Each pin can safely handle only a small current (the official figure is about 8 mA, lower than the Uno's 20 mA). Use a resistor with LEDs and never power a motor or relay straight from a pin.",
    "The barrel jack and VIN accept 6-24 V, but the higher the voltage, the hotter the onboard regulator gets. 7-12 V is the comfortable range. The 5V pin is a 5 V output when powered from USB or VIN, so do not feed 9 V into it.",
    "A0 is also a DAC (true analog voltage output). Do not drive A0 from an outside voltage source while your sketch is using the DAC.",
    "I2C is on A4 (SDA) and A5 (SCL), and the SDA/SCL pins next to AREF are the same lines. Keep them free if you plan to use I2C. D0/D1 are the hardware serial port (Serial1); the USB-C cable uses a separate virtual serial port.",
    "Many Uno R3 sketches work, but low-level code that pokes ATmega registers directly does not. Use libraries written or updated for the UNO R4 core.",
  ],
  photoHint: "arduino-uno-r4-minima",
  electrical: UNO_R4_ELECTRICAL,
};

const wifi: CatalogPart = {
  id: "board.arduino.uno.r4.wifi",
  name: "Arduino UNO R4 WiFi",
  ...unoR4Common,
  description:
    "The Uno-shaped Arduino with wireless built in. It has the same Renesas RA4M1 main chip (48 MHz, 5 V logic) as the R4 Minima, plus an ESP32-S3 module that handles Wi-Fi and Bluetooth for you, a 12 x 8 grid of red LEDs you can draw on, and a Qwiic connector for plug-in I2C sensors (3.3 V). Header pins are the Uno set: D0-D13, A0-A5, 5V, 3.3V, GND and VIN. Power it through USB-C or 6-24 V on the barrel jack or VIN. A0 can output a real analog voltage (12-bit DAC), A4/A5 are I2C (also repeated on the SDA/SCL pins next to AREF) and D13 drives the built-in LED.",
  photoCaption:
    "Arduino UNO R4 WiFi: teal Uno-shaped board with a USB-C port, a 12 x 8 red LED grid, a silver ESP32-S3 wireless module and two long female headers.",
  identify:
    "An Uno-sized board with a USB-C port, a black barrel jack, a grid of tiny red LEDs in the middle, a small shielded silver wireless module with an antenna area, and a small white Qwiic connector. The silkscreen says UNO R4 WiFi. The R4 Minima has no LED grid and no wireless module.",
  variants: [
    {
      label: "UNO R4 WiFi (this guide)",
      detail: "RA4M1 plus ESP32-S3 for Wi-Fi and Bluetooth LE, 12 x 8 LED matrix and a Qwiic connector. 5 V logic on the header pins.",
      matchesGuide: true,
    },
    {
      label: "UNO R4 Minima",
      detail: "Same main chip without wireless, LED matrix or Qwiic. Cheaper and simpler.",
    },
  ],
  watchOuts: [
    "5 V logic on the header pins, so 3.3 V-only modules need a level shifter. The Qwiic connector is separate and is 3.3 V only: plug in Qwiic/STEMMA QT parts there, never a 5 V device.",
    "Each pin can safely handle only a small current (about 8 mA is the official figure). Use a resistor with LEDs and switch motors or relays through a transistor or driver.",
    "VIN and the barrel jack accept 6-24 V, but 7-12 V keeps the onboard regulator cooler. The 5V pin is an output; do not feed 9 V into it.",
    "Wi-Fi and Bluetooth run on the separate ESP32-S3 chip and talk to the main chip over a serial link, so use the WiFiS3 library. Its pins are not on the headers.",
    "The 12 x 8 LED matrix is wired internally and uses its own pins, so it does not take any header pin. Use the Arduino_LED_Matrix library to draw on it.",
    "A0 is a DAC (true analog output). I2C is on A4/A5 and the SDA/SCL pins next to AREF; the Qwiic connector uses a second I2C bus (Wire1).",
  ],
  photoHint: "arduino-uno-r4-wifi",
  electrical: UNO_R4_ELECTRICAL,
};

function duePins(): CatalogPin[] {
  const pins: CatalogPin[] = [
    uart("D0", "D0 (RX0)"),
    uart("D1", "D1 (TX0)"),
    ...digRange(2, 13),
    uart("D14", "D14 (TX3)"),
    uart("D15", "D15 (RX3)"),
    uart("D16", "D16 (TX2)"),
    uart("D17", "D17 (RX2)"),
    uart("D18", "D18 (TX1)"),
    uart("D19", "D19 (RX1)"),
    i2c("D20", "D20 (SDA)"),
    i2c("D21", "D21 (SCL)"),
    ...digRange(22, 53),
  ];
  for (let n = 0; n <= 11; n++) pins.push(ana(`A${n}`));
  pins.push(
    pin("DAC0", "DAC0", ["analog"]),
    pin("DAC1", "DAC1", ["analog"]),
    dig("CANRX", "CANRX"),
    dig("CANTX", "CANTX"),
    i2c("SDA1", "SDA1"),
    i2c("SCL1", "SCL1"),
    power("5V", "5V", "5v"),
    power("3V3", "3.3V", "3v3"),
    gnd("GND.1"),
    gnd("GND.2"),
    gnd("GND.3"),
    gnd("GND.4"),
    power("VIN", "VIN", "5v"),
  );
  return pins;
}

const due: CatalogPart = {
  id: "board.arduino.due",
  name: "Arduino Due",
  kind: "board",
  description:
    "A big, fast Arduino on the Mega-shaped board, built around the Atmel SAM3X8E chip (32-bit Arm Cortex-M3, 84 MHz). The most important thing to know: it runs at 3.3 V logic and its pins are NOT 5 V tolerant. It has 54 digital pins (D0-D53, 12 can do PWM), 12 analog inputs (A0-A11, 12-bit capable), two true analog outputs DAC0 and DAC1, four hardware serial ports, two I2C buses (SDA/SCL on D20/D21 and SDA1/SCL1 next to AREF) and CAN bus pins (CANRX/CANTX, which need an outside transceiver chip). It has two micro-USB ports: Programming (normal uploads and serial monitor) and Native (the chip's own USB, for keyboard/mouse tricks). Power it from USB or 7-12 V on the barrel jack or VIN.",
  photoCaption:
    "Arduino Due: long teal Mega-shaped board with two micro-USB ports, a black DC barrel jack, a big square SAM3X8E chip and long female headers.",
  identify:
    "Same long size as a Mega (about 10.2 x 5.3 cm) with the double pin block at the far end, but it has TWO micro-USB ports (not a USB-B) next to the barrel jack, a large square chip marked SAM3X8E in the middle, and DUE on the silkscreen. The ports are labelled PROGRAMMING and NATIVE.",
  variants: [
    {
      label: "Arduino Due (this guide)",
      detail: "SAM3X8E, 3.3 V logic. The Programming port (nearest the barrel jack) is the one to use for normal uploads.",
      matchesGuide: true,
    },
    {
      label: "Due clones",
      detail: "Same layout and chip, often with different USB parts or colours. Check that the chip says SAM3X8E.",
    },
    {
      label: "Mega 2560",
      detail: "Lookalike layout but a 5 V ATmega2560 with one USB-B port. The pins and code are not interchangeable.",
    },
  ],
  watchOuts: [
    "3.3 V logic ONLY: the pins are not 5 V tolerant. Feeding 5 V into any I/O pin (including from a 5 V sensor or a classic Uno) can permanently damage the chip. Use a level shifter for 5 V signals.",
    "Pins can only handle a few mA each (about 3 mA on most pins, up to 15 mA on a few) and about 130 mA for all pins together. Use a transistor or driver for LEDs strings, motors, relays and buzzers.",
    "Many 5 V Uno/Mega shields are NOT safe on a Due. Check the shield says it works at 3.3 V before plugging it in.",
    "Analog inputs read 0-3.3 V only. The 12-bit setting needs analogReadResolution(12) in your sketch. DAC0/DAC1 outputs stay roughly between 0.55 V and 2.75 V, they do not swing the full 0-3.3 V.",
    "Upload through the Programming port (the one nearest the DC jack). The Native port is for the chip's own USB features. Do not plug both ports into the same computer unless you know why.",
    "VIN and the barrel jack want 7-12 V (7 V is the lowest that keeps the 5 V rail steady; do not go above 12 V). The 5V pin is a 5 V output and the 3.3V pin gives about 800 mA at most; never feed an outside voltage into either of them.",
    "I2C has its own pull-up resistors only on the main bus (D20/D21 SDA/SCL); the second bus (SDA1/SCL1) may need external pull-ups. CAN bus needs a CAN transceiver module (for example SN65HVD230).",
  ],
  photoHint: "arduino-due",
  pins: duePins(),
  electrical: BOARD_3V3({ "5V": out5v, VIN: vinRange(7, 12) }),
};

const group: NewBoardsGroup = {
  parts: [minima, wifi, due],
  media: {
    "arduino-uno-r4-minima": "/assets/boards/arduino-uno-r4-minima.svg",
    "arduino-uno-r4-wifi": "/assets/boards/arduino-uno-r4-wifi.svg",
    "arduino-due": "/assets/boards/arduino-due.svg",
  },
  queries: {
    "board.arduino.uno.r4.minima": ["Arduino UNO R4 Minima", "UNO R4 Minima"],
    "board.arduino.uno.r4.wifi": ["Arduino UNO R4 WiFi -Minima", "UNO R4 WiFi"],
    "board.arduino.due": ["Arduino Due -Zero", "Arduino Due"],
  },
};
export default group;
