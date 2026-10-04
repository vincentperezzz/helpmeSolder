# Board diagram assets (ESP / NodeMCU)

See **`ESP-SOIL-ASSETS.md`** for the full hunt notes, rejected candidates, and BoardAssets wiring recipe.

## Saved files

| File | Source | License | Prefer for |
| --- | --- | --- | --- |
| `esp32-devkit-v1.svg` | Original HelpmeSolder simplified top-view | **CC0** | Wiring overlays |
| `esp32-devkit-v1-wokwi.svg` | Extracted from `@wokwi/elements` `wokwi-esp32-devkit-v1` | **MIT** | Richer board look |
| `esp8266-nodemcu.svg` | squix78 `NodeMCUBreadboard.svg` (USB-up + anchors) | **MIT** | Realistic NodeMCU art |
| `esp8266-nodemcu-cc0.svg` | Original HelpmeSolder simplified top-view | **CC0** | Wiring overlays |
| `esp32-s3-devkitc.svg` | Original HelpmeSolder DevKitC-style silhouette | **CC0** | Optional (not in v1 catalog) |

License texts: `LICENSE-MIT-wokwi-elements.txt`, `LICENSE-MIT-squix78.txt`.

### Catalog ids

| Catalog id | Primary SVG |
| --- | --- |
| `board.esp32.devkit` | `esp32-devkit-v1.svg` (Wokwi custom element may still be used in-app) |
| `board.esp8266.nodemcu` | `esp8266-nodemcu-cc0.svg` |

Map: `src/lib/catalog/board-assets.ts`. Soil moisture: `../modules/soil-moisture-capacitive.svg`.
