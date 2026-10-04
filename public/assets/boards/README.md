# Board diagram assets (Raspberry Pi)

Top-down wiring-diagram SVGs for HelpmeSolder (identifiable pin layout, not prep photos).

## Saved — original CC0 (prefer for overlays)

| Board / variant | Local path | License | Pin notes |
| --- | --- | --- | --- |
| Pico / Pico H | `pico-rp2040.svg` | Original CC0 | USB top; VBUS/3V3/GND on right header near USB; GP0 left near USB |
| Pico W / Pico WH | `pico-w.svg` | Original CC0 | Same 40-pin layout; Wi-Fi module near USB |
| Pico 2 | `pico-2.svg` | Original CC0 | Same headers; USB-C; RP2350 |
| Zero W | `pi-zero-w.svg` | Original CC0 | GPIO top; pin1=3V3, pin2=5V, pin6=GND; ports left |
| Pi 3 Model B+ | `pi-3b-plus.svg` | Original CC0 | GPIO top; pin1=3V3; µUSB power; full HDMI |
| Pi 4 Model B | `pi-4b.svg` | Original CC0 | GPIO top; USB-C + dual µHDMI; ETH/USB right |
| Pi 5 | `pi-5.svg` | Original CC0 | Same as Pi 4 layout cues; BCM2712 + RP1 |

## Saved — official Raspberry Pi Fritzing (open design grant)

| Board | Local path | License | Download URL |
| --- | --- | --- | --- |
| Pico R3 | `pico-r3-fritzing-breadboard.svg` | RPi open design — `LICENSE-raspberry-pi-open-design.txt` | https://pip-assets.raspberrypi.com/categories/610-raspberry-pi-pico/documents/RP-008310-DS-1-Pico-R3-Fritzing.zip |
| Pico H | `pico-h-fritzing-breadboard.svg` | same | https://pip-assets.raspberrypi.com/categories/753-raspberry-pi-pico-h/documents/RP-008314-DS-2-PicoH-Fritzing.zip |
| Pico W | `pico-w-fritzing-breadboard.svg` | same (antenna patent note in datasheet) | https://pip-assets.raspberrypi.com/categories/686-raspberry-pi-pico-w/documents/RP-008316-DS-1-PicoW-Fritzing.zip |
| Pico 2 | `pico-2-fritzing-breadboard.svg` | same | https://pip-assets.raspberrypi.com/categories/1005-raspberry-pi-pico-2/documents/RP-008300-DS-1-Pico-2-Fritzing-20240708.zip |

## Saved — PinViz (MIT)

| Board | Local path | License | Download URL |
| --- | --- | --- | --- |
| Pico | `pico-pinviz.svg` | MIT — `LICENSE-MIT-pinviz.txt` | https://raw.githubusercontent.com/nordstad/PinViz/main/src/pinviz/assets/pico_mod.svg |
| Pi Zero | `pi-zero-pinviz.svg` | MIT (PinViz Zero commit) | https://raw.githubusercontent.com/nordstad/PinViz/3b17372d2d2daf93f65e680a7918d80eb7d81bef/src/pinviz/assets/pi_zero.svg |
| Pi 4 | `pi-4-pinviz.svg` | MIT | https://raw.githubusercontent.com/nordstad/PinViz/main/src/pinviz/assets/pi_4_mod.svg |
| Pi 5 | `pi-5-pinviz.svg` | MIT | https://raw.githubusercontent.com/nordstad/PinViz/main/src/pinviz/assets/pi_5_mod.svg |

Catalog map: `src/lib/catalog/board-assets.ts`.

## Still missing

| Target | Status |
| --- | --- |
| Pico WH dedicated SVG | Partial — same pinout as Pico W; use `pico-w.svg` / Pico H Fritzing |
| Pico 2 W | Missing Fritzing on PIP (datasheet/pinout only) |
| Zero (non-W) / Zero 2 W dedicated | Partial — use Zero W silhouette; no Zero 2 W Fritzing on PIP |
| Pi 3/4/5 official Fritzing | Missing — mechanical PDFs only; originals + PinViz MIT cover |
| Wikimedia Pico/Pi4 SVGs | Skipped (CC BY-SA) |
| wokwi-boards Pico SVGs | Skipped (no LICENSE) |
| fritzing-parts Zero | Skipped (CC BY-SA 3.0) |
