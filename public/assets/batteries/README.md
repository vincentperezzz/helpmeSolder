# Battery & power assets

CC0 original SVGs for HelpmeSolder diagrams.

| File | Terminals |
| --- | --- |
| `battery-9v.svg` | Both + and − snaps on **top** |
| `battery-2aa.svg` | + nubs **top**, − flats **bottom** |
| `battery-3aa.svg` | + **top**, − **bottom** |
| `battery-18650.svg` | Button + **top**, flat − **bottom** |
| `usb-wall.svg` | Single USB out on the right |

Wire anchors live in `src/lib/catalog/batteries.ts` and must match the `term-plus` / `term-minus` coordinates in each SVG. If you swap in a real photo, update those terminal coords to the photo’s pixel positions (same coordinate system as the displayed width/height).
