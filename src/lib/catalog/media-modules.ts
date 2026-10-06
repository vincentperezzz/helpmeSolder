/** Thumbnails for modules, sensors, displays and boards. Keyed by catalog `photoHint`. */
const dir = "/photos/modules";

export const MODULE_PART_MEDIA: Record<string, string> = {
  // Boards
  "arduino-nano": `${dir}/arduino-nano.svg`,
  "arduino-mega": `${dir}/arduino-mega.svg`,
  "esp8266-nodemcu": `${dir}/esp8266-nodemcu.svg`,
  "pi-zero-w": `${dir}/pi-zero-w.svg`,
  "pi-3b-plus": `${dir}/pi-3b-plus.svg`,
  "pi-4b": `${dir}/pi-4b.svg`,
  "pi-5": `${dir}/pi-5.svg`,
  pico: `${dir}/pico.svg`,
  "pico-w": `${dir}/pico-w.svg`,
  "pico-2": `${dir}/pico-2.svg`,
  "arduino-uno": `${dir}/arduino-uno.svg`,
  // Displays
  "lcd-1602": `${dir}/lcd-1602.svg`,
  "lcd-1602-i2c": `${dir}/lcd-1602-i2c.svg`,
  "lcd-2004": `${dir}/lcd-2004.svg`,
  "lcd-2004-i2c": `${dir}/lcd-2004-i2c.svg`,
  ssd1306: `${dir}/ssd1306.svg`,
  // Sensors and modules
  dht22: `${dir}/dht22.svg`,
  mpu6050: `${dir}/mpu6050.svg`,
  "pir-motion": `${dir}/pir-motion.svg`,
  photoresistor: `${dir}/photoresistor.svg`,
  microsd: `${dir}/microsd.svg`,
  "membrane-keypad": `${dir}/membrane-keypad.svg`,
  "relay-ks2e": `${dir}/relay-ks2e.svg`,
  // Motors
  servo: `${dir}/servo.svg`,
  "stepper-motor": `${dir}/stepper-motor.svg`,
  "biaxial-stepper": `${dir}/generic-motor.svg`,
  // Category-generic stand-ins (use these as a photoHint for parts without specific art)
  "generic-sensor": `${dir}/generic-sensor.svg`,
  "generic-display": `${dir}/generic-display.svg`,
  "generic-motor": `${dir}/generic-motor.svg`,
  "generic-driver": `${dir}/generic-driver.svg`,
  "generic-input": `${dir}/generic-input.svg`,
  "generic-board": `${dir}/generic-board.svg`,
};
