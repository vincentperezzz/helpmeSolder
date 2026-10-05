# Module, sensor, display, motor and board thumbnails

Original SVG illustrations drawn for this project (licence: same as the repository). Each is 320x240, transparent background, soft shadow, no external resources. They are registered by `photoHint` in `src/lib/catalog/media-modules.ts`, which takes precedence over `part-media.ts`.

Specific illustrations
- Boards: arduino-nano, arduino-mega, esp8266-nodemcu, pi-zero-w, pi-sbc (Raspberry Pi 3B+/4B/5)
- Displays: lcd-1602, lcd-1602-i2c, lcd-2004, lcd-2004-i2c, ssd1306
- Sensors/modules: dht22, mpu6050, pir-motion, photoresistor, microsd, membrane-keypad, relay-ks2e
- Motors: stepper-motor

Generic (category) illustrations, for parts with no specific art
- generic-sensor.svg: sensor breakout board (also used by no part today)
- generic-display.svg: small display module
- generic-motor.svg: small motor; used by `biaxial-stepper` (gauge stepper)
- generic-driver.svg: relay / motor driver board
- generic-input.svg: button / input breakout
- generic-board.svg: microcontroller dev board

Kept from `public/photos`: arduino-uno.jpg, pico.jpg (Pico, Pico W, Pico 2), servo.jpg, and the existing SVGs (esp32-devkit, hc-sr04, neopixel family, soil moisture, gas/flame/sound sensors, hx711, ds1307, ir-receiver, ky-040, joystick, tilt switch, led bar graph, 7-segment, heartbeat, ntc, batteries, usb-wall). Basic parts are handled in `media-basic.ts`.
