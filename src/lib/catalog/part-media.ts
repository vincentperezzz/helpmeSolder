const PHOTO_FILES: Record<string, string> = {
  "arduino-mega": "/photos/arduino-mega.jpg",
  "arduino-nano": "/photos/arduino-nano.jpg",
  "arduino-uno": "/photos/arduino-uno.jpg",
  "battery-18650": "/photos/battery-18650.svg",
  "battery-2aa": "/photos/battery-2aa.svg",
  "battery-3aa": "/photos/battery-3aa.svg",
  "battery-9v": "/photos/battery-9v.svg",
  "biaxial-stepper": "/photos/biaxial-stepper.jpg",
  "breadboard-half": "/photos/breadboard-half.jpg",
  "dht22": "/photos/dht22.jpg",
  "dip-switch-8": "/photos/dip-switch-8.jpg",
  "esp8266-nodemcu": "/photos/esp8266-nodemcu.jpg",
  "esp32-devkit": "/photos/esp32-devkit.svg",
  "lcd-1602": "/photos/lcd-1602.jpg",
  "lcd-1602-i2c": "/photos/lcd-1602-i2c.jpg",
  "lcd-2004": "/photos/lcd-2004.jpg",
  "lcd-2004-i2c": "/photos/lcd-2004-i2c.jpg",
  "led-green": "/photos/led-green.jpg",
  "led-red": "/photos/led-red.jpg",
  "membrane-keypad": "/photos/membrane-keypad.jpg",
  "microsd": "/photos/microsd.jpg",
  "mpu6050": "/photos/mpu6050.jpg",
  "photoresistor": "/photos/photoresistor.jpg",
  "pico": "/photos/pico.jpg",
  "pir-motion": "/photos/pir-motion.jpg",
  "potentiometer": "/photos/potentiometer.jpg",
  "pushbutton": "/photos/pushbutton.jpg",
  "relay-ks2e": "/photos/relay-ks2e.jpg",
  "resistor-10k": "/photos/resistor-10k.jpg",
  "resistor-1k": "/photos/resistor-1k.jpg",
  "resistor-220": "/photos/resistor-220.jpg",
  "rgb-led": "/photos/rgb-led.jpg",
  "servo": "/photos/servo.jpg",
  "ssd1306": "/photos/ssd1306.jpg",
  "stepper-motor": "/photos/stepper-motor.jpg",
  "usb-wall": "/photos/usb-wall.svg",
  "buzzer-active": "/photos/buzzer-active.svg",
  "ili9341": "/photos/ili9341.svg",
  "soil-moisture-capacitive": "/photos/soil-moisture-capacitive.svg",
  "hc-sr04": "/photos/hc-sr04.svg",
  "neopixel": "/photos/neopixel.svg",
  "ntc-temperature": "/photos/ntc-temperature.svg",
  "flame-sensor": "/photos/flame-sensor.svg",
  "gas-sensor": "/photos/gas-sensor.svg",
  "hx711": "/photos/hx711.svg",
  "heart-beat": "/photos/heart-beat.svg",
  "big-sound": "/photos/big-sound.svg",
  "small-sound": "/photos/small-sound.svg",
  "ir-receiver": "/photos/ir-receiver.svg",
  "analog-joystick": "/photos/analog-joystick.svg",
  "ky-040": "/photos/ky-040.svg",
  "ds1307": "/photos/ds1307.svg",
  "tilt-switch": "/photos/tilt-switch.svg",
  "led-bar-graph": "/photos/led-bar-graph.svg",
  "7segment": "/photos/7segment.svg",
  "slide-switch": "/photos/slide-switch.svg",
  "slide-potentiometer": "/photos/slide-potentiometer.svg",
  "neopixel-matrix": "/photos/neopixel-matrix.svg",
  "led-ring": "/photos/led-ring.svg",
};

export function resolvePartPhoto(photoHint?: string): string | null {
  if (!photoHint) return null;
  return PHOTO_FILES[photoHint] ?? null;
}

export function googleImagesLookupUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}

export type PartCategory =
  | "Board"
  | "Sensor"
  | "Display"
  | "Output"
  | "Input"
  | "Power"
  | "Basic part";

/** Plain-language type tag, derived from catalog kind, id and name. */
export function partCategory(part?: {
  kind?: string;
  id?: string;
  name?: string;
  photoHint?: string;
}): PartCategory {
  if (!part) return "Basic part";
  if (part.kind === "board") return "Board";
  const t = `${part.id ?? ""} ${part.photoHint ?? ""} ${part.name ?? ""}`.toLowerCase();
  if (/battery|usb-wall|power|supply|9v|18650|aa/.test(t)) return "Power";
  if (/lcd|oled|ssd1306|ili9|tft|7segment|seven|segment|bar-graph|matrix display|epaper/.test(t))
    return "Display";
  if (/button|switch|keypad|joystick|ky-040|encoder|potentiometer|ir-receiver|remote/.test(t))
    return "Input";
  if (/photoresistor|sensor|ntc|dht|pir|mpu|hc-sr|hx711|heart|sound|tilt|ds1307/.test(t))
    return "Sensor";
  if (/buzzer|servo|stepper|motor|relay|(^|[^a-z])led([^a-z]|$)|neopixel|led-ring|speaker/.test(t))
    return "Output";
  if (/resistor|breadboard|capacitor|diode|wire/.test(t)) return "Basic part";
  if (part.kind === "module") return "Sensor";
  return "Basic part";
}
