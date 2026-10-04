# Board diagram assets

## Saved files

| File | Source | License |
| --- | --- | --- |
| `pico-rp2040.svg` | **Original** simplified top-view (HelpmeSolder) | CC0 |
| `pico-r3-fritzing-breadboard.svg` | Official Raspberry Pi Pico R3 Fritzing breadboard SVG | ISC-style open design grant (see `LICENSE-raspberry-pi-pico-design.txt` and datasheet §1.1) |
| `LICENSE-raspberry-pi-pico-design.txt` | From official `RPi-Pico-R3-PUBLIC` design ZIP | Same grant |

Prefer `pico-rp2040.svg` for wiring overlays (small, named pin anchors). Use the Fritzing SVG when a realistic breadboard silhouette is needed.

## `pico-rp2040.svg` pin anchors (`viewBox="0 0 210 520"`)

USB / micro-USB end is at the **top** (low Y).

| Anchor `id` | Approx `(cx, cy)` | Notes |
| --- | --- | --- |
| `usb-end` | USB body ~`(70–140, 8–44)` | Top edge |
| `pin-gp0` | `(18, 70)` | Left header, nearest USB |
| `pin-gnd-1` | `(18, 112)` | First GND on left |
| `pin-gp15` | `(18, 469)` | Left header, far from USB |
| `pin-vbus` | `(192, 70)` | Right header, nearest USB (5 V from USB) |
| `pin-3v3` | `(192, 154)` | 3V3 out |
| `pin-gnd-8` | `(192, 112)` | GND near VBUS/VSYS |
| `pin-gp16` | `(192, 469)` | Right header, far from USB |
| `pin-swclk` / `pin-dbg-gnd` / `pin-swdio` | `(78|105|132, 500)` | Debug pads on bottom edge |

Left column (USB→far): GP0, GP1, GND, GP2…GP5, GND, GP6…GP9, GND, GP10…GP13, GND, GP14, GP15.  
Right column (USB→far): VBUS, VSYS, GND, 3V3_EN, 3V3, ADC_VREF, GP28, GND, GP27, GP26, RUN, GP22, GND, GP21…GP18, GND, GP17, GP16.

Physical board ≈ **21 mm × 51 mm**; pin pitch **2.54 mm**. Pico W shares the same 40-pin header layout (wireless module near USB differs visually).

## Official Fritzing SVG anchors (`viewBox="0 0 826.78 2086.63"`)

| Signal | Fritzing id | Approx `(cx, cy)` |
| --- | --- | --- |
| GP0 | `connector0pin` | `(63.4, 132.6)` |
| GND (pin 3) | `connector2pin` | `(63.4, 332.6)` |
| GP15 | `connector19pin` | `(63.0, 2032.6)` |
| VBUS | `connector39pin` | `(763.0, 132.6)` |
| 3V3 | `connector35pin` | `(763.0, 532.6)` |
| GND (pin 38) | `connector37pin` | `(763.0, 332.6)` |
| GP16 | `connector20pin` | `(763.0, 2032.6)` |

USB end is at low Y (same orientation as the simplified SVG).

## Candidate survey (not all saved)

### 1. Official Raspberry Pi design / Fritzing — **saved**

- **Name:** Pico R3 Fritzing breadboard SVG  
- **Download:** https://pip-assets.raspberrypi.com/categories/610-raspberry-pi-pico/documents/RP-008310-DS-1-Pico-R3-Fritzing.zip (contains `.fzpz` → breadboard SVG)  
- **Also:** Design ZIP https://pip-assets.raspberrypi.com/categories/610-raspberry-pi-pico/documents/RP-008379-DS-1-RPi-Pico-R3-PUBLIC-20200119.zip  
- **License:** Open design grant (“use, copy, modify, and/or distribute … with or without fee”) — ISC/0BSD-like. Datasheet docs themselves are often CC BY-ND; **design files + Fritzing** are covered by the grant in datasheet §1.1 / `LICENSE.txt`.  
- **License URL:** https://pip-assets.raspberrypi.com/categories/610-raspberry-pi-pico/documents/RP-008307-DS-2-pico-datasheet.pdf (§1.1)  
- **Dims / pins:** ~21×51 mm, 40 header pins + 3 SWD, top-view vector (not a photo).  
- **Suitable:** Yes — detailed breadboard top-view.

### 2. Wokwi elements / wokwi-boards

- **`@wokwi/elements` (MIT):** https://github.com/wokwi/wokwi-elements — **no `wokwi-pi-pico`**. Closest RP2040 part is `NanoRP2040ConnectElement` (Arduino Nano RP2040 Connect), not a Pico. License: https://github.com/wokwi/wokwi-elements/blob/main/LICENSE  
- **`wokwi-boards`:** https://github.com/wokwi/wokwi-boards has `boards/pi-pico/board.svg`, `pi-pico-w`, `pi-pico-2`, `pi-pico-2w`.  
  - Direct SVG: https://raw.githubusercontent.com/wokwi/wokwi-boards/main/boards/pi-pico/board.svg  
  - **License:** repo has **no LICENSE file** (GitHub `license: null`). **Not redistributed here.** Artwork is a simplified derivative of the same RPi Fritzing silhouette / viewBox.

### 3. Fritzing parts

- Covered by official Pico R3 Fritzing above (same package). Third-party Fritzing parts vary; prefer the official ZIP.

### 4. Wikimedia Commons / KiCad

- **File:RaspberryPi Pico.svg** — https://commons.wikimedia.org/wiki/File:RaspberryPi_Pico.svg  
  - Direct: https://upload.wikimedia.org/wikipedia/commons/9/92/RaspberryPi_Pico.svg  
  - License: **CC BY-SA 4.0** (share-alike; not plain CC-BY). Top-view diagram SVG. Not saved (SA).  
- **KiCad-RP-Pico** (ncarandini) — footprint library, license NOASSERTION / mixed CC-BY-SA lineage; not a clean MIT top-view SVG.

### 5. Other

- Photos on Commons (Laserlicht) are photos, not diagram SVGs.  
- No clearly MIT/Apache/CC0 third-party Pico **board** SVG was found that beat the official Fritzing grant + original CC0 simplified asset.
