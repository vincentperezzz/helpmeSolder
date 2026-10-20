# Board SVG assets (HelpmeSolder)

Top-down wiring-diagram silhouettes for microcontroller and single-board computers.

## Raspberry Pi family (original)

| File | Board | License |
|------|--------|---------|
| `pico-rp2040.svg` | Raspberry Pi Pico (RP2040), no wireless | Original CC0 for HelpmeSolder |
| `pico-w.svg` | Raspberry Pi Pico W (RP2040 + Wi-Fi module) | Original CC0 for HelpmeSolder |
| `pico-2.svg` | Raspberry Pi Pico 2 (RP2350) | Original CC0 for HelpmeSolder |
| `pi-zero-w.svg` | Raspberry Pi Zero W | Original CC0 for HelpmeSolder |
| `pi-3b-plus.svg` | Raspberry Pi 3 Model B+ | Original CC0 for HelpmeSolder |
| `pi-4b.svg` | Raspberry Pi 4 Model B | Original CC0 for HelpmeSolder |
| `pi-5.svg` | Raspberry Pi 5 | Original CC0 for HelpmeSolder |

These seven SVGs are original clean 2D silhouettes (green PCB, USB, headers, readable labels). Power pins are marked with `data-pin` attributes and labeled groups (`3V3`, `GND`, `VBUS` / `5V`) where applicable.

## Other boards (third-party)

| File | Board | License |
|------|--------|---------|
| `esp8266-nodemcu.svg` | ESP8266 NodeMCU | MIT — see `LICENSE-MIT-squix78.txt` |
| `esp32-devkit-v1-wokwi.svg` | ESP32 DevKit V1 | MIT — see `LICENSE-MIT-wokwi-elements.txt` |

## Generated ESP32 variants (original)

Drawn by `scripts/gen-part-drawings.mjs` (`npm run gen:part-drawings`), which also writes
each drawing's wire terminals to `src/lib/catalog/part-drawings.generated.ts`. Edit the
script, not the SVGs. Header orders follow each board's published pinout.

| File | Board | License |
|------|--------|---------|
| `esp32-s3-devkitc.svg` | ESP32-S3-DevKitC-1 | Original CC0 for HelpmeSolder |
| `esp32-c3-devkitm1.svg` | ESP32-C3-DevKitM-1 | Original CC0 for HelpmeSolder |
| `esp32-c3-supermini.svg` | ESP32-C3 SuperMini | Original CC0 for HelpmeSolder |
| `esp32-cam.svg` | ESP32-CAM (AI-Thinker) | Original CC0 for HelpmeSolder |
| `xiao-esp32c3.svg` | Seeed Studio XIAO ESP32C3 | Original CC0 for HelpmeSolder |

Catalog map: `src/lib/catalog/board-assets.ts`.

## Generated board drawings

The boards with no Wokwi element (Arduino Leonardo, Micro, Nano Every, Pro Mini, D1 Mini,
Pi Zero 2 W, Pico 2 W, Teensy 4.0, Blue Pill, Digispark, micro:bit v2, XIAO RP2040 and the
ESP32 variants above) are drawn by `scripts/drawings/boards.mjs` and `esp32-rfid.mjs`. Same
rules as the modules: edit the script, run `npm run gen:part-drawings`.
