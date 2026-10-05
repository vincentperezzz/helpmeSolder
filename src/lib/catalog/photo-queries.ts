import { cleanName } from "./photo-shared";
import type { PartCategory } from "./part-media";

/**
 * Search phrases for outside photos, chosen per catalog part.
 *
 * The catalog name alone often finds nothing ("DHT22 Temp/Humidity") or the
 * wrong thing ("Pushbutton" matches a 1980s control desk), so every part has
 * phrases that were checked against live Commons / Wikipedia / Openverse
 * results. A result title must contain the words of the phrase that found it,
 * so phrases should be words a good photo's file name would really contain.
 */

export type PhotoQueries = {
  /** Commons file searches, tried in order. Also used for Openverse by default. */
  commons: string[];
  /** Exact Wikipedia article titles; empty falls back to searching `commons`. */
  wikipedia: string[];
  openverse: string[];
};

type Override =
  | string[]
  | { commons: string[]; wikipedia?: string[]; openverse?: string[] };

const OVERRIDES: Record<string, Override> = {
  // Boards
  "board.esp32.devkit": {
    commons: ["ESP32 DevKit", "ESP32 development board"],
    wikipedia: ["ESP32"],
  },
  "board.arduino.uno": ["Arduino Uno R3", "Arduino Uno"],
  "board.arduino.nano": ["Arduino Nano V3", "Arduino Nano -clone"],
  "board.arduino.mega": ["Arduino Mega 2560", "Arduino Mega"],
  "board.pico.rp2040": ["Raspberry Pi Pico -W -WH -2 -Zero", "Raspberry Pi Pico"],
  "board.pico.w": ["Raspberry Pi Pico WH", "Raspberry Pi Pico W"],
  "board.pico.2": ["Raspberry Pi Pico 2"],
  "board.pi.zero.w": ["Raspberry Pi Zero W -2", "Raspberry Pi Zero"],
  "board.pi.3b.plus": ["Raspberry Pi 3 Model B+", "Raspberry Pi 3B+"],
  "board.pi.4b": ["Raspberry Pi 4 Model B"],
  "board.pi.5": ["Raspberry Pi 5 -Pico -Zero", "Raspberry Pi 5"],
  "board.esp8266.nodemcu": { commons: ["NodeMCU ESP8266", "NodeMCU"], wikipedia: ["NodeMCU"] },

  // Modules
  "module.buzzer.active": ["piezo buzzer"],
  "module.lcd.i2c.1602": ["16x2 LCD I2C", "16x2 LCD"],
  "module.lcd.parallel.1602": ["HD44780 16x2", "16x2 LCD"],
  "module.lcd.i2c.2004": ["LCD2004", "20x4 LCD", "LCD 20x4"],
  "module.lcd.parallel.2004": ["LCD2004", "20x4 LCD", "LCD 20x4"],
  "module.oled.ssd1306": ["SSD1306", "SSD1306 OLED"],
  "module.tft.ili9341": ["ILI9341"],
  "module.soil.moisture": ["capacitive soil moisture sensor", "soil moisture sensor"],
  "module.dht22": ["DHT22", "DHT22 sensor"],
  "module.hc-sr04": ["HC-SR04", "HC-SR04 ultrasonic"],
  "module.servo": {
    commons: ["servo motor SG90", "micro servo", "servo motor"],
    wikipedia: ["Servomotor"],
  },
  "module.neopixel": ["NeoPixel", "WS2812B"],
  "module.rgb-led": ["RGB LED"],
  "module.pir.motion": {
    commons: ["PIR sensor", "HC-SR501"],
    wikipedia: ["Passive infrared sensor"],
  },
  "module.photoresistor": {
    commons: ["photoresistor", "LDR photoresistor"],
    wikipedia: ["Photoresistor"],
  },
  "module.ntc.temperature": {
    commons: ["NTC thermistor", "thermistor"],
    wikipedia: ["Thermistor"],
  },
  "module.flame": ["flame detector Arduino", "flame sensor Arduino"],
  "module.gas": ["MQ-2 gas sensor", "MQ-135", "gas sensor Arduino"],
  "module.mpu6050": ["MPU-6050 module", "GY-521", "MPU6050"],
  "module.hx711": ["HX711", "load cell amplifier"],
  "module.heart.beat": ["pulse sensor Arduino", "heart rate sensor Arduino"],
  "module.big.sound": ["KY-038", "sound sensor Arduino"],
  "module.small.sound": ["KY-037", "sound sensor Arduino", "microphone sensor module"],
  "module.ir.receiver": ["TSOP infrared receiver", "IR receiver sensor"],
  "module.analog.joystick": ["thumb joystick", "analog joystick module"],
  "module.ky.040": ["rotary encoder -gray -absolute", "KY-040"],
  "module.ds1307": ["DS1307"],
  "module.tilt.switch": ["tilt switch -mercury -deck", "tilt sensor"],
  "module.membrane.keypad": ["keypad 4x4", "membrane keypad -calculator"],
  "module.microsd": ["microSD breakout", "microSD module"],
  "module.led.bar.graph": ["LED bar graph"],
  "module.stepper.motor": {
    commons: ["NEMA 17 stepper motor -Arduino -CNC", "stepper motor"],
    wikipedia: ["Stepper motor"],
  },
  "module.7segment": {
    commons: ["seven segment display"],
    wikipedia: ["Seven-segment display"],
  },
  "module.dip.switch.8": ["DIP switch -cable -printer", "DIP switch"],
  "module.slide.switch": ["slide switch -cross"],
  "module.slide.potentiometer": ["slide potentiometer", "slider potentiometer"],
  "module.neopixel.matrix": ["NeoPixel matrix", "8x8 LED matrix"],
  "module.led.ring": ["NeoPixel ring", "LED ring"],
  "module.biaxial.stepper": ["VID6606", "VID29 stepper motor"],
  "module.relay.ks2e": ["DPDT relay"],

  // Basic parts and power
  "passive.breadboard.half": { commons: ["breadboard"], wikipedia: ["Breadboard"] },
  "passive.resistor.220": { commons: ["axial lead resistors", "resistor"], wikipedia: ["Resistor"] },
  "passive.resistor.1k": { commons: ["axial lead resistors", "resistor"], wikipedia: ["Resistor"] },
  "passive.resistor.10k": { commons: ["axial lead resistors", "resistor"], wikipedia: ["Resistor"] },
  "passive.led.red": ["5mm red LED -RGB -cycling", "Red LED"],
  "passive.led.green": ["5mm green LED -RGB -cycling", "Green LED"],
  "passive.potentiometer": {
    commons: ["potentiometer", "trimmer potentiometer"],
    wikipedia: ["Potentiometer"],
  },
  "passive.pushbutton": ["tactile switch -keyboard", "Tactile switches"],
  "passive.power.usb_wall": ["USB wall charger", "USB power adapter"],
  "passive.power.battery.9v": ["9-volt battery", "9V battery"],
  "passive.power.battery.2aa": ["2xAA battery holder", "AA battery holder"],
  "passive.power.battery.3aa": ["AA battery holder"],
  "passive.power.battery.18650": ["18650 battery", "18650"],
};

/** Fallback phrase for a part without an override: its name plus a noun. */
export function defaultQuery(name: string, category: PartCategory): string {
  const base = cleanName(name);
  if (!base) return "";
  if (category === "Board") return `${base} board`;
  if (category === "Basic part" || category === "Power") return base;
  return `${base} module`;
}

export function photoQueriesFor(
  part: { id: string; name: string },
  category: PartCategory,
): PhotoQueries {
  const override = OVERRIDES[part.id];
  if (override) {
    const spec = Array.isArray(override) ? { commons: override } : override;
    return {
      commons: spec.commons,
      wikipedia: spec.wikipedia ?? [],
      openverse: spec.openverse ?? spec.commons,
    };
  }
  const fallback = defaultQuery(part.name, category);
  const list = fallback ? [fallback] : [];
  return { commons: list, wikipedia: [], openverse: list };
}
