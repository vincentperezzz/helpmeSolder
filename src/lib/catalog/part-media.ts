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
  "esp32-devkit": "/photos/esp32-devkit.jpg",
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
};

export function resolvePartPhoto(photoHint?: string): string | null {
  if (!photoHint) return null;
  return PHOTO_FILES[photoHint] ?? null;
}

export function googleImagesLookupUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
