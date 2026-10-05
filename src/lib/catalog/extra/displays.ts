import type { CatalogPart, CatalogPin, PartElectrical, PartVariantNote } from "../types";

/** Expansion parts: displays and inputs. Ids must stay unique and never be removed. */

const V3_3_ONLY = { min: 3.0, max: 3.6 };

/** I2C OLED breakout with an onboard regulator (3.3 V logic, power pin takes 3.3 to 5 V). */
const oledI2c: PartElectrical = {
  logic: "3v3",
  supply: { min: 3.0, max: 5.5 },
  inputOnlyPins: ["SCL"],
  inputMaxVolts: 3.6,
  inputMaxIsHard: false,
};

const tftSpi3v3 = (inputOnlyPins: string[]): PartElectrical => ({
  logic: "3v3",
  supply: V3_3_ONLY,
  inputOnlyPins,
  inputMaxVolts: 3.6,
});

const max7219: PartElectrical = {
  supply: { min: 4.5, max: 5.5 },
  logic: "5v",
  logicFollowsSupply: true,
  inputOnlyPins: ["DIN", "CS", "CLK"],
  inputHighFraction: 0.7,
};

const matrixKeypadPins = (columns: number): CatalogPin[] => [
  ...[1, 2, 3, 4].map((n) => ({ id: `R${n}`, label: `R${n}`, kinds: ["digital" as const] })),
  ...Array.from({ length: columns }, (_, i) => ({
    id: `C${i + 1}`,
    label: `C${i + 1}`,
    kinds: ["digital" as const],
  })),
];

/** The 8-pin SPI breakout shared by the e-paper panels. */
const epaperPins: CatalogPin[] = [
  { id: "VCC", label: "VCC", kinds: ["power"], voltage: "3v3" },
  { id: "GND", label: "GND", kinds: ["ground"] },
  { id: "DIN", label: "DIN (MOSI)", kinds: ["spi", "digital"] },
  { id: "CLK", label: "CLK (SCK)", kinds: ["spi", "digital"] },
  { id: "CS", label: "CS", kinds: ["spi", "digital"] },
  { id: "DC", label: "DC", kinds: ["digital"] },
  { id: "RST", label: "RST", kinds: ["digital"] },
  { id: "BUSY", label: "BUSY", kinds: ["digital"] },
];

const epaperElectrical: PartElectrical = {
  logic: "3v3",
  supply: V3_3_ONLY,
  inputOnlyPins: ["DIN", "CLK", "CS", "DC", "RST"],
  inputMaxVolts: 3.6,
};

const EPAPER_EXPLAINER =
  "E-paper (e-ink) shows an image with tiny charged particles, so it keeps the picture with no power at all and is easy to read in daylight, but it refreshes slowly (about a second or two, with a flash) and has no backlight.";

function epaperVariants(sizeNote: string): PartVariantNote[] {
  return [
    { label: "Black and white", detail: `The plain version: black on a paper-white background. ${sizeNote}` },
    { label: "Three-colour (red or yellow)", detail: "Same size with a third ink. Its refresh is much slower (often many seconds) and it needs its own code; the listing says B/W/R or B/W/Y. Check the label before choosing a library." },
    { label: "Bare panel or driver board", detail: "A bare panel has only a flat ribbon tail (FPC) and needs a driver board or HAT; this entry is the panel with its 8-pin SPI breakout. Waveshare-style boards often add a small level shifter; check the listing." },
    { label: "Version V1/V2", detail: "Some sizes exist in more than one hardware revision with different driver code. The version is printed on the board or panel label." },
  ];
}

const EPAPER_WATCH_OUTS = [
  "Do not refresh more often than about every 3 minutes (check the datasheet for your panel). Constant refreshing shortens the life of the panel; for a clock or a sensor display, update only when the value changes.",
  "Powered-off is fine, powered-on and idle is not: after each update put the controller into deep sleep (the library has a Sleep call) or switch the supply off, otherwise the panel is held at voltage and can be damaged over days.",
  "Logic is 3.3 V. On a 5 V Arduino (Uno/Nano) put a level shifter or voltage dividers on DIN, CLK, CS, DC and RST. Many Waveshare driver boards say they accept 5 V because of a built-in shifter; if the listing does not say so, treat it as 3.3 V only.",
  "The BUSY pin tells you when the panel is still redrawing. Wire it and wait for it in code; sending data while it is busy gives a blank or garbled screen.",
  "The flat ribbon tail (FPC) is delicate: do not bend it sharply, pull on it, or flex the glass. Open the connector latch gently before removing it. Partial refresh leaves ghosting, so do a full refresh now and then.",
];

type EpaperSpec = {
  id: string;
  name: string;
  hint: string;
  inch: string;
  px: string;
  shape: string;
  sizeNote: string;
};

