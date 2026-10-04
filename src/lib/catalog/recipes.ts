import type { Recipe } from "./types";

export const recipes: Recipe[] = [
  {
    id: "recipe.buzzer",
    name: "Buzzer Beep",
    summary: "Wire a buzzer to a digital pin and make it beep.",
    boardIds: [
      "board.esp32.devkit",
      "board.arduino.uno",
      "board.arduino.nano",
      "board.arduino.mega",
      "board.pico.rp2040",
      "board.esp8266.nodemcu",
    ],
    moduleIds: ["module.buzzer.active"],
  },
  {
    id: "recipe.lcd.i2c",
    name: "I2C Character LCD",
    summary: "Show text on a character LCD (1602/2004) over I2C.",
    boardIds: [
      "board.esp32.devkit",
      "board.arduino.uno",
      "board.arduino.nano",
      "board.arduino.mega",
      "board.pico.rp2040",
      "board.esp8266.nodemcu",
    ],
    moduleIds: ["module.lcd.i2c.1602", "module.lcd.i2c.2004"],
  },
  {
    id: "recipe.lcd.parallel",
    name: "Parallel Character LCD",
    summary: "Wire a 1602/2004 HD44780 LCD on the full parallel header.",
    boardIds: [
      "board.arduino.uno",
      "board.arduino.nano",
      "board.arduino.mega",
      "board.esp32.devkit",
    ],
    moduleIds: ["module.lcd.parallel.1602", "module.lcd.parallel.2004"],
  },
  {
    id: "recipe.oled",
    name: "OLED SSD1306 Text",
    summary: "Drive a 128x64 OLED over I2C (DATA/CLK).",
    boardIds: [
      "board.esp32.devkit",
      "board.arduino.uno",
      "board.arduino.nano",
      "board.arduino.mega",
    ],
    moduleIds: ["module.oled.ssd1306"],
  },
  {
    id: "recipe.tft",
    name: "ILI9341 TFT Panel",
    summary: "Wire a color TFT (ILI9341 class) over SPI.",
    boardIds: ["board.esp32.devkit", "board.arduino.uno", "board.arduino.mega"],
    moduleIds: ["module.tft.ili9341"],
  },
  {
    id: "recipe.soil",
    name: "Soil Moisture Read",
    summary: "Read soil moisture from an analog sensor.",
    boardIds: [
      "board.esp32.devkit",
      "board.pico.rp2040",
      "board.arduino.uno",
      "board.arduino.nano",
      "board.esp8266.nodemcu",
    ],
    moduleIds: ["module.soil.moisture"],
  },
  {
    id: "recipe.led.resistor",
    name: "LED + Current Limiting Resistor",
    summary: "Prototype an LED with a 220Ω resistor on a breadboard.",
    boardIds: [
      "board.arduino.uno",
      "board.arduino.nano",
      "board.esp32.devkit",
      "board.pico.rp2040",
    ],
    moduleIds: [
      "passive.breadboard.half",
      "passive.resistor.220",
      "passive.led.red",
    ],
  },
  {
    id: "recipe.dht22",
    name: "DHT22 Temp/Humidity",
    summary: "Wire a DHT22 with optional 10k pull-up.",
    boardIds: [
      "board.esp32.devkit",
      "board.arduino.uno",
      "board.arduino.nano",
    ],
    moduleIds: ["module.dht22", "passive.resistor.10k"],
  },
];
