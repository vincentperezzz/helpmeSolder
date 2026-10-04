# ESP / NodeMCU / soil diagram assets

Sibling agents may also write Pico / Pi SVGs under `boards/`. This note documents **only** the ESP + soil pack from branch `cursor/esp-soil-svg-assets-c7f9`.

## Saved files

| Path | Source | License |
| --- | --- | --- |
| `boards/esp32-devkit-v1.svg` | Original HelpmeSolder simplified top-view | **CC0** |
| `boards/esp32-devkit-v1-wokwi.svg` | Extracted from `@wokwi/elements` `wokwi-esp32-devkit-v1` | **MIT** (`LICENSE-MIT-wokwi-elements.txt`) |
| `boards/esp8266-nodemcu.svg` | squix78 `NodeMCUBreadboard.svg` (USB-up + anchors) | **MIT** (`LICENSE-MIT-squix78.txt`) |
| `boards/esp8266-nodemcu-cc0.svg` | Original HelpmeSolder simplified top-view | **CC0** |
| `boards/esp32-s3-devkitc.svg` | Original HelpmeSolder DevKitC-style silhouette | **CC0** (optional) |
| `modules/soil-moisture-capacitive.svg` | Original HelpmeSolder capacitive probe | **CC0** |

## Hunt results (rejected)

| Candidate | License | Action |
| --- | --- | --- |
| `wokwi/wokwi-boards` ESP32 / S3 board.svg | **No LICENSE** | Not redistributed |
| Atsumitsu / Fritzing ESP32 DOIT parts | **CC BY-SA** | Not saved |
| Espressif `esp-dev-kits` docs art | Apache + **CC-BY-SA** | SA not used |
| Adafruit soil Fritzing | **CC BY-SA** | Not saved |
| OgreTransporter DFRobot soil FZPZ | **GPL-3.0** | Not saved |
| `@wokwi/elements` soil / NodeMCU / ESP32-S3 | Missing | Use CC0 silhouettes |

## Prefer for wiring

- ESP32 DevKit: `esp32-devkit-v1.svg` (CC0 anchors). Keep Wokwi MIT SVG for richer look / parity with `wokwi-esp32-devkit-v1`.
- NodeMCU: `esp8266-nodemcu-cc0.svg` for wire math; MIT Fritzing art for identification.
- Soil moisture: `modules/soil-moisture-capacitive.svg` (`pin-vcc`, `pin-gnd`, `pin-ao`, `pin-do`).

## BoardAssets.tsx recommendation

Mirror `BatteryAssets.tsx` / `getBatteryAsset()`:

1. `src/lib/catalog/boardAssets.ts` maps catalog id to `{ src, width, height, license, pins, caption }`.
2. `src/components/BoardAssets.tsx` renders `<img>` (or inline SVG) and exports pin coords.
3. In `WokwiDiagram` fallback: Wokwi tag if present, else board/module asset, else skeleton.
4. Scale pin coords: `canvasX = part.x + pin.x * (displayWidth / viewBoxWidth)`.

```ts
export const BOARD_ASSETS = {
  "board.esp32.devkit": {
    src: "/assets/boards/esp32-devkit-v1.svg",
    width: 110,
    height: 260,
    license: "CC0 - HelpmeSolder original SVG",
    pins: {
      "3v3": { x: 202, y: 100 },
      gnd: { x: 202, y: 125 },
      vin: { x: 18, y: 456 },
      gpio21: { x: 202, y: 354 },
    },
  },
  "board.esp8266.nodemcu": {
    src: "/assets/boards/esp8266-nodemcu-cc0.svg",
    width: 110,
    height: 260,
    license: "CC0 - HelpmeSolder original SVG",
    pins: {
      "3v3": { x: 202, y: 207 },
      gnd: { x: 202, y: 232 },
      vin: { x: 18, y: 436 },
      d1: { x: 202, y: 105 },
      a0: { x: 18, y: 80 },
    },
  },
} as const;

export const MODULE_ASSETS = {
  "module.soil.moisture": {
    src: "/assets/modules/soil-moisture-capacitive.svg",
    width: 80,
    height: 210,
    license: "CC0 - HelpmeSolder original SVG",
    pins: {
      vcc: { x: 48, y: 42 },
      gnd: { x: 72, y: 42 },
      ao: { x: 96, y: 42 },
      do: { x: 120, y: 42 },
    },
  },
} as const;
```

ESP32 DevKit can keep using the live Wokwi custom element when `part.wokwi.tag === "wokwi-esp32-devkit-v1"`; the standalone SVG covers skeleton/offline/photoHint paths.
