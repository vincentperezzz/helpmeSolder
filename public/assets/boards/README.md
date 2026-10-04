# Board SVG assets (HelpmeSolder)

Top-down wiring-diagram silhouettes for microcontroller and single-board computers.

## Original CC0 silhouettes

| File | Board | License |
|------|--------|---------|
| `pico-rp2040.svg` | Raspberry Pi Pico (RP2040), no wireless | Original CC0 for HelpmeSolder |
| `pico-w.svg` | Raspberry Pi Pico W (RP2040 + Wi-Fi module) | Original CC0 for HelpmeSolder |
| `pico-2.svg` | Raspberry Pi Pico 2 (RP2350) | Original CC0 for HelpmeSolder |
| `pi-zero-w.svg` | Raspberry Pi Zero W | Original CC0 for HelpmeSolder |
| `pi-3b-plus.svg` | Raspberry Pi 3 Model B+ | Original CC0 for HelpmeSolder |
| `pi-4b.svg` | Raspberry Pi 4 Model B | Original CC0 for HelpmeSolder |
| `pi-5.svg` | Raspberry Pi 5 | Original CC0 for HelpmeSolder |
| `esp8266-nodemcu.svg` | ESP8266 NodeMCU V1.0 style | Original CC0 for HelpmeSolder |
| `esp32-devkit-v1.svg` | ESP32 DevKit V1 style | Original CC0 for HelpmeSolder |
| `esp32-s3-devkitc.svg` | ESP32-S3 DevKitC style (optional) | Original CC0 for HelpmeSolder |

These SVGs are original clean 2D silhouettes (PCB outline, USB, headers, readable labels). Power pins are marked with `data-pin` / `id="pin-*"` anchors and labeled groups (`3V3`, `GND`, `VBUS` / `5V` / `VIN`) where applicable.

### ESP8266 NodeMCU (`esp8266-nodemcu.svg`)

- `viewBox="0 0 220 520"` — USB at top, ESP-12 / antenna area below USB, dual 15-pin rails.
- **CC0** original silhouette (layout facts only). Replaces the former squix78 Fritzing MIT artwork at this path.
- Catalog id: `board.esp8266.nodemcu`.

### ESP32 DevKit V1 (`esp32-devkit-v1.svg`)

- `viewBox="0 0 220 520"` — antenna / WROOM at top, micro-USB at bottom, dual 15-pin rails.
- **CC0** original silhouette for wiring overlays when Wokwi is not used, or for consistent diagram styling.
- Catalog id: `board.esp32.devkit`.
- Third-party Wokwi MIT extract (if present): `esp32-devkit-v1-wokwi.svg` — see `LICENSE-MIT-wokwi-elements.txt`.

## Other boards (third-party)

| File | Board | License |
|------|--------|---------|
| `esp32-devkit-v1-wokwi.svg` | ESP32 DevKit V1 (Wokwi extract) | MIT — see `LICENSE-MIT-wokwi-elements.txt` |
| `*-fritzing-breadboard.svg`, `*-pinviz.svg` | Pico / Pi variants | See matching `LICENSE-*.txt` in this folder |

Catalog map: `src/lib/catalog/board-assets.ts`.
