import type { PhotoQueriesOverride } from "../types";

/**
 * Curated outside-photo search phrases for the expansion boards parts, keyed by part id.
 * A result title must contain every word of the phrase, and a leading minus excludes a
 * word, so similar boards use minus terms to avoid returning each other.
 */
export const EXTRA_BOARDS_QUERIES: Record<string, PhotoQueriesOverride> = {
  "board.arduino.leonardo": ["Arduino Leonardo -Micro -ETH", "Arduino Leonardo"],
  "board.arduino.promini.5v": ["Arduino Pro Mini -Micro -3.3V", "Arduino Pro Mini", "Pro Mini ATmega328"],
  "board.arduino.micro": ["Arduino Micro -Pro -Nano -Leonardo", "Arduino Micro ATmega32U4"],
  "board.arduino.nano.every": ["Arduino Nano Every", "Nano Every ATmega4809"],
  "board.esp32.s3.devkitc1": ["ESP32-S3-DevKitC-1", "ESP32-S3 DevKitC", "ESP32-S3 development board"],
  "board.esp32.c3.devkitm1": ["ESP32-C3-DevKitM-1 -SuperMini", "ESP32-C3 DevKitM", "ESP32-C3 development board -SuperMini"],
  "board.esp32.c3.supermini": ["ESP32-C3 SuperMini", "ESP32 C3 Super Mini", "ESP32-C3 mini board -DevKitM -XIAO"],
  "board.esp32.cam": ["ESP32-CAM", "ESP32-CAM AI-Thinker", "ESP32 CAM OV2640"],
  "board.esp8266.d1mini": ["Wemos D1 Mini -ESP32 -Pro", "D1 mini ESP8266", "LOLIN D1 mini"],
  "board.pi.zero.2w": ["Raspberry Pi Zero 2 W", "Raspberry Pi Zero 2"],
  "board.pico.2w": ["Raspberry Pi Pico 2 W", "Raspberry Pi Pico2 W RP2350"],
  "board.teensy.40": ["Teensy 4.0 -4.1", "Teensy 4.0 PJRC", "Teensy 4.0 board"],
  "board.stm32.bluepill": ["STM32 Blue Pill", "Blue Pill STM32F103", "STM32F103C8T6"],
  "board.digispark.attiny85": ["Digispark ATtiny85", "Digispark", "ATtiny85 USB board"],
  "board.microbit.v2": { commons: ["micro bit V2 -V1", "BBC micro bit v2", "BBC micro bit"], wikipedia: ["Micro Bit"] },
  "board.xiao.esp32c3": ["Seeed XIAO ESP32C3 -RP2040 -SAMD21", "XIAO ESP32-C3", "Seeed Studio XIAO ESP32C3"],
  "board.xiao.rp2040": ["Seeed XIAO RP2040 -ESP32C3", "XIAO RP2040", "Seeed Studio XIAO RP2040"],
};
