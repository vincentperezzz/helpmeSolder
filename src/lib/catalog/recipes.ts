import type { Recipe } from "./types";

export const recipes: Recipe[] = [
  {
    id: "recipe.buzzer",
    name: "Buzzer Beep",
    summary: "Wire an active buzzer to a digital pin and make it beep.",
    boardIds: [
      "board.esp32.devkit",
      "board.pico.rp2040",
      "board.arduino.uno",
      "board.arduino.nano",
      "board.esp8266.nodemcu",
    ],
    moduleIds: ["module.buzzer.active"],
  },
  {
    id: "recipe.lcd",
    name: "I2C LCD Text",
    summary: "Show text on a 1602 LCD over I2C.",
    boardIds: [
      "board.esp32.devkit",
      "board.pico.rp2040",
      "board.arduino.uno",
      "board.arduino.nano",
      "board.esp8266.nodemcu",
    ],
    moduleIds: ["module.lcd.i2c.1602"],
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
];
