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

Catalog map: `src/lib/catalog/board-assets.ts`.
