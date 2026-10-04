# Module diagram assets

## Saved files

| File | Source | License |
| --- | --- | --- |
| `soil-moisture-capacitive.svg` | Original HelpmeSolder simplified top-view | **CC0** |

Prefer this SVG for wiring overlays (`pin-vcc`, `pin-gnd`, `pin-ao`, `pin-do`). Catalog id: `module.soil.moisture`.

Catalog map: `src/lib/catalog/module-assets.ts` (also mirrored in `board-assets.ts` `moduleAssets`).

## Pin anchors (`viewBox="0 0 160 420"`)

Header at the top (low Y); probe tip toward high Y.

| Anchor `id` | Approx `(cx, cy)` | Catalog pin |
| --- | --- | --- |
| `pin-vcc` | `(48, 42)` | `vcc` |
| `pin-gnd` | `(72, 42)` | `gnd` |
| `pin-ao` | `(96, 42)` | `ao` |
| `pin-do` | `(120, 42)` | `do` |

## Candidate survey (not saved)

| Candidate | License | Notes |
| --- | --- | --- |
| Adafruit Fritzing soil sensor | CC BY-SA | Share-alike |
| OgreTransporter DFRobot capacitive soil FZPZ | GPL-3.0 | Copyleft |
| `@wokwi/elements` | MIT but no soil element | Skeleton fallback today |

See also `../boards/ESP-SOIL-ASSETS.md`.
