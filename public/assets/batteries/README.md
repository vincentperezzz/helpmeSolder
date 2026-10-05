# Battery & power assets

CC0 original SVGs for HelpmeSolder diagrams. All artwork is generic: no brand names, logos or branded colours.
Brand never matters electrically, only chemistry, size and cell count.

## Where the data lives

One record per power source in `src/lib/catalog/battery-records.ts` (id, label, chemistry, cells, nominal / min / max volts, holder type, terminals, caption and the plain-words text). Everything else is generated from it: the catalog parts (`passives.ts`), the validator voltages (`batteries.ts`), the diagram anchors, the PowerSelector dropdown, MCP `ask_power_source` and the valid `set_power_source` ids.

Existing ids are stored in saved guides, so never rename them.

## Adding a battery

1. Add a line to `scripts/gen-battery-art.mjs` (or hand-draw an SVG with `term-plus` / `term-minus` shapes and give the record explicit `width`/`height`/`terminals`).
2. Run `node scripts/gen-battery-art.mjs`. It writes `public/assets/batteries/<file>.svg`, the Parts-tab thumbnail `public/photos/batteries/<file>.svg` and `src/lib/catalog/battery-geometry.generated.ts`.
3. Add the record (use `cellPack(...)` for AA/AAA/C/D holders, `defineBattery({...})` otherwise).
4. `npm test`: `batteries.test.ts` checks every SVG exists, has no control characters, and that the wire anchors sit on its `term-plus` / `term-minus` shapes.

## Files

| File | Terminals |
| --- | --- |
| `battery-9v.svg` | Both + and − snaps on **top** |
| `battery-2aa.svg`, `battery-3aa.svg` | + **top**, − **bottom** (older hand-made drawings, drawn inline in `BatteryAssets.tsx`) |
| `battery-18650.svg` | Button + **top**, flat − **bottom** |
| `battery-<n><size>[-nimh\|-lithium].svg` | Series holders. Cells alternate direction: even counts have both leads on top, odd counts have + on top and − below the cells |
| `battery-1c.svg`, `battery-1d.svg`, `battery-2d.svg` | C and D cell holders |
| `battery-21700.svg`, `battery-14500.svg`, `battery-cr123a.svg` | Single cylinders, + button top, flat − bottom |
| `battery-cr2032.svg` | Coin cell in a holder, both leads on top |
| `battery-lipo-1s.svg`, `battery-lipo-2s.svg` | LiPo pouch / pack, both wires on top |
| `supply-barrel-9v.svg`, `supply-barrel-12v.svg` | Barrel plug on a screw-terminal adapter, + and − on the right |
| `usb-wall.svg` | Single USB out on the right |

The USB power bank is drawn inline by `UsbWallVisual` (same footprint and socket as the wall adapter); its thumbnail is `public/photos/batteries/power-bank.svg`.

Wire anchors live in `src/lib/catalog/battery-geometry.generated.ts` (new drawings) and `battery-records.ts` (the four older ones) and must match the `term-plus` / `term-minus` coordinates in each SVG. If you swap in a real photo, update those terminal coords to the photo’s pixel positions (same coordinate system as the displayed width/height).