function epaper(spec: EpaperSpec): CatalogPart {
  return {
    id: spec.id,
    name: spec.name,
    kind: "module",
    category: "Display",
    description: `${spec.inch} e-paper (e-ink) display, ${spec.px} pixels, driven over SPI with an 8-pin breakout (VCC, GND, DIN, CLK, CS, DC, RST, BUSY). ${EPAPER_EXPLAINER} A full refresh redraws everything; many panels also support a faster partial refresh of a small area. Power it from 3.3 V.`,
    identify: `A thin ${spec.shape} paper-white panel with a short flat ribbon tail (FPC) folded to a small circuit board with an 8-pin header or an 8-wire cable (VCC, GND, DIN, CLK, CS, DC, RST, BUSY). Common brands are Waveshare and Good Display; the size and resolution are printed on the listing and often on the panel. A 7-pin or 4-pin e-paper is a different board.`,
    variants: epaperVariants(spec.sizeNote),
    watchOuts: EPAPER_WATCH_OUTS,
    photoCaption: `${spec.inch} e-paper panel with a flat ribbon tail and a small SPI breakout board`,
    photoHint: spec.hint,
    displayClass: "epaper",
    electrical: epaperElectrical,
    pins: epaperPins,
  };
}

const dataParts: CatalogPart[] = [
  {
    id: "module.oled.ssd1306.128x32",
    name: "OLED SSD1306 128x32 (I2C)",
    kind: "module",
    category: "Display",
    description:
      "A small, wide OLED screen (commonly 0.91 inch, 128x32 pixels, one colour) driven by an SSD1306-family chip over I2C. It shows text and simple graphics, makes its own light so it has no backlight, and uses just 4 wires: GND, VCC, SCL and SDA. The chip works at 3.3 V logic; most breakouts have a regulator and take 3.3 to 5 V on VCC, but check the label. The usual I2C address is 0x3C.",
    identify:
      "A tiny board, with a glass window only half as tall as the 128x64 OLED and a 4-pin header (GND, VCC, SCL, SDA). Count the pixels in the listing: 128x32 is this part, 128x64 is the taller module. Some use the newer SSD1315 chip, which works with SSD1306 code. The address printed on the back is usually 0x3C (written 0x78 in 8-bit form).",
    variants: [
      { label: "0.91 inch 128x32", detail: "The size this entry describes. The same SSD1306 library works if you tell it the height is 32 pixels." },
      { label: "Colour", detail: "White, blue, or white and blue. This only changes looks." },
      { label: "I2C address", detail: "0x3C is typical; some boards have a solder jumper for 0x3D. Run an I2C scan if you see nothing." },
      { label: "SPI version", detail: "Rare for this size. If the listing shows 7 pins (with DC, RES and CS), it is a different wiring." },
    ],
    watchOuts: [
      "Set the height to 32 in the library (for example the Adafruit SSD1306 constructor); with 64 it shows half the picture or garbage.",
      "Check the pin order on the silkscreen: some boards are GND, VCC, SCL, SDA and others VCC, GND, SDA, SCL. Swapping VCC and GND can destroy the screen.",
      "The I2C address is usually 0x3C. If the screen stays black, scan for the address; some libraries need the 7-bit form (0x3C), not 0x78.",
      "OLED pixels wear out and burn in. Dim it or blank it when idle instead of leaving a static image for hours.",
    ],
    photoCaption: "Wide, short 128x32 OLED board with a 4-pin I2C header",
    photoHint: "oled-ssd1306-128x32",
    displayClass: "oled",
    electrical: oledI2c,
    pins: [
      { id: "GND", label: "GND", kinds: ["ground"] },
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "3v3" },
      { id: "SCL", label: "SCL", kinds: ["i2c"] },
      { id: "SDA", label: "SDA", kinds: ["i2c"] },
    ],
  },
  {
    id: "module.oled.sh1106.1in3",
    name: "OLED SH1106 1.3 inch (I2C)",
    kind: "module",
    category: "Display",
    description:
      "A 1.3 inch OLED screen, 128x64 pixels, one colour, driven by the SH1106 chip over I2C. It looks almost the same as the 0.96 inch SSD1306 screen but is a little larger and needs a different driver. It draws text and simple graphics, has no backlight and uses 4 wires: GND, VCC, SCL, SDA. The chip works at 3.3 V logic; most breakouts take 3.3 to 5 V on VCC, but check the label. The usual address is 0x3C.",
    identify:
      "A 4-pin board (GND, VCC, SCL, SDA) with a 1.3 inch window of 128x64 pixels, usually in white or blue. The key point is the chip name in the listing: SH1106 here, SSD1306 for the 0.96 inch one. If an SSD1306 library is used on an SH1106, the picture is shifted 2 pixels to the right and a column of noise appears on the left edge. Some 1.3 inch boards sold as SSD1306 are really SH1106.",
    variants: [
      { label: "I2C, 4 pins", detail: "GND, VCC, SCL, SDA, as described here. The address is usually 0x3C and sometimes 0x3D." },
      { label: "SPI, 7 pins", detail: "Same screen with D0, D1, RES, DC and CS pins. Different wiring from this entry." },
      { label: "Colour", detail: "White, blue or yellow and blue. This only changes looks." },
      { label: "SSD1306 lookalike", detail: "Same shape and pins but a different chip. Use the SSD1306 library for that one, and an SH1106 library (such as U8g2 SH1106 or Adafruit SH110X) for this one." },
    ],
    watchOuts: [
      "Use an SH1106 driver, not an SSD1306 one, otherwise the image is shifted and has noise at the edge. In U8g2, pick the SH1106 constructor.",
      "Check the pin order on the silkscreen. Some boards are GND, VCC, SCL, SDA and others VCC, GND, SDA, SCL. Swapping VCC and GND can destroy the screen.",
      "The I2C address is usually 0x3C. Some boards have a jumper to 0x3D. Run an I2C scan if the screen stays black.",
      "Power from 3.3 V on a 3.3 V board such as an ESP32. 5 V on VCC is only safe if the listing says the module has a regulator.",
    ],
    photoCaption: "1.3 inch 128x64 OLED board with a 4-pin I2C header",
    photoHint: "oled-sh1106",
    displayClass: "oled",
    electrical: oledI2c,
    pins: [
      { id: "GND", label: "GND", kinds: ["ground"] },
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "3v3" },
      { id: "SCL", label: "SCL", kinds: ["i2c"] },
      { id: "SDA", label: "SDA", kinds: ["i2c"] },
    ],
  },
  {
    id: "module.tft.st7735.1in8",
    name: "TFT ST7735 1.8 inch (SPI)",
    kind: "module",
    category: "Display",
    description:
      "A small colour TFT screen (commonly 1.8 inch, 128x160 pixels) driven by the ST7735 chip over SPI. It shows text, pictures and graphics in colour and has an LED backlight. The usual 8-pin breakout has VCC, GND, CS (chip select), RST (reset), DC (data or command, sometimes labelled A0), SDA (the data line, which is SPI MOSI), SCK (SPI clock) and LED (backlight power). The chip runs at 3.3 V logic.",
    identify:
      "Usually a red or black board with a 1.8 inch colour window and a row of 8 header pins along one short edge; many have a microSD slot on the back. SDA and SCK here are SPI pins, not I2C. Lookalikes: the 1.44 inch ST7735 (128x128), the ST7789 (square 240x240) and the ILI9341 (2.8 inch, 240x320). The chip name is in the listing.",
    variants: [
      { label: "1.8 inch 128x160", detail: "The size this entry describes. The library needs the right tab or offset setting for the exact screen." },
      { label: "1.44 inch 128x128", detail: "Smaller, same chip family and pin names, different size and offsets in code." },
      { label: "With microSD slot", detail: "Adds extra SD pins (SD_CS, SD_MOSI, SD_MISO, SD_SCK) that are not part of this entry." },
      { label: "Tab colour", detail: "The library asks for a tab colour (red, green, black); a wrong choice shifts the picture by a pixel or two. Try each." },
    ],
    watchOuts: [
      "Signal pins are 3.3 V. On a 5 V Arduino (Uno/Nano) use a level shifter or voltage dividers on SDA, SCK, CS, DC and RST unless the listing says the board has built-in shifting.",
      "Check the label for the VCC range: some red boards have a regulator and accept 5 V, but a bare screen only takes 3.3 V. This entry assumes 3.3 V to be safe.",
      "The LED pin powers the backlight. It usually goes to 3.3 V; a few boards want a resistor in series, so follow the listing. A missing LED connection gives a dark screen that looks dead.",
      "Use the board's hardware SPI pins for SDA (MOSI) and SCK so the redraw is fast.",
    ],
    photoCaption: "1.8 inch colour TFT board with an 8-pin header along one edge",
    photoHint: "tft-st7735",
    displayClass: "tft",
    electrical: tftSpi3v3(["CS", "RST", "DC", "SDA", "SCK"]),
    pins: [
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "3v3" },
      { id: "GND", label: "GND", kinds: ["ground"] },
      { id: "CS", label: "CS", kinds: ["spi", "digital"] },
      { id: "RST", label: "RST", kinds: ["digital"] },
      { id: "DC", label: "DC (A0)", kinds: ["digital"] },
      { id: "SDA", label: "SDA (MOSI)", kinds: ["spi", "digital"] },
      { id: "SCK", label: "SCK", kinds: ["spi", "digital"] },
      { id: "LED", label: "LED (BL)", kinds: ["power"], voltage: "3v3" },
    ],
  },
  {
    id: "module.tft.st7789.240x240",
    name: "TFT ST7789 1.3/1.54 inch (SPI)",
    kind: "module",
    category: "Display",
    description:
      "A small square colour IPS screen (commonly 1.3 or 1.54 inch, 240x240 pixels) driven by the ST7789 chip over SPI. It is sharp and bright with wide viewing angles, and uses a short 7-pin header: GND, VCC, SCL (SPI clock), SDA (SPI data in, MOSI), RES (reset), DC (data or command) and BLK (backlight). Many of these boards have no CS pin because the chip select is tied low. Logic is 3.3 V.",
    identify:
      "A small black or blue board with a square colour window and a row of 7 pins (GND, VCC, SCL, SDA, RES, DC, BLK). SCL and SDA here are SPI, not I2C. Some versions add a CS pin (8 pins) and some are 240x320 (2.0 inch) or 135x240, which need different settings in code. Lookalikes are the ST7735 (1.8 inch, 128x160) and the ILI9341.",
    variants: [
      { label: "240x240 square, 7 pins", detail: "The common 1.3 and 1.54 inch board. No CS pin; chip select is tied low on the board." },
      { label: "With CS pin", detail: "Some boards expose CS for sharing the SPI bus with other devices. Connect it to a free GPIO." },
      { label: "240x320 or 135x240", detail: "Same chip, other sizes (such as 2.0 inch or the 1.14 inch strip). The resolution and offsets in the library must match." },
      { label: "Backlight pin name", detail: "Labelled BLK, BL or LED. It switches or powers the backlight; some boards need it tied to 3.3 V." },
    ],
    watchOuts: [
      "Everything is 3.3 V. Do not connect SCL, SDA, RES, DC or BLK straight to a 5 V Arduino pin; use a level shifter or dividers, or choose a 3.3 V board.",
      "Power VCC from 3.3 V. Check the label before using 5 V: most bare boards of this kind are not 5 V tolerant.",
      "If the screen stays white or dark, check that BLK is connected to 3.3 V (or a GPIO set HIGH) and that RES is wired; some libraries need RES to run.",
      "Set the exact size (240x240, 240x320 or 135x240) and the correct offset in the library. A wrong setting leaves a coloured line at the edge or a shifted picture.",
    ],
    photoCaption: "Small square 240x240 colour TFT board with a 7-pin header",
    photoHint: "tft-st7789",
    displayClass: "tft",
    electrical: tftSpi3v3(["SCL", "SDA", "RES", "DC", "CS"]),
    pins: [
      { id: "GND", label: "GND", kinds: ["ground"] },
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "3v3" },
      { id: "SCL", label: "SCL (SCK)", kinds: ["spi", "digital"] },
      { id: "SDA", label: "SDA (MOSI)", kinds: ["spi", "digital"] },
      { id: "RES", label: "RES", kinds: ["digital"] },
      { id: "DC", label: "DC", kinds: ["digital"] },
      { id: "BLK", label: "BLK (backlight)", kinds: ["digital"] },
      { id: "CS", label: "CS (only on some boards)", kinds: ["spi", "digital"] },
    ],
  },
  epaper({
    id: "module.epaper.1in54",
    name: "E-paper 1.54 inch 200x200 (SPI)",
    hint: "epaper-1in54",
    inch: "1.54 inch",
    px: "200x200",
    shape: "square",
    sizeNote: "200x200 pixels, common as a small badge or sensor display.",
  }),
  epaper({
    id: "module.epaper.2in13",
    name: "E-paper 2.13 inch 250x122 (SPI)",
    hint: "epaper-2in13",
    inch: "2.13 inch",
    px: "250x122",
    shape: "landscape",
    sizeNote: "250x122 pixels, the size of many Raspberry Pi pHAT screens and name tags.",
  }),
  epaper({
    id: "module.epaper.2in9",
    name: "E-paper 2.9 inch 296x128 (SPI)",
    hint: "epaper-2in9",
    inch: "2.9 inch",
    px: "296x128",
    shape: "wide landscape",
    sizeNote: "296x128 pixels, a long narrow panel often used for shelf labels and small signs.",
  }),
  epaper({
    id: "module.epaper.4in2",
    name: "E-paper 4.2 inch 400x300 (SPI)",
    hint: "epaper-4in2",
    inch: "4.2 inch",
    px: "400x300",
    shape: "large landscape",
    sizeNote: "400x300 pixels. A full refresh of this size takes a few seconds and it needs more memory than a small Arduino has, so use an ESP32 or similar.",
  }),
  {
    id: "module.tm1637.4digit",
    name: "TM1637 4-digit 7-segment display",
    kind: "module",
    category: "Display",
    description:
      "A 4-digit seven-segment LED display on a small board with a TM1637 driver chip, so the whole thing needs only 4 wires: GND, VCC, CLK and DIO. It shows numbers (and a few letters), usually in red, and many have a colon between the middle digits for clocks. The chip handles the multiplexing; your code sends the digits and the brightness. CLK and DIO look like I2C but are not: it is a simple two-wire protocol of its own.",
    identify:
      "A small board with four red (sometimes green, blue or white) digits and a 4-pin header labelled CLK, DIO, VCC, GND. The colon version has two dots in the middle and is meant for clocks; the other version has a decimal point after each digit. Lookalikes: the TM1638 module (8 digits, 10 pins) and plain 4-digit displays with 12 pins and no driver.",
    variants: [
      { label: "Colon (clock) type", detail: "Two dots between digits 2 and 3, for a clock. Only the colon is controlled together with digit 2." },
      { label: "Decimal-point type", detail: "A point after each digit, handy for readings like 12.34." },
      { label: "Colour", detail: "Red, green, blue and white versions exist. The code does not change." },
    ],
    watchOuts: [
      "Do not connect it to an I2C bus. CLK and DIO are not I2C; they can share nothing with SDA/SCL devices and need their own two GPIO pins.",
      "It is a 5 V part (the chip takes about 3 to 5.5 V). Check the label; on a 3.3 V board use 3.3 V and a lower brightness setting if the segments look dim.",
      "Check the pin order on the silkscreen. Most boards are CLK, DIO, VCC, GND but not all, and VCC/GND reversed can damage the chip.",
      "At full brightness all segments together draw tens of milliamps. Run it from the board's 3.3 V or 5 V pin, not from a GPIO.",
    ],
    photoCaption: "4-digit red 7-segment board with a 4-pin header",
    photoHint: "tm1637",
    electrical: {
      supply: { min: 3.3, max: 5.5 },
      logic: "5v",
      logicFollowsSupply: true,
      inputOnlyPins: ["CLK"],
    },
    pins: [
      { id: "CLK", label: "CLK", kinds: ["digital"] },
      { id: "DIO", label: "DIO", kinds: ["digital"] },
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "5v" },
      { id: "GND", label: "GND", kinds: ["ground"] },
    ],
  },
  {
    id: "module.max7219.matrix8x8",
    name: "MAX7219 8x8 LED matrix module",
    kind: "module",
    category: "Display",
    description:
      "A single-colour 8x8 LED dot matrix (64 LEDs, usually red) on a board with a MAX7219 driver chip. The chip handles all the scanning, so the module needs only 5 wires: VCC, GND, DIN (data in), CS (chip select, also called LOAD) and CLK (clock). It uses a simple SPI-style protocol. A second set of pins on the other side (DOUT, CLK, CS, GND, VCC) lets you chain several modules: connect the output side of one to the input side of the next to make a long scrolling display.",
    identify:
      "A square blue or green board with a black 8x8 LED block and a 5-pin header on each side. The pins labelled DIN/CS/CLK are the input side; the opposite side labelled DOUT/CS/CLK is the output for the next module. The cheap 4-in-1 boards have four of these soldered in a row. Lookalikes: the WS2812 NeoPixel matrix (one data wire, full colour) and the TM1637 or HT16K33 displays.",
    variants: [
      { label: "Single module", detail: "One 8x8 block; the one this entry describes." },
      { label: "4-in-1 board", detail: "Four matrices on one long board, chained inside. It has the same 5 input pins on one end." },
      { label: "Orientation", detail: "Some boards are mirrored or rotated, so the first test often shows the picture upside down. The library has a setting to fix this." },
    ],
    watchOuts: [
      "Power it from 5 V. The MAX7219 is specified for about 4 to 5.5 V and its inputs expect 5 V levels; a 3.3 V board works with many modules but a level shifter on DIN, CS and CLK is safer.",
      "Check which side is IN and which is OUT before wiring. A lot of boards print DIN/DOUT in small letters; connecting to the output side shows nothing.",
      "Each module can draw several hundred milliamps at full brightness. Keep the brightness low or use a separate 5 V supply with common ground for chains of 4 or more.",
      "Set the brightness and wake the chip in code (shutdown mode is the default after power up in some libraries) or the display stays blank.",
    ],
    photoCaption: "8x8 red LED matrix on a blue board with a 5-pin header on each side",
    photoHint: "max7219-matrix",
    displayClass: "matrix",
    electrical: max7219,
    pins: [
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "5v" },
      { id: "GND", label: "GND", kinds: ["ground"] },
      { id: "DIN", label: "DIN", kinds: ["spi", "digital"] },
      { id: "CS", label: "CS (LOAD)", kinds: ["spi", "digital"] },
      { id: "CLK", label: "CLK", kinds: ["spi", "digital"] },
      { id: "DOUT", label: "DOUT (to next module)", kinds: ["digital"] },
    ],
  },
  {
    id: "module.max7219.7segment8",
    name: "MAX7219 8-digit 7-segment display",
    kind: "module",
    category: "Display",
    description:
      "A row of eight seven-segment LED digits (usually red) on a board with a MAX7219 driver chip. The chip handles all the scanning, so you need only 5 wires: VCC, GND, DIN (data in), CS (chip select, also called LOAD) and CLK (clock). It uses a simple SPI-style protocol and has a built-in digit decoder for numbers, so it is a neat choice for counters, scores and meters. Modules can be chained through the DOUT output on the far side.",
    identify:
      "A long blue or green board with eight red digits and a 5-pin header (VCC, GND, DIN, CS, CLK) on one long edge, often another set on the other end for chaining. It looks like the TM1637 4-digit board but has twice the digits and 5 pins instead of 4. Check the listing for the MAX7219 or MAX7221 name.",
    variants: [
      { label: "8 digits", detail: "The common length, with a decimal point on each digit." },
      { label: "Chain pins", detail: "Some boards expose an output header (DOUT) so another module can be added." },
      { label: "Colour", detail: "Red is usual; green and blue versions exist and the code is the same." },
    ],
    watchOuts: [
      "Power it from 5 V. The inputs expect 5 V levels, so with a 3.3 V board such as an ESP32 add a level shifter on DIN, CS and CLK for a reliable display.",
      "The chip starts in shutdown mode and with the lowest brightness in many libraries. Call the wake-up and set the intensity, or the display looks dead.",
      "Digits may be numbered right to left. If your text appears backwards, reverse the digit order in code.",
      "Eight digits at full brightness can pull a few hundred milliamps. Keep the brightness down on a USB-powered board.",
    ],
    photoCaption: "Long board with eight red 7-segment digits and a 5-pin header",
    photoHint: "max7219-7segment",
    electrical: max7219,
    pins: [
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "5v" },
      { id: "GND", label: "GND", kinds: ["ground"] },
      { id: "DIN", label: "DIN", kinds: ["spi", "digital"] },
      { id: "CS", label: "CS (LOAD)", kinds: ["spi", "digital"] },
      { id: "CLK", label: "CLK", kinds: ["spi", "digital"] },
      { id: "DOUT", label: "DOUT (to next module)", kinds: ["digital"] },
    ],
  },
  {
    id: "module.lcd.st7920.12864",
    name: "Graphic LCD 128x64 ST7920 (serial)",
    kind: "module",
    category: "Display",
    description:
      "A 128x64 graphic LCD (the 12864) with an ST7920 controller. Unlike the 16x2 text LCD it can draw lines, pictures and any font. It has a 20-pin header; in serial mode, which saves wires, only a few pins are used: RS acts as chip select (CS), R/W as data in (MOSI) and E as the clock. PSB must be tied to GND to select serial mode. Contrast is set with a trimmer or a potentiometer on V0. The backlight (BLA, BLK) is separate from the logic.",
    identify:
      "A green or blue board with a 128x64 pixel window (yellow-green with black pixels, or blue with white) and 20 pins along the top edge. The controller name ST7920 is in the listing; the KS0108 12864 is a different 20-pin screen with other wiring. The pin names RS, R/W, E, PSB, RST, BLA and BLK are on the silkscreen. The same panel is built into many 3D printer controllers as a smart display.",
    variants: [
      { label: "Serial mode (this entry)", detail: "PSB to GND. RS is CS, R/W is MOSI, E is the clock. Works with U8g2 in its ST7920 SPI mode." },
      { label: "Parallel mode", detail: "PSB to VCC and 8 data pins D0 to D7. It uses far more wires and is not covered here." },
      { label: "3.3 V or 5 V version", detail: "Most are 5 V parts; a few are 3.3 V. Check the label or listing." },
      { label: "Backlight colour", detail: "Yellow-green with a dark text, or blue with white text. Looks only." },
    ],
    watchOuts: [
      "PSB must be wired to GND for serial mode. Left floating, the screen picks a mode at random and may show nothing.",
      "Turn the contrast trimmer, or adjust the potentiometer on V0. If you see a solid dark bar or a blank screen, this is the usual cause.",
      "The backlight (BLA to the positive side, BLK to ground) may need a resistor; follow the listing. A dark screen with a lit backlight often means contrast is wrong.",
      "This entry assumes a 5 V supply and 5 V logic. On a 3.3 V board use a level shifter on RS, R/W and E, or buy a 3.3 V screen. Check the label.",
    ],
    photoCaption: "128x64 graphic LCD board with a 20-pin header along the top",
    photoHint: "lcd-12864",
    electrical: {
      supply: { min: 4.5, max: 5.5 },
      logic: "5v",
      logicFollowsSupply: true,
      inputOnlyPins: ["RS", "RW", "E", "PSB", "RST"],
      inputHighFraction: 0.7,
    },
    pins: [
      { id: "GND", label: "GND (pin 1)", kinds: ["ground"] },
      { id: "VCC", label: "VCC (pin 2)", kinds: ["power"], voltage: "5v" },
      { id: "V0", label: "V0 (contrast)", kinds: ["analog"] },
      { id: "RS", label: "RS (CS)", kinds: ["spi", "digital"] },
      { id: "RW", label: "R/W (MOSI)", kinds: ["spi", "digital"] },
      { id: "E", label: "E (SCK)", kinds: ["spi", "digital"] },
      { id: "PSB", label: "PSB (to GND for serial)", kinds: ["digital"] },
      { id: "RST", label: "RST", kinds: ["digital"] },
      { id: "BLA", label: "BLA (backlight +)", kinds: ["power"], voltage: "5v" },
      { id: "BLK", label: "BLK (backlight -)", kinds: ["ground"] },
    ],
  },
  {
    id: "module.keypad.3x4",
    name: "Membrane Keypad 3x4",
    kind: "module",
    category: "Input",
    description:
      "A flat keypad with 12 buttons (1 to 9, *, 0 and #) wired as a grid of 4 rows (R1 to R4) and 3 columns (C1 to C3), so it needs 7 pins. It has no electronics: pressing a key connects its row to its column. Your code scans it, usually with the Keypad library, by driving the columns and reading the rows with pull-ups. All 7 pins are plain digital pins.",
    identify:
      "A thin flexible pad with a sticky back and 12 keys, and a flat ribbon with a single row of 7 pins. The 4x4 keypad has 16 keys (A to D too) and 8 pins, so count the keys and pins. Lookalike: the 4x4 matrix pad, which has 8 pins.",
    variants: [
      { label: "Pin order", detail: "Row and column pins are not always in the same order from one pad to the next. Test with a short sketch before final wiring." },
      { label: "Rigid keypad", detail: "A plastic or metal 3x4 keypad (like a door entry pad) behaves the same, with 7 pins, but the pin order differs." },
    ],
    watchOuts: [
      "Count the pins before you buy: 7 pins is this part, 8 pins is the 4x4 pad.",
      "Use pins that support INPUT_PULLUP, or add pull-up resistors, or key presses will read at random.",
      "Do not bend the ribbon sharply close to the pad, it can break the printed lines inside.",
      "Row and column order varies by maker. If pressing 5 gives 6, swap the row or column pin numbers in your sketch, no hardware change is needed.",
    ],
    photoCaption: "Flat 12-key membrane pad with a ribbon tail and a 7-pin header",
    photoHint: "keypad-3x4",
    wokwi: { tag: "wokwi-membrane-keypad", attrs: { columns: "3" } },
    pins: matrixKeypadPins(3),
  },
  {
    id: "module.keypad.4x4.buttons",
    name: "Matrix Button Keypad 4x4",
    kind: "module",
    category: "Input",
    description:
      "A small circuit board with 16 push buttons in a 4x4 grid (rows R1 to R4, columns C1 to C4) and an 8-pin header. It has no electronics except the buttons: pressing one connects its row pin to its column pin. Your code scans the grid, for example with the Keypad library, by driving the columns and reading the rows with pull-ups. All 8 pins are plain digital pins. It does the same job as the flat membrane keypad but with real clicky keys.",
    identify:
      "A square board with 16 round or square tactile buttons, often with a printed label such as 1 to 9, 0, A to D, * and #, and an 8-pin header along one edge. Pins are usually marked R1 to R4 and C1 to C4, or 1 to 8. A version with 16 buttons but only 5 pins has a resistor ladder and reads as one analog pin instead.",
    variants: [
      { label: "Printed key labels", detail: "Some boards have blank caps or are labelled 0-9, A-D, * and #. The wiring is the same." },
      { label: "Resistor-ladder version", detail: "Fewer pins (often 3 or 5) and one analog signal. Different code; not this entry." },
      { label: "Pin numbering", detail: "Marked 1 to 8 instead of R/C. The first four are usually the rows, but test it." },
    ],
    watchOuts: [
      "Use pins that allow INPUT_PULLUP (the Keypad library sets this), or add pull-up resistors. Otherwise key presses read at random.",
      "If a key reports the wrong value, swap the row or column pin numbers in the sketch; the board does not need to change.",
      "The usual matrix cannot tell some combinations of 3 or more keys apart (ghosting). Add diodes if you need to press many at once.",
      "Count the pins: 8 pins is a 4x4 matrix, 7 pins a 4x3.",
    ],
    photoCaption: "Small board with sixteen push buttons in a 4x4 grid and an 8-pin header",
    photoHint: "keypad-4x4-buttons",
    wokwi: { tag: "wokwi-membrane-keypad", attrs: { columns: "4" } },
    pins: matrixKeypadPins(4),
  },
  {
    id: "module.touch.ttp223",
    name: "Capacitive Touch Sensor TTP223",
    kind: "module",
    category: "Input",
    description:
      "A single-pad capacitive touch button board built around the TTP223 chip. When a finger touches or comes near the round pad, the I/O pin changes. By default it goes HIGH while touched and LOW when released (momentary). It has 3 pins: I/O (signal output), VCC and GND, and runs from about 2 to 5.5 V. The output swings to the supply voltage, so it is safe to use with 3.3 V boards when powered from 3.3 V.",
    identify:
      "A small blue or black board with a round or square touch pad, a tiny chip marked TTP223 or similar, a status LED and a 3-pin header (I/O, VCC, GND). Two small solder pads labelled A and B change the mode. It can sense through thin plastic or glass.",
    variants: [
      { label: "Default mode", detail: "Momentary and active-high: the pin goes HIGH only while touched." },
      { label: "Toggle mode", detail: "Soldering the pad usually labelled A makes it toggle on every touch. Check the board silkscreen and the seller notes." },
      { label: "Active-low mode", detail: "Soldering the pad usually labelled B inverts the output, so it is LOW when touched." },
    ],
    watchOuts: [
      "Power the sensor from the same voltage the microcontroller uses for logic. With 5 V VCC the I/O pin gives 5 V, which can damage a 3.3 V board.",
      "The board calibrates itself at power-up. Do not touch the pad while powering on, or it may stay stuck.",
      "Keep the wire between the sensor and the board short and away from mains wiring or motors. Long wires cause false triggers.",
      "The jumper pads A and B differ by board. Check the silkscreen and the listing before soldering to change the mode.",
    ],
    photoCaption: "Small blue touch sensor board with a round pad and a 3-pin header",
    photoHint: "ttp223",
    electrical: {
      supply: { min: 2.0, max: 5.5 },
      logic: "5v",
      logicFollowsSupply: true,
    },
    pins: [
      { id: "IO", label: "I/O", kinds: ["digital"] },
      { id: "VCC", label: "VCC", kinds: ["power"], voltage: "3v3" },
      { id: "GND", label: "GND", kinds: ["ground"] },
    ],
  },
  {
    id: "module.button.arcade",
    name: "Arcade Push Button with LED",
    kind: "module",
    category: "Input",
    description:
      "A big round arcade push button (commonly 24 or 30 mm) that clicks when pressed and often has a small lamp inside that lights the cap. It is built from two separate parts: the switch, with a common (COM) and a normally open (NO) terminal, and the LED, with a plus and a minus terminal. Pressing the button joins COM and NO, like any momentary pushbutton. The LED is separate and only lights when its own supply is connected.",
    identify:
      "A plastic button with a threaded body that fits a round hole in a panel, a large clear or coloured domed cap (24 mm, 30 mm or about 60 mm) and a nut that holds it in. Underneath there are two or more spade terminals. Two of them (labelled COM and NO, or just two flat tabs) are the switch; the other two, often with a small + sign and a different shape, are the LED. Many have a microswitch clipped on the bottom with 3 terminals (COM, NO, NC).",
    variants: [
      { label: "Cap size", detail: "24 mm, 30 mm and 60 mm sizes exist. The panel hole must match; check the listing." },
      { label: "LED voltage", detail: "Versions with built-in LED resistor come for 5 V, 12 V or 24 V. The voltage is printed on the cap or listed. Do not guess." },
      { label: "Microswitch", detail: "The micro switch has COM, NO and NC terminals. Use COM and NO for a normal press-to-make button." },
    ],
    watchOuts: [
      "The switch and the LED are separate circuits. Wiring the LED to the switch terminals does not light it, and the LED needs its own supply voltage.",
      "Check the LED voltage (5 V, 12 V or 24 V) before connecting. A 12 V LED on 5 V stays dim, a 5 V LED on 12 V burns out. Bare LEDs without a resistor need an external resistor.",
      "Wire the switch between a GPIO pin and GND, and set the pin to INPUT_PULLUP, so no extra resistor is needed. Debounce the button in code.",
      "Spade terminals are not breadboard-friendly. Use jumper wires with female spade connectors, or solder wires, and keep the polarity of the LED right (+ to the supply).",
    ],
    photoCaption: "Large round arcade button with a domed cap and spade terminals underneath",
    photoHint: "arcade-button",
    pins: [
      { id: "COM", label: "COM", kinds: ["digital", "ground"] },
      { id: "NO", label: "NO", kinds: ["digital", "ground"] },
      { id: "LED+", label: "LED +", kinds: ["power"] },
      { id: "LED-", label: "LED -", kinds: ["ground"] },
    ],
  },
  {
    id: "module.button.12mm.led",
    name: "12 mm Metal Push Button with LED",
    kind: "module",
    category: "Input",
    description:
      "A small round momentary push button with a metal body about 12 mm wide, often with a ring of light around the cap. It has 4 pins: two for the switch (COM and NO, which touch when you press) and two for the LED ring (+ and -). Pressing the button connects COM to NO for as long as you hold it. The LED only lights when its own supply is wired up; the switch and the LED are separate circuits.",
    identify:
      "A short metal cylinder with a threaded body for a 12 mm panel hole, a flat or slightly domed metal cap with a glowing ring (blue, red, green or white), a mounting nut, and either a plug with four wires or four solder pins underneath. The symbol marked on the body shows the circle and + / - for the LED; the other two pins are the switch.",
    variants: [
      { label: "Ring LED voltage", detail: "Commonly 3 to 6 V (with an internal resistor), but 12 V and 24 V versions exist. The voltage is on the listing or the body." },
      { label: "Latching version", detail: "Some metal buttons latch on (push-on, push-off). This entry is the momentary one." },
      { label: "Wire plug or solder pins", detail: "The cable version has four coloured wires; check the listing for the colour code." },
    ],
    watchOuts: [
      "The LED is a separate circuit from the switch. Connecting the LED pins to your signal pin does not make it light with the press.",
      "Check the LED voltage before connecting. A 5 V ring needs 5 V; on 3.3 V it is dim; a 12 V version does nothing on 5 V.",
      "Wire the switch between a GPIO pin and GND and use INPUT_PULLUP, then debounce in code. The metal body is not connected to the circuit, but keep it away from other wiring.",
      "Panel hole size matters: 12 mm here, 16 mm and 19 mm buttons look similar but need bigger holes. Measure first.",
    ],
    photoCaption: "Small metal push button with a glowing ring around the cap and four pins",
    photoHint: "button-12mm-led",
    pins: [
      { id: "COM", label: "COM", kinds: ["digital", "ground"] },
      { id: "NO", label: "NO", kinds: ["digital", "ground"] },
      { id: "LED+", label: "LED +", kinds: ["power"] },
      { id: "LED-", label: "LED -", kinds: ["ground"] },
    ],
  },
];

export const EXTRA_DISPLAYS: CatalogPart[] = dataParts;
