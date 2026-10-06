import type { PhotoQueriesOverride } from "../types";

/** Curated outside-photo search phrases for the expansion displays parts, keyed by part id. */
export const EXTRA_DISPLAYS_QUERIES: Record<string, PhotoQueriesOverride> = {
  "module.oled.ssd1306.128x32": ["OLED display Arduino", "SSD1306 128x32 OLED"],
  "module.oled.sh1106.1in3": ["SH1106 OLED", "1.3 inch OLED display SH1106", "SH1106 128x64"],
  "module.tft.st7735.1in8": ["Arduino TFT display", "ST7735 1.8 inch TFT"],
  "module.tft.st7789.240x240": ["Arduino TFT display", "ST7789 240x240 display"],
  "module.epaper.1in54": ["Hanshow Nebular 154Q-N", "epaper", "electronic paper display module"],
  "module.epaper.2in13": ["troniTAG 2.13 ESL", "epaper", "electronic paper display module"],
  "module.epaper.2in9": ["epaper", "electronic paper display module"],
  "module.epaper.4in2": ["epaper", "electronic paper display module"],
  "module.tm1637.4digit": ["seven segment display module", "TM1637 display"],
  "module.max7219.matrix8x8": ["8x8 led matrix", "MAX7219 8x8 LED matrix"],
  "module.max7219.7segment8": ["seven segment display module", "MAX7219 8 digit display"],
  "module.lcd.st7920.12864": ["12864 LCD ST7920", "128x64 graphic LCD", "ST7920 LCD display"],
  "module.keypad.3x4": ["3x4 membrane keypad", "12 key membrane keypad", "keypad 3x4 Arduino"],
  "module.keypad.4x4.buttons": ["Keypad arduino", "4x4 matrix keypad"],
  "module.touch.ttp223": ["TTP223 touch sensor", "TTP223 capacitive touch module", "capacitive touch switch module"],
  "module.button.arcade": ["Arcade video game buttons", "arcade button -chording -MIDI -Fighter -controller"],
  "module.button.12mm.led": ["Illuminated Push button switch PB switch with LED"],
};
