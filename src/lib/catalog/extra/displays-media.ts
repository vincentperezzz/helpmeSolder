/** Thumbnails for the expansion displays parts, keyed by photoHint. */
const dir = "/photos/displays";

const HINTS = [
  "oled-ssd1306-128x32",
  "oled-sh1106",
  "tft-st7735",
  "tft-st7789",
  "epaper-1in54",
  "epaper-2in13",
  "epaper-2in9",
  "epaper-4in2",
  "tm1637",
  "max7219-matrix",
  "max7219-7segment",
  "lcd-12864",
  "keypad-3x4",
  "keypad-4x4-buttons",
  "ttp223",
  "arcade-button",
  "button-12mm-led",
] as const;

export const EXTRA_DISPLAYS_MEDIA: Record<string, string> = Object.fromEntries(
  HINTS.map((hint) => [hint, `${dir}/${hint}.svg`]),
);
