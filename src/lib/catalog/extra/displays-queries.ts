import type { PhotoQueriesOverride } from "../types";

/** Curated outside-photo search phrases for the expansion displays parts, keyed by part id. */
export const EXTRA_DISPLAYS_QUERIES: Record<string, PhotoQueriesOverride> = {
  "module.oled.ssd1306.128x32": ["SSD1306 128x32 OLED", "0.91 inch OLED display", "OLED 128x32 I2C"],
  "module.oled.sh1106.1in3": ["SH1106 OLED", "1.3 inch OLED display SH1106", "SH1106 128x64"],
  "module.tft.st7735.1in8": ["ST7735 1.8 inch TFT", "ST7735 display", "1.8 TFT LCD Arduino"],
  "module.tft.st7789.240x240": ["ST7789 240x240 display", "ST7789 IPS TFT", "ST7789 1.3 inch"],
  "module.epaper.1in54": ["1.54 inch e-paper display", "Waveshare 1.54 e-paper", "e-ink display module 200x200"],
  "module.epaper.2in13": ["2.13 inch e-paper display", "Waveshare 2.13 e-paper", "e-ink display module 250x122"],
  "module.epaper.2in9": ["2.9 inch e-paper display", "Waveshare 2.9 e-paper", "e-ink display module 296x128"],
  "module.epaper.4in2": ["4.2 inch e-paper display", "Waveshare 4.2 e-paper", "e-ink display module 400x300"],
  "module.tm1637.4digit": ["TM1637 display", "TM1637 4-digit 7-segment", "TM1637 module Arduino"],
  "module.max7219.matrix8x8": ["MAX7219 8x8 LED matrix", "MAX7219 dot matrix module", "8x8 LED matrix MAX7219"],
  "module.max7219.7segment8": ["MAX7219 8 digit display", "MAX7219 7-segment module", "8-digit 7-segment MAX7219"],
  "module.lcd.st7920.12864": ["12864 LCD ST7920", "128x64 graphic LCD", "ST7920 LCD display"],
  "module.keypad.3x4": ["3x4 membrane keypad", "12 key membrane keypad", "keypad 3x4 Arduino"],
  "module.keypad.4x4.buttons": ["4x4 matrix keypad", "4x4 button keypad module", "16 key matrix keypad"],
  "module.touch.ttp223": ["TTP223 touch sensor", "TTP223 capacitive touch module", "capacitive touch switch module"],
  "module.button.arcade": ["arcade button", "arcade push button LED", "30mm arcade button"],
  "module.button.12mm.led": ["12mm metal push button LED", "metal push button with LED ring", "12mm momentary push button"],
};
