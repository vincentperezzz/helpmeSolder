# PLAN: Flex/ribbon cables and keyed ports (FFC/FPC)

Status: proposal, not built yet. Written against `C:\dev\helpmesolder\.claude\worktrees\project-review-419444` at commit `edb8d2a`.
Scope: Raspberry Pi camera and display ports, the Pi 5 PCIe flex, ESP32-CAM, SPI e-ink panels with an FPC tail, and the flat cables between them.

---

## 0. What the code does today (facts this plan relies on)

| Area | Current behaviour | Why it matters |
|---|---|---|
| `src/lib/catalog/types.ts` | `CatalogPart.kind` is `"board" \| "module" \| "passive"`. `GuideConnection` is always pin to pin (`{instanceId, pinId}`). `Guide` has `connections: GuideConnection[]`. | Nothing can describe a mechanical connector or a cable yet. |
| Pi boards in `boards.ts` | `board.pi.zero.w`, `board.pi.3b.plus`, `board.pi.4b`, `board.pi.5` have only 3 pins (`3V3`, `5V`, `GND`). They use `PI_ELECTRICAL`. | Ports can be added without touching the pins. |
| DB | `guides.connections` is a **jsonb** column (docs/ARCHITECTURE.md lines 47-50). The repository maps `row.connections ?? []`. Migrations are additive and "safe to run more than once", and the app keeps working before they are applied (`isMissingColumnError` fallback in `repository.ts`). | Two options, see section 2.4. |
| PATCH `/api/guides/[id]` (`route.ts`) | A zod `patchSchema` re-declares the connection shape. **zod strips unknown keys**, so a `kind` field in `connections` would be silently dropped today. | The API input must be extended explicitly. |
| `solder-plan.ts` | `isPlugConnection` (id prefix `plug-`) marks "part leg sits in a breadboard hole". `buildSolderItems` drops these, so they get no number. They still take part in nets. | Plug links are still electrical pin links. Ribbons are not, so the same trick is the wrong fit (see 2.4). |
| `validator.ts` | `validateConnection` reports `unknown_pin` for any id that is not a pin. `pin_already_used`, `buildNets` and `validateElectrical` all walk `guide.connections`. | A port id put into `connections` would raise false errors everywhere. |
| `layout-variants.ts` | `toBreadboardLayoutWithWarnings` and `toDirectLayout` **rebuild `connections` from `buildNets`** and return `{...guide, connections}`. | Any link that is not a net is lost when switching views, unless it lives outside `connections`. |
| Diagram | `useWireMeasure.ts` builds anchors from Wokwi `pinInfo`, `board-assets.ts` `terminals`, or a fallback for SkeletonPart. A USB cable is a `Wire` with `plugs?: UsbPlug[]`, drawn thick grey with `UsbPlugShape`. It uses board-local port coordinates from `usb-port.ts` `BOARD_USB_PORTS` (`{kind, side, x, y}`). | `BOARD_USB_PORTS` plus `Wire.plugs` is the pattern to copy for ribbons. |
| Badges and cards | `numbers` comes from `buildSolderItems` order. A badge or card is drawn only when `wire.number` is set. Power wires use `showLabel` pills. | Ribbons get no number, so they get no badge. A pill can name them. |
| Pi SVGs (`public/assets/boards/pi-5.svg` etc.) | Original CC0 drawings. Only GPIO terminals and the USB/HDMI/ETH ports are drawn. There are no CSI/DSI/PCIe connectors (`pi-zero-w.svg` has only a "camera" text). | Art work is needed. |
| MCP `tools.ts` | 14 tools. `route.test.ts` asserts "lists all fourteen tools". `missingForShare` blocks when `connections.length === 0`. | A Pi + camera guide with no wires would be blocked. The test must change. |
| Catalog iteration | `listCatalog()` returns `{boards, modules, passives, recipes}`. These consumers use it: `normalize.ts` (search), `coverage.ts`, `asset-registry.ts`, and tests `media-coverage.test.ts` and `asset-registry.test.ts` (both use `[...boards, ...modules, ...passives]`). | A new cable group must be added in all of them. |
| Legacy diagram | `WiringDiagram.tsx` and `src/lib/diagram/layout.ts` read `connections` only. | Leave them alone. |
| Legacy `mcp/` stdio package | Calls PATCH. Marked legacy in its README. | Out of scope, beyond a README note. |

---

## 1. Goals, non-goals, user stories

### Goals
1. Add a first-class **cable link**: "plug this flat cable or flex tail into that port". It has no solder step, no wire colour, no number, and no electrical net.
2. Give boards and modules **named ports** with connector data: family, pins, pitch, latch, plain-words "where" and "contacts face".
3. Add **cables as catalog items** (kind `cable`) that the beginner buys. They show on the Parts tab.
4. Add **validation** in plain words with alternatives:
   - cable and port do not fit (pins or pitch)
   - camera in the display port
   - board has no such port
   - wrong signal type of cable (camera vs display)
   - a cable that is missing or not needed
   - ESP32-CAM power and programming
   - Pi 5 vs Pi 4 differences
5. **Diagram**: ports drawn on the parts, and a flat strip between them that shows the width step on adapter cables. It has hover and focus but no number badge.
6. **Checklist**: a "Plug in (no soldering)" section with fixed mini-steps (power off, open latch, contacts direction, close latch, tug test).
7. **MCP**:
   - a new `connect_cable` tool
   - a new `ask_camera` decision helper
   - `ports` exposed in `get_part_details`
   - `cables` in `list_catalog`
   - INSTRUCTIONS updated
8. Old saved guides must keep working. There must be no behaviour change for guides without cables.

### Non-goals (v1)
- Modelling single conductors inside a ribbon, or MIPI electrical checks.
- Software setup (libcamera, `dtoverlay`, Arduino sketches). That stays in the AI-written steps and notes.
- Arduino "camera modules" with pin headers (OV7670, ArduCAM Mini SPI). They already work as normal wired modules. ArduCAM boards for the Pi use the same 15-pin FFC and can be added later as data only.
- HAT stacking on the 40-pin header, and the ESP32-CAM sitting on the ESP32-CAM-MB. The model supports a `direct` mate, but these are a stretch for phase 7.
- Detecting the physical cable orientation. We can only infer "likely wrong" from cable data and give very explicit step text.
- The legacy `mcp/` stdio server and the legacy `WiringDiagram.tsx`.
- Turning JST-PH-to-Dupont harnesses (e-paper driver board) into "no solder". They stay as normal wire connections. See open question Q6.

### User stories
- **US1, Pi 5 + Camera Module 3.** "I have a Pi 5 and a Camera Module 3." The AI calls `ask_camera` and learns that the camera ships with a 15-pin "Standard" cable, which does not fit the Pi 5's 22-pin "Mini" port. It adds `cable.flex.cam.mini-std.200` with `connect_cable(from camera:csi, to pi5:cam0)`.
  - The guide shows the camera beside the Pi with a cream strip that is narrow at the Pi end and wide at the camera end.
  - The Parts tab shows the cable card: "narrow end into the Pi 5, wide end into the camera".
  - The Solder tab shows "Plug in, no soldering" with 5 short actions.
  - The Tools tab says no soldering iron is needed.
  - If the AI had used the 15-pin cable, validation would block it: "The Raspberry Pi 5 camera port is the small 22-pin type... use the 22-to-15 pin camera cable", with alternatives.
- **US2, Pi 4 + display confusion.** The AI connects the camera to `pi4:disp`. Error: "On the Pi 4 the CAMERA and DISPLAY connectors look alike. The camera goes into the one labelled CAMERA." Alternative: `board.pi.4b:cam`.
- **US3, ESP32-CAM.** The beginner picks `board.esp32.cam`. The OV2640 tail goes into the board's 24-pin flip-lock socket (a tail link, no cable part).
  - Heads-up: it needs a 5 V supply that can give about 2 A peaks, or it brown-outs.
  - Heads-up: it has no USB port. Use the ESP32-CAM-MB or a USB-serial adapter, and connect IO0 to GND while uploading.
  - Heads-up: IO4 drives the flash LED, IO0/IO2/IO12 are boot pins, and the SD card uses IO2/4/12/13/14/15.
  - Wires to a sensor stay normal numbered wires.
- **US4, e-ink.** A 2.13" panel with a 24-pin FPC tail plugs into the driver HAT socket (tail link). The HAT's 8 signal pins are wired to an ESP32 (normal wires). The flip-latch mini-steps appear in "Plug in". Validation checks that the panel tail and the HAT socket match (24-pin, 0.5 mm).
- **US5, wrong board.** Camera Module 3 + Arduino Uno gives the error "no_compatible_port": "Raspberry Pi cameras need a Raspberry Pi computer with a camera connector (Zero, 3, 4, 5). The Arduino Uno has none." Alternatives: Pi boards and `board.esp32.cam`.

---

## 2. Data model

### 2.1 Catalog types (add to `src/lib/catalog/types.ts`)

```ts
/** Mechanical connector family. ffc (separate flat cable) and fpc (flex tail on a part) mate with the same sockets. */
export type ConnectorFamily = "ffc" | "fpc" | "pin-header" | "jst-ph" | "jst-sh" | "board-to-board";

/** How the socket locks the cable. slide: pull the bar out ~2 mm (Pi CSI/DSI). flip: hinged back-flap lifts up (ESP32-CAM, e-paper). */
export type LatchStyle = "slide" | "flip" | "friction" | "none";

/** What a port carries. Pi 5 MIPI ports take csi and dsi. */
export type PortRole = "csi" | "dsi" | "pcie" | "dvp-camera" | "epaper-panel" | "gpio-stack";

export type PortConnector = {
  family: ConnectorFamily;
  pins: number;
  pitchMm: number;
  /** socket: receptacle on this part. tail: a flex attached to this part that goes INTO a socket. plug: male header (stacking). */
  gender: "socket" | "tail" | "plug";
  latch: LatchStyle; // "none" for tails and plugs
};

export type CatalogPort = {
  id: string;                 // "cam0", "csi", "disp", "pcie", "camera", "fpc"
  label: string;              // as printed on the board, e.g. "CAM/DISP 0", "CAMERA"
  roles: PortRole[];
  connector: PortConnector;
  /** Plain words: where to find it. "Between the micro-HDMI ports and the audio jack." */
  where: string;
  /** Plain words for step text: "the silver contacts face the HDMI ports". Omitted: generic safe wording is used. */
  contactsFace?: string;
  /** Catalog id of the cable that comes in the box with this part (camera modules). */
  includedCableId?: string;
  /** Internal: fact still to be checked against official docs. Shown only in admin. */
  verify?: string;
};

export type CableEndSpec = {
  family: "ffc";
  pins: number;
  pitchMm: number;
  /** Beginner name of this end, e.g. "narrow 22-pin end". */
  label: string;
};

export type CableSpec = {
  ends: [CableEndSpec, CableEndSpec];
  lengthMm: number;
  /** Signals the cable is wired for. A Pi "Standard-Mini" camera cable and a display cable differ (verify). */
  carries: PortRole[];
  /** same-side ("type A", Pi official) or opposite-sides ("type B", reversed). */
  contacts: "same-side" | "opposite-sides";
};
```

Changes to existing types:
- `CatalogPart.kind`: `"board" | "module" | "passive" | "cable"`.
- `CatalogPart.ports?: CatalogPort[]`
- `CatalogPart.cable?: CableSpec` (only for `kind: "cable"`, which has `pins: []`).
- `PartElectrical.peakCurrentMa?: number` (ESP32-CAM, used by the power heads-up).
- `Recipe.cableIds?: string[]`.

Widening `kind` breaks compiles in `coverage.ts` (`categoryOf`, `toRow` take the 3-value union) and in `wokwi/types.ts` `PlacedPart.kind`. That is intended: tsc then lists every place that must decide what a cable is.

### 2.2 Guide types

```ts
export type PortEnd = { instanceId: string; portId: string };

/** "Plug this ribbon (or this part's flex tail) into that port." Not electrical, never soldered. */
export type CableLink = {
  id: string;                    // "cable-1"; must not collide with connection ids
  from: PortEnd;                 // usually the module (camera, panel)
  to: PortEnd;                   // usually the board / driver
  /** Instance id of a kind:"cable" part in guide.parts. Omitted: tail-into-socket, direct mate,
   *  or "use the cable that came with the part" (resolved from includedCableId). */
  cableInstanceId?: string;
  note?: string;
};

export type Guide = {
  // ...unchanged
  /** Optional for backward compatibility: rows and fixtures without it mean []. */
  cables?: CableLink[];
};
```

`GuideConnection` is **unchanged**. All readers use a new helper `guideCables(guide): CableLink[]` (`guide.cables ?? []`) in `src/lib/guides/cables.ts`. Making the field optional keeps every existing test fixture compiling (around 15 files build `Guide` literals).

### 2.3 Where cables live: separate parts, referenced by the link

Decision: **a cable is a `GuidePart` instance with a `kind: "cable"` catalog id, and `CableLink.cableInstanceId` points to it.** `connect_cable` adds or replaces that instance itself, with the deterministic id `${linkId}.cable`, so the AI makes one call.

Why not only an attribute on the link:
- The cable is a thing to **buy**. The Parts tab (`PrepParts` takes `parts`), photos, identify text, variants and watch-outs, admin coverage and the asset registry all work per part. As a part, it gets all of this for free.
- Quantity and labels work naturally ("camera cable, 300 mm").

Costs, all handled:
- `layoutParts` must skip `kind: "cable"`. The strip draws it.
- The validator checks the referenced instance is a cable (`cable_part_invalid`).
- The deterministic instance id means switching cable replaces the old part, with no orphan.
- The validator warns `cable_part_unused` for a cable part that no link references (e.g. one added by hand).

### 2.4 Storage: separate `cables` jsonb column (migration 0007). Recommended over a union inside `connections`

**Option A, union inside `connections`** (`kind: "wire" | "cable"`). No migration. But every consumer of `guide.connections` must narrow:
- `validator.ts`: `validateConnection`, `pin_already_used`, `buildNets`
- `solder-plan.ts`: `buildSolderItems`, colours via `assignWireColors`
- `layout-variants.ts`: both transforms rebuild `connections` from nets, so **cables would be dropped when toggling breadboard view**
- `wokwi/layout.ts`: `seatPassiveOnBreadboard`, `seatPluggedPart`
- `useWireMeasure.ts`, `WokwiDiagram.tsx` (8 uses), `focus.ts` `attachedPartIds`
- `guide/model.ts`, `admin/stats.ts`, `mcp/tools.ts`, the PATCH zod schema, legacy `diagram/layout.ts` and `WiringDiagram.tsx`

Every missed spot is a silent bug, and the colour assignment shifts for existing guides if cables join the label list.

**Option B, `guides.cables jsonb not null default '[]'`.** Pin-level code never sees cables:
- Both layout transforms keep them through `...guide`.
- `buildNets` and the colour list are untouched, so existing guides render exactly the same.

Cost: one additive migration and a deploy order. Reads work before the migration (`row.cables ?? []`). Writes that include `cables` fail with PGRST204/42703 until it is applied. Only guides that use cables are affected.

**Migration `supabase/migrations/0007_guide_cables.sql`:**
```sql
-- Ribbon / flex cable links (see docs/PLAN_FLEX_CONNECTORS.md). Safe to run more than once.
alter table public.guides
  add column if not exists cables jsonb not null default '[]'::jsonb;
```
RLS needs no change (0002 policies are table-level). Deploy order: apply 0007, then deploy the app.

**Repository (`src/lib/guides/repository.ts`):**
- `GuideRow.cables?: CableLink[]`
- `toGuide` sets `cables: row.cables ?? []`
- `updateGuide` patch type adds `cables`.
- Generalise `isMissingColumnError(error, column)`. When `patch.cables` is present and the column is missing, throw `Error("Ribbon cables need migration 0007_guide_cables.sql")` (the MCP `safely()` wrapper turns this into an error).

**API input:** new `src/lib/guides/cable-schema.ts`, shared by the PATCH route and MCP:
```ts
export const portEndSchema = z.object({ instanceId: z.string().max(80), portId: z.string().max(40) });
export const cableLinkSchema = z.object({
  id: z.string().max(80), from: portEndSchema, to: portEndSchema,
  cableInstanceId: z.string().max(80).optional(), note: z.string().max(200).optional(),
});
```
`patchSchema` adds `cables: z.array(cableLinkSchema).max(16).optional()`. The connection schema is unchanged, so old clients behave the same.

---

## 3. Catalog content

All connector facts marked **[V]** must be checked against Raspberry Pi and vendor docs before merge (section 11). Where `contactsFace` is unverified, it is left out, and the step text falls back to the generic wording: "the bare metal strips on the cable face the metal contacts inside the slot".

### 3.1 Ports added to existing boards (`src/lib/catalog/boards.ts`)

| Board id | Port id / label | Roles | Connector | Notes |
|---|---|---|---|---|
| `board.pi.zero.w` | `cam` / "CAMERA" | csi | ffc 22-pin 0.5 mm socket, slide **[V]** | No DSI on Zero/Zero 2 W. Needs the 22-to-15 cable ("Zero camera cable", often 38 mm or 150 mm) **[V]**. |
| `board.pi.3b.plus` | `cam` / "CAMERA" | csi | ffc 15-pin 1.0 mm socket, slide | `where`: between HDMI and audio jack **[V]** |
| `board.pi.3b.plus` | `disp` / "DISPLAY" | dsi | ffc 15-pin 1.0 mm socket, slide | `where`: near the micro-SD edge **[V]** |
| `board.pi.4b` | `cam` / "CAMERA" | csi | ffc 15-pin 1.0 mm socket, slide | between micro-HDMI 1 and audio jack **[V]**. `contactsFace`: "toward the HDMI ports" **[V]** |
| `board.pi.4b` | `disp` / "DISPLAY" | dsi | ffc 15-pin 1.0 mm socket, slide | **[V]** |
| `board.pi.5` | `cam0` / "CAM/DISP 0", `cam1` / "CAM/DISP 1" | csi, dsi | ffc 22-pin 0.5 mm socket, slide **[V]** | 4-lane MIPI, either use. Both cameras or camera + display allowed. |
| `board.pi.5` | `pcie` / "PCIe" | pcie | ffc 16-pin 0.5 mm socket **[V]** | For M.2 HAT+ (stretch). |

### 3.2 New boards
- `board.esp32.cam` "ESP32-CAM (AI-Thinker)"
  - Pins: `5V` (power), `3V3` (power), `GND`, `VCC` (P_OUT, label "VCC (3.3 V or 5 V out, set by jumper)" **[V]**), `U0R` (uart, GPIO3), `U0T` (uart, GPIO1), `IO0`, `IO2`, `IO4`, `IO12`, `IO13`, `IO14`, `IO15` (digital, spi where relevant), `IO16` (digital, "used by PSRAM on most boards" **[V]**).
  - Ports: `camera` / "Camera" (dvp-camera, fpc 24-pin 0.5 mm socket, flip latch **[V]**). The microSD slot is not modelled as a port.
  - Electrical: `logic: "3v3"`, `fiveVTolerantIo: false`, `pins: { "5V": { accepts: {min: 4.75, max: 5.25} } [V], "3V3": out3v3 }`, `peakCurrentMa: 500` **[V]**. Do not put it in `BOARD_USB_PORTS` (it has no USB).
  - `watchOuts`: brown-out, no USB, IO0 to GND to flash, flash LED on IO4, antenna jumper, hot regulator on 9 V.
  - `photoHint: "esp32-cam"`.

### 3.3 New modules (`src/lib/catalog/modules.ts`)

| Id | Name | Ports | Pins | Notes |
|---|---|---|---|---|
| `module.camera.pi.v2` | Raspberry Pi Camera Module 2 (8 MP) | `csi` CAMERA: ffc 15-pin 1.0 mm socket, slide; `includedCableId: cable.flex.cam.std-std.150` **[V]** | none | NoIR variant noted |
| `module.camera.pi.v3` | Raspberry Pi Camera Module 3 (12 MP, autofocus) | `csi` 15-pin 1.0 mm socket; included `cable.flex.cam.std-std.200` **[V]** | none | variants: Standard / Wide / NoIR / NoIR Wide. Watch-out: needs current Raspberry Pi OS (libcamera). |
| `module.camera.pi.hq` | Raspberry Pi High Quality Camera | `csi` 15-pin 1.0 mm **[V]** | none | Needs a C/CS or M12 lens. Included cable **[V]** |
| `module.camera.pi.ai` | Raspberry Pi AI Camera | `csi` 15-pin 1.0 mm **[V]**; included cable(s) **[V]** (believed to ship with both Standard-Standard and Mini-Standard) | none | Pi 5 / Pi 4 notes |
| `module.camera.ov2640` | OV2640 camera (ESP32-CAM camera) | `fpc` tail 24-pin 0.5 mm (dvp-camera) **[V]** | none | "Comes fitted to the ESP32-CAM; check the latch is closed". Fragile tail. |
| `module.display.pi.touch2` | Raspberry Pi Touch Display 2 (7") | `dsi` DSI: ffc 22-pin 0.5 mm socket **[V]**; included cable(s) **[V]** | `5V` power, `GND` (fed by the supplied 2-wire lead to the Pi GPIO 5V/GND) **[V]** | Mixes a cable link with two normal wires. `electrical.supply 5V`. |
| `module.epaper.panel.2in13` | 2.13" e-paper panel (raw, 250x122) | `fpc` tail 24-pin 0.5 mm (epaper-panel) **[V]** | none | `displayClass: "epaper"`, very fragile tail |
| `module.epaper.driver.hat` | e-Paper driver HAT / driver board (SPI) | `panel` FPC socket 24-pin 0.5 mm, flip latch **[V]**; stretch: `gpio40` (gpio-stack, pin-header 40 socket 2.54) | `VCC` (power, 3.3-5 V **[V]**), `GND`, `DIN` (spi), `CLK` (spi), `CS` (spi), `DC`, `RST`, `BUSY` (digital) | Logic per HAT revision **[V]**. Variant: sold pre-assembled with panel. |
| `module.esp32cam.mb` (stretch) | ESP32-CAM-MB programmer board | `stack` pin-header 2x8 socket | none | micro-USB, IO0 button. Direct mate with ESP32-CAM (phase 7). |

`photoHint`s: `pi-camera`, `pi-camera-hq`, `pi-ai-camera`, `ov2640`, `pi-touch-display`, `epaper-panel`, `epaper-hat`, `esp32-cam`, `esp32-cam-mb`.

### 3.4 New cables (`src/lib/catalog/cables.ts`, `kind: "cable"`, `pins: []`)

Naming follows Raspberry Pi product naming: **Standard = 15-pin 1.0 mm, Mini = 22-pin 0.5 mm** **[V]**.

| Id | Name | Ends | Length | carries |
|---|---|---|---|---|
| `cable.flex.cam.std-std.150` | Camera cable, 15-pin to 15-pin, 150 mm | 15/1.0, 15/1.0 | 150 | csi |
| `cable.flex.cam.std-std.200` | ... 200 mm | same | 200 | csi |
| `cable.flex.cam.std-std.500` | ... 500 mm | same | 500 | csi |
| `cable.flex.cam.mini-std.200` | Pi 5 camera cable, 22-pin to 15-pin, 200 mm | 22/0.5 "narrow end", 15/1.0 "wide end" | 200 | csi |
| `cable.flex.cam.mini-std.300` / `.500` | length variants | same | 300 / 500 | csi |
| `cable.flex.cam.mini-std.38` | Pi Zero camera cable (short) | 22/0.5, 15/1.0 | 38 **[V]** | csi |
| `cable.flex.disp.mini-std.200` | Pi 5 display cable, 22-pin to 15-pin | 22/0.5, 15/1.0 | 200 | dsi **[V: differs from camera cable]** |
| `cable.flex.mini-mini.200` | 22-pin to 22-pin cable | 22/0.5, 22/0.5 | 200 | csi, dsi **[V]** |
| `cable.flex.pcie.16` (stretch) | PCIe flat cable (comes with M.2 HAT+) | 16/0.5, 16/0.5 | ~ **[V]** | pcie |

All are `contacts: "same-side"` **[V]**. Watch-outs on each: never crease, hold by the edges, the blue stiffener is not the contact side **[V]**.

### 3.5 Recipes (`recipes.ts`)
- `recipe.pi.camera` (boards Pi Zero W/3B+/4B/5, modules: cameras, `cableIds`: all camera cables)
- `recipe.esp32cam.basic` (board.esp32.cam + ov2640)
- `recipe.epaper.spi` (ESP32/Pico/Pi + panel + driver)

---

## 4. Validator rules

New file `src/lib/guides/cable-validator.ts`, exporting `validateCables(guide): ValidationIssue[]` and `validateEsp32Cam(guide)`. It is called from `validateGuide` right after the `pin_already_used` loop (one added line), so `ok`/blocking logic is unchanged.

Messages use part names (`part.label ?? catalog.name`) and port labels, like `describe()` does. Alternatives keep the existing `"<catalogId>:<portId>"` / catalog-id style.

| Code | Severity | Trigger | Message (template) | alternatives[] |
|---|---|---|---|---|
| `unknown_port` | error | `portId` not in `catalog.ports` | "{Part} has no port called {portId}." | `catalogId:portId` of that part's ports |
| `port_is_not_a_pin` (inside `validateConnection`, replaces `unknown_pin`) | error | `add_connection` used a port id as a pin | "{portId} on {Part} is a ribbon-cable port, not a pin. Use connect_cable for it." | that part's ports |
| `cable_unknown_instance` | error | link end or `cableInstanceId` missing from parts | "Cable link {id} refers to a part that is not in the guide." | [] |
| `cable_part_invalid` | error | `cableInstanceId` points to a non-cable part | "{Part} is not a cable." | fitting cable ids |
| `cable_id_clash` | error | link id equals a connection id | "Cable link {id} uses the same id as a wire. Pick another id." | [] |
| `port_already_used` | error | same `instanceId:portId` in two links | "{Port} on {Part} already has a cable in it. Each port takes one cable." | free ports with the same role on that board |
| `port_role_mismatch` | error | from-roles ∩ to-roles is empty (e.g. camera into Pi 4 `disp`) | Pi 3/4: "On the {Board} the CAMERA and DISPLAY connectors look alike. A camera goes into the one labelled CAMERA ({where})." Generic: "{Part} ({role}) cannot go into {Port} ({roles})." | board ports with the matching role |
| `no_compatible_port` | error | a part with a socket/tail role (csi, dsi, dvp-camera, epaper-panel) and **no** part in the guide has a port with that role | "Raspberry Pi cameras need a Raspberry Pi computer with a camera connector (Zero, 3, 4 or 5). The {Board} has none." (variants for dsi, dvp, epaper) | board ids with a matching port + `board.esp32.cam` for camera |
| `cable_end_mismatch` | error | a cable end cannot be paired with each port by pins and pitch (pairing tried both ways) | Pi 5 / Zero port with a 15-pin cable: "The {Board} uses the small 22-pin camera connector (0.5 mm). A 15-pin cable (1 mm) is too wide and will not fit. Use a 22-to-15 pin camera cable." Opposite case: "This cable's narrow 22-pin end does not fit the wide 15-pin CAMERA port." Generic: "{Cable} ({a}-pin {pa} mm and {b}-pin {pb} mm) does not fit {Port A} ({x}-pin {px} mm) and {Port B}." | all cable ids that fit both ports, shortest first |
| `cable_signal_mismatch` **[V-dependent]** | error | `cable.carries` lacks the role in use | "This is a camera cable. A display on the {Board} needs a display cable: the wires inside are in a different order." | fitting cables with the right `carries` |
| `cable_missing` | warning | socket-to-socket link without a cable part, and no `includedCableId` fits | "Which cable? The {Module} comes with a {included} that does not fit the {Board}'s {Port}. Add a {fits} cable." | fitting cable ids |
| (no issue) | none | socket-to-socket, no cable part, `includedCableId` fits | The checklist says "use the cable that came with the {Module}". | |
| `cable_not_needed` | error | a `tail` end plus `cableInstanceId` | "The {Part} has its own flat tail that plugs straight into {Port}. No separate cable is needed." | [] |
| `tail_needs_socket` | error | tail-to-tail, or tail to a `plug` | "{A} and {B} both have flex tails. A tail must go into a connector socket." | sockets with that role |
| `cable_contacts_reversed` | warning | `cable.contacts === "opposite-sides"` | "This cable has its contacts on opposite sides at each end. With standard Pi cameras and boards one end will be upside down. Use a same-side cable." | same-side cables that fit |
| `cable_long` | warning | csi/dsi cable over 500 mm **[V threshold]** | "Long camera and display cables can give a noisy or no picture. Use the shortest cable that reaches." | shorter fitting cables |
| `cable_part_unused` | warning | a cable part that no link references | "The {Cable} is listed but not plugged into anything." | [] |
| `camera_not_connected` | warning | a csi/dvp/dsi/panel part has no link, but a compatible port exists | "The {Module} is in the parts list but not plugged in. Connect it to {Port} on the {Board}." | compatible ports |
| `esp32cam_power` | warning | ESP32-CAM and power_source is battery_9v, 2aa or 3aa, or a battery part | "The ESP32-CAM needs a steady 5 V supply that can give about 2 A peaks. Weak supplies cause 'Brownout detector was triggered' restarts. Use a 5 V 2 A USB adapter through the programmer board." 9 V adds "...and the board's small regulator gets hot." | `["usb_wall"]` |
| `esp32cam_3v3_feed` | warning | a supply is wired into ESP32-CAM `3V3` | "Feeding the ESP32-CAM through its 3V3 pin often fails when the camera and Wi-Fi start. Feed 5 V into the 5V pin instead." | `board.esp32.cam:5V` |
| `esp32cam_no_programmer` | warning | ESP32-CAM and no `module.esp32cam.mb` / USB-serial part | "The ESP32-CAM has no USB port. To upload code use the ESP32-CAM-MB programmer board, or a USB-to-serial adapter with IO0 connected to GND while uploading." | `module.esp32cam.mb` |
| `esp32cam_special_pin` | warning | a wire uses IO0, IO2, IO4, IO12 or IO16 (IO13/14/15 when SD is mentioned in notes is optional) | IO4: "drives the bright flash LED". IO0/IO2/IO12: "decide how the board starts; a part pulling them the wrong way stops it booting or uploading". IO16: "is used by the board's memory chip". | free pins: IO13, IO14, IO15 |

Pi 5 vs Pi 4 differences are covered by `cable_end_mismatch` (Pi 5 / Zero tailored text), `port_role_mismatch` (the Pi 3/4 CAMERA vs DISPLAY confusion) and `cable_signal_mismatch`. The board's `watchOuts` cover the rest.

Pure helper in `src/lib/guides/cables.ts` (phase 1), reused by the validator, the checklist, the diagram and MCP:
- `pairCableEnds(cable, portA, portB)` returns `{ endForA, endForB } | null`.
- `fittingCables(portA, portB, role)` returns the sorted cable ids.

---

## 5. Checklist, steps, numbering, Parts and Tools tabs

### 5.1 Plan builder (new `src/lib/guides/cable-plan.ts`)

```ts
export type PlugAction = { id: "power-off" | "open" | "insert" | "close" | "check"; text: string };
export type PlugItem = {
  id: string;                 // CableLink id (same id the diagram uses → hover/focus sync)
  sentence: string;           // "Camera Module 3 to Raspberry Pi 5, port CAM/DISP 0, with the 22-to-15 pin camera cable"
  cableName: string | null;   // null = tail or included cable phrase
  ends: { part: string; port: string; endLabel: string | null; latch: LatchStyle; contacts: string }[];
  actions: PlugAction[];
};
export function buildPlugItems(guide: Guide): PlugItem[];
export function hasCableLinks(guide: Guide): boolean;
```

Action texts, by latch:
- **Power off (always first):** "Shut down the Pi and unplug its power. Never plug or unplug a flat cable while powered."
- **Slide latch:** "Hold the dark bar on {Port} at both ends and pull it gently out about 2 mm. It stays attached; do not pull it off."
- **Flip latch:** "Lift the small hinged flap at the back of the connector with a fingernail, about 90 degrees. It is very thin; never force it."
- **Insert:** "Slide the {endLabel} in straight and fully, {contactsFace ?? 'with the bare metal strips facing the metal contacts inside the slot'}. Keep the cable square, not at an angle."
- **Close:** "Push the bar or flap back down evenly at both ends."
- **Check:** "Tug the cable very gently. It should not move. If one side sits higher, open the latch and try again."

`solder-plan.ts` changes:
- `SolderPlan` gains `plugs: PlugItem[]`. `buildSolderPlan` fills it.
- `buildSolderItems` is **unchanged**, so numbers, colours and existing tests stay the same.
- `describePower`: when the board is `board.esp32.cam` and the source is `usb_wall`, the text is "Plug a USB cable from a phone charger into the programmer board's micro-USB port."

### 5.2 `SolderChecklist.tsx`
- After the numbered wire list, render a section **"Plug in (no soldering)"** with a small ribbon icon. One row per `PlugItem`: no number and no colour swatch, a ribbon glyph, the sentence, and an `<ol>` of actions. Same tick checkbox.
- Ticks are stored under the existing `helpmesolder:solder-ticks:<id>` key. Ids are unique across wires and cables, enforced by `cable_id_clash`.
- Follow mode order is `ids = [...items, ...plugs]`. Plugging comes **last**: "Do the soldering first; plug flat cables in last so heat and flux never reach them." Show this as a one-line note above the section.
- When the guide has plugs but no wire items, the section is the whole tab and the intro reads "Nothing to solder. Plug these in:".
- Counts: `GuideWorkspace.tsx` `counts.solder = plan.items.length + plan.plugs.length`. The tab label stays "Solder" (see Q2).
- `guide/model.ts` `defaultTab`: `connections.length > 0 || (cables?.length ?? 0) > 0` gives `"solder"`.

### 5.3 Parts tab (`PrepParts.tsx`)
- Change the prop to `PrepParts({ parts, cables })`. `GuideWorkspace` passes `guideCables(layoutGuide)`.
- Chip **"No soldering: plugs in with a flat cable"** on parts whose only links are cable links (no wire connection mentions them).
- On cable cards: a "Which end goes where" line built from `pairCableEnds`, e.g. "Narrow 22-pin end: Raspberry Pi 5 CAM/DISP 0. Wide 15-pin end: Camera Module 3."
- When a link uses the included cable: an extra line on the camera card, "Use the cable in the camera box."

### 5.4 Tools tab (`ToolsList.tsx`)
`toolsFor(guide)`:
- If `buildSolderItems(guide).length === 0 && hasCableLinks(guide)`, return `["No soldering iron needed for this build", "Clean, dry hands (hold flat cables by their edges)", "Optional: a plastic spudger or guitar pick for stiff latches (never metal)"]`.
- Otherwise the existing list, plus the spudger item when there are cable links.

Add a second safety paragraph when there are cable links: "Flat cables: power off first, never force a latch, do not crease or fold the cable sharply, and do not touch the metal strips."

Add a ribbon/spudger glyph mapping in `guide/icons.tsx` `toolIcon`.

---

## 6. Diagram

### 6.1 Port placement data
Extend `BoardAsset` in `src/lib/catalog/board-assets.ts`:

```ts
export type PortPlacement = { x: number; y: number; side: "top" | "bottom" | "left" | "right"; length: number };
ports?: Record<string, PortPlacement>; // keyed by CatalogPort.id, part-local coords (like BOARD_USB_PORTS)
```

`(x, y)` is the middle of the slot mouth on the side the cable leaves from. `length` is the slot length in px.

New `src/components/wokwi/port-anchors.ts` provides `portAnchor(catalogId, portId, size): {mouth, outward, length}`:
1. Use `getDiagramAsset(id)?.ports?.[portId]`.
2. Otherwise (SkeletonPart or Wokwi element) fall back to the bottom edge, ports spaced evenly (`size` = measured `offsetWidth/Height`).

Tested in `port-anchors.test.ts`.

### 6.2 Ports on the parts
- **SVG assets.** Add CSI/DSI/PCIe/FPC connector art (dark body + lighter latch bar + small label) to `public/assets/boards/pi-5.svg`, `pi-4b.svg`, `pi-3b-plus.svg`, `pi-zero-w.svg`, at positions from the official mechanical drawings **[V]**. Fill in the `ports` coordinates read from each SVG (same method as `BOARD_USB_PORTS`).
- **New original SVGs** in `public/assets/modules/`: `pi-camera.svg` (25x24 mm board, lens, 15-pin slot), `pi-camera-hq.svg`, `ov2640.svg` (small module with flex tail), `pi-touch-display-2.svg` (back view with DSI slot + 5V/GND pins), `epaper-panel-2in13.svg` (panel + tail), `epaper-driver-hat.svg` (FPC socket + 8-pin row). New board asset `public/assets/boards/esp32-cam.svg` (pins on both long edges + camera socket). All are registered in `moduleAssets` / `boardAssets` with `terminals` and `ports`.
- **SkeletonPart fallback** (`SkeletonPart.tsx`): when `catalog.ports` exists, render a "Ports" row of small chips (`CSI · 15-pin`) along the bottom edge, which matches the fallback anchor. Wokwi elements have no ports. None of the new parts use Wokwi, so the fallback only matters for future parts.

### 6.3 Ribbon wire model and routing
- `src/components/wokwi/types.ts`:
  ```ts
  export type RibbonEnd = { tip: Point; back: Point; width: number; latch: LatchStyle; label: string };
  // on Wire:
  ribbon?: { ends: [RibbonEnd, RibbonEnd]; widthFrom: number; widthTo: number; stepAt?: number };
  ```
- New pure module `src/components/wokwi/ribbon.ts` (with `ribbon.test.ts`):
  - `ribbonWidth(pins, pitchMm)`: symbolic, 15-pin 1 mm = 14 px, 22-pin 0.5 mm = 10 px, 24-pin 0.5 mm = 11 px, 16-pin = 8 px, clamped 8-16.
  - `ribbonSegments(points, widthFrom, widthTo)`: splits the path at the middle (`pointAlongPath`, already in `labels.ts`) into two polylines with a short taper, for adapter cables.
  - `ribbonOutline(points, width)`: square-cornered polygon, so corners look like folds, not curves.
- `useWireMeasure.ts`:
  1. After the part loop, build `portAnchors` for every `guideCables(guide)` end with `portAnchor()`, offset by `part.x/y`.
  2. **Route ribbons first**, before connection wires, with `routedPath(mouth+outward*STIFFENER, ..., exitDir=outward, obstacles)`. A tail link has no cable part; it is drawn the same way with the tail colour.
  3. Add each ribbon's grown bounding segments to `obstacles` as `solid` rectangles, so jumper wires route around ribbons.
  4. Exclude ribbons from `assignLanes` (`LANE_GAP` = 8 is narrower than a ribbon) and from hops: pass `Boolean(wire.plugs || wire.ribbon)` to `hopPoints`.
  5. Ribbon wires use `id = link.id`, `showLabel: true`, short pill text ("Camera cable", "Display cable", "Panel flex") and `title` = `PlugItem.sentence`. No `number`, so `placeBadges` skips them.
  6. Dependency key: add `guide.cables`.
- `WokwiDiagram.tsx`:
  - `refitKey` includes `guideCables(guide).length`.
  - `isConnectionId` and `attachedPartIds` get `[...guide.connections, ...guideCables(guide)]`. The `EndsOf` type already fits `CableLink`.
  - The tooltip for a ribbon uses a new `ribbonTooltip(plugItem)` from `tooltip.ts`.
  - In `wires.map`, add a branch `wire.ribbon ? <RibbonShape wire={wire} emphasized/> : wire.plugs ? ... : ...`.
  - The invisible hit path uses `strokeWidth = max(widthFrom, widthTo) + 8`.
  - The `layoutParts` call is unchanged.
  - The footer text adds "Flat cables are drawn as cream strips." when there are cable links.
- New `src/components/wokwi/RibbonShape.tsx`:
  - Cream ribbon (`#efe6cc`) with a dark outline (`#6d6650`, so it prints on white), 3-4 thin conductor lines.
  - A blue stiffener rectangle at each end (`#1e88e5`, the back side), and a short silver band on the contact side of the end.
  - At the port mouth, a dark connector body with the latch bar drawn "closed".
  - `prefers-reduced-motion`: no trace animation (ribbons do not use `motion-trace`).
- `layout.ts` (`layoutParts`):
  - Skip parts whose catalog `kind === "cable"`. `PlacedPart.kind` stays as is, because cables are never placed.
  - New `placeCabledModules(board, modules, guide)`: a module whose links are only cable links to a placed part is placed **next to that port's side**, offset by `PORT_GAP = 90` from the board edge on `placement.side`, centred on the port.
    - If that spot overlaps a breadboard (x = 620 column), it moves to the board's bottom side instead.
    - Multiple modules on the same side stack along it.
  - Panel tail into HAT: the panel is placed above the HAT on its port side.
- **Breadboard view:** `toBreadboardLayout` / `toDirectLayout` keep `cables` (Option B), so no change is needed. Add a regression test in `layout-variants.test.ts`: cables survive both transforms. A camera never goes on the breadboard: `planPlug` returns null with no used pins (asserted in the test).
- **Print:** ribbons are SVG inside the existing layer. Add one rule in `print.css` (if needed) so the cream fill prints (`print-color-adjust: exact` on `.diagram-wire`), and check it in a print preview.
- **Focus and hide-others:** they work through the shared ids. Hovering a checklist plug row emphasises the ribbon (halo = `strokeOpacity 0.28`, width + 6).

---

## 7. MCP changes (`src/lib/mcp/tools.ts`)

1. **New tool `connect_cable`**:
   ```
   input: { guide_id, id, from: {instanceId, portId}, to: {instanceId, portId}, cable_catalog_id?: string, note?: string }
   ```
   - When `cable_catalog_id` is given and it is a cable, add or replace the part `{instanceId: \`${id}.cable\`, catalogId}` and set `cableInstanceId`.
   - When it is unknown, call `recordMiss({kind: "cable"})` and return `errorResult` with `suggestClosest`.
   - Replace the link by `id`, then use `changeGuide`.
   - The result adds `plugText: buildPlugItems(...)` for that link, so the AI can phrase its step.
   - Description: "Plug a flat ribbon cable or a part's flex tail into a port (camera, display, e-paper panel, PCIe). Not for pins: use add_connection for wires. Port ids come from get_part_details ports[]. If the board's port and the part's port differ (Pi 5 / Zero 22-pin vs camera 15-pin) pass the adapter cable id. Leave cable_catalog_id out when the part has its own flex tail, or when the cable in the part's box fits."
   - To remove a link: re-calling with the same id replaces it. A `remove_cable` tool is open question Q4.
2. **New tool `ask_camera`** (decision helper, like `ask_sensor`), with new `src/lib/mcp/camera-options.ts`.
   - Returns `mustAskUser`, the question "Which camera do you have (Camera Module 3 standard/wide/NoIR, Camera Module 2, HQ camera, AI camera, or an ESP32-CAM board), and which board will it plug into?" and option groups.
   - When `guide_id` has a board, each option includes `cableAdvice` from `fittingCables`, e.g. "Pi 5: add cable.flex.cam.mini-std.200; the camera's own cable will not fit".
3. **`get_part_details`** (`partDetails`):
   - adds `ports: [{id, label, roles, connector: {family, pins, pitchMm, gender, latch}, where, contactsFace, includedCable: {id, name} | null}]`
   - adds `cable: {ends, lengthMm, carries, contacts} | null`
   - adds `solderFree: boolean` (true when the part has ports and no pins)
   - adds `fitsPorts` for cables (board ports it fits). `verify` is never exposed.
4. **`list_catalog`** returns `cables: cables.map(compactPart)`. **`search_catalog`** finds cables because `normalize.ts` includes them (phase 1). **`request_part`** `kind` enum adds `"camera"` and `"cable"` (`part_requests.kind` is free text, so no migration is needed).
5. **`missingForShare`**: `guide.connections.length === 0 && guideCables(guide).length === 0` gives "no connections or cable links yet (call add_connection or connect_cable)".
6. **`add_connection`**: no signature change. The validator's `port_is_not_a_pin` guides the AI.
7. **INSTRUCTIONS**: add a paragraph:
   > "Flat ribbon cables (Pi cameras, Pi displays, e-paper panels, ESP32-CAM camera) are not soldered. Ask which camera and which board first (ask_camera). Use connect_cable with port ids from get_part_details, never add_connection. Pi 5 and Pi Zero have the small 22-pin port: the camera's own 15-pin cable does not fit, so add a 22-to-15 cable. The page generates a 'Plug in' checklist (power off, open latch, contacts direction, close latch), so do not restate it. In set_steps just say 'Plug in the camera cable (see Plug in)' after the soldering steps."

   Also update the "lists all fourteen tools" note.
8. **Server version:** `0.2.0` to `0.3.0`.
9. **Tests:**
   - `src/app/mcp/route.test.ts`: tool list has 16 names; INSTRUCTIONS contains "connect_cable"; `connect_cable` happy path with mocked repository (follow the existing mocking in that file); unknown cable id gives an error with suggestions; `missingForShare` with a cables-only guide gives `readyToShare`.
   - New `src/lib/mcp/camera-options.test.ts`.
10. **Legacy `mcp/`:** README note "cable links not supported in the legacy server". No code.

---

## 8. Admin changes
- `src/lib/admin/coverage.ts`:
  - `CatalogInput.cables`
  - `categoryOf(kind: CatalogPart["kind"], id)`: `"cable"` maps to the new `"cables"` category; module ids matching `/\.camera\./` map to the new `"cameras"` category; `/\.(display|epaper)\./` maps to `"displays"` (extend `MODULE_CATEGORY_IDS` and `MODULE_CATEGORIES`)
  - `CATEGORIES` gains `cameras` ("Cameras: Raspberry Pi camera modules and ESP32-CAM cameras") and `cables` ("Flat cables and adapters")
  - `hasBuiltInDrawing`: `id.startsWith("cable.")` is true (the ribbon is drawn by the diagram)
  - `buildCoverage` adds `cables` rows
- `src/app/admin/catalog/page.tsx`: a "Cables" tile. In `PartsTable`, an optional "Ports" column (e.g. "CAM/DISP 0 · 22-pin 0.5 mm"). A **"Facts to verify"** section listing every `CatalogPort.verify` and cable fact flagged **[V]**, so the owner can tick them off.
- `src/lib/catalog/asset-registry.ts`:
  - include cables
  - for cables `drawingKind` is the built-in ribbon and `drawingRef` is `"RibbonShape"`
  - new audit issue "port {id} has no diagram position" when a part has `ports` but its diagram asset lacks `ports[id]`
  - the test `asset-registry.test.ts` must use `[...boards, ...modules, ...passives, ...cables]`
- Admin requests/searches: no change (kind is free text).

---

## 9. Asset work (all original, CC0 "HelpmeSolder original SVG", like the existing files)

| File | Use |
|---|---|
| `public/assets/boards/pi-5.svg`, `pi-4b.svg`, `pi-3b-plus.svg`, `pi-zero-w.svg` | Add CSI/DSI/PCIe connector art and labels at verified positions; ids `port-cam0` etc. |
| `public/assets/boards/esp32-cam.svg` | New diagram drawing (pins + camera socket + microSD) |
| `public/assets/modules/pi-camera.svg`, `pi-camera-hq.svg`, `pi-ai-camera.svg`, `ov2640.svg`, `pi-touch-display-2.svg`, `epaper-panel-2in13.svg`, `epaper-driver-hat.svg`, `esp32-cam-mb.svg` | Diagram drawings with `ports` (and `terminals` where there are pins) |
| `public/photos/modules/pi-camera.svg`, `pi-camera-hq.svg`, `pi-ai-camera.svg`, `ov2640.svg`, `pi-touch-display.svg`, `epaper-panel.svg`, `epaper-hat.svg`, `esp32-cam.svg`, `esp32-cam-mb.svg`, `ffc-cable-std.svg`, `ffc-cable-mini-std.svg`, `ffc-cable-mini-mini.svg` | Parts-tab thumbnails, registered in `media-modules.ts` (`MODULE_PART_MEDIA`). `media-coverage.test.ts` requires each to exist and be over 500 bytes. |
| `public/photos/guide/ribbon-latch-slide.svg`, `ribbon-latch-flip.svg`, `ribbon-contacts.svg` (optional) | Small how-to illustrations next to the "Plug in" actions |
| `public/assets/modules/README.md` | List new files and licence |

Add `photo-queries.ts` overrides for the new parts (e.g. "Raspberry Pi Camera Module", "ESP32-CAM", "e-paper display", "flexible flat cable") so the outside-photo strip finds good Commons results.

---

## 10. Phased delivery

### Phase 0: fact check (owner or 1 research agent, docs only, about 0.5 day)
- Produce `docs/research/FLEX_CONNECTOR_FACTS.md` covering every **[V]** item, with official URLs (Raspberry Pi documentation: Camera, Display, Pi 5 product brief, mechanical drawings; Waveshare wiki; AI-Thinker ESP32-CAM schematic).
- No code. Blocks merging phase 2 content (not starting it).

### Phase 1, PR1 "Foundation" (single agent, must merge first; about 1.5 days)
Files:
- `src/lib/catalog/types.ts`
- new `src/lib/catalog/cables.ts` (seed: `std-std.200`, `mini-std.200`)
- `src/lib/catalog/index.ts` (`partsById` + `listCatalog().cables`; helpers `getPort(part, id)`)
- `src/lib/catalog/boards.ts`: **only** `ports` on `board.pi.4b` and `board.pi.5` (seed for tests)
- `src/lib/catalog/modules.ts`: **only** `module.camera.pi.v3` (seed)
- new `src/lib/guides/cables.ts` (`guideCables`, `pairCableEnds`, `fittingCables`, `describeLink`)
- new `src/lib/guides/cable-schema.ts`
- `src/lib/guides/repository.ts`
- `supabase/migrations/0007_guide_cables.sql`
- `src/app/api/guides/[id]/route.ts` (patchSchema)
- `src/lib/requests/normalize.ts` (include cables)
- compile fixes only: `src/lib/admin/coverage.ts` (kind union, cables → "other" for now), `src/components/wokwi/layout.ts` (skip cable kind), `src/lib/catalog/asset-registry.ts` (include cables) and its test, `media-coverage.test.ts` (include cables; seed thumbnails `public/photos/modules/ffc-cable-*.svg`, `pi-camera.svg`)
- `docs/ARCHITECTURE.md` (cables column)

Tests: `cables.test.ts` (pairing, fitting), `repository.test.ts` (cables round-trip, missing-column error), `route.test.ts` for PATCH (cables accepted, invalid rejected), `layout-variants.test.ts` (cables preserved).
Risk: low. Without data, nothing renders differently.
Rollback: revert the PR. The migration column is harmless when left in place.

### Then, in parallel (disjoint file ownership)

| WP | Agent | Owns (only these files) | Depends on | Effort |
|---|---|---|---|---|
| **A: Catalog content** | content agent | `src/lib/catalog/boards.ts`, `modules.ts`, `cables.ts`, `recipes.ts`, `media-modules.ts`, `photo-queries.ts`, `public/photos/modules/*` (new thumbnails) | PR1, Phase 0 facts | 2-3 d |
| **B: Validator** | validator agent | new `src/lib/guides/cable-validator.ts` + `.test.ts`; `src/lib/guides/validator.ts` (one call + `port_is_not_a_pin` in `validateConnection`); `validator.test.ts` | PR1 (tests use seed ids; ESP32-CAM tests are added after A merges) | 2 d |
| **C: Checklist, Parts, Tools** | UI-text agent | new `src/lib/guides/cable-plan.ts` + test; `solder-plan.ts` + test; `src/components/SolderChecklist.tsx`, `PrepParts.tsx`, `ToolsList.tsx`, `src/components/guide/icons.tsx`, `guide/model.ts` + test, `GuideWorkspace.tsx` | PR1 | 2 d |
| **D: Diagram** | diagram agent | `src/components/wokwi/*` (types, new `ribbon.ts`, `RibbonShape.tsx`, `port-anchors.ts`, `useWireMeasure.ts`, `layout.ts`, `SkeletonPart.tsx`, `tooltip.ts`, `focus.ts`), `src/components/WokwiDiagram.tsx`, `src/lib/catalog/board-assets.ts`, `public/assets/boards/*`, `public/assets/modules/*`, `src/app/guides/[id]/print.css` | PR1. Imports `buildPlugItems` from C, so **C first lands `cable-plan.ts` with its signature in day 1** (or D uses `describeLink` from PR1 for tooltips and switches later). | 4-5 d |
| **E: MCP** | MCP agent | `src/lib/mcp/tools.ts`, new `src/lib/mcp/camera-options.ts` + test, `src/app/mcp/route.test.ts`, `mcp/README.md`, `docs/HANDOFF.md` / `docs/CONTEXT.md` notes | PR1; uses `cable-plan.ts` (C) for `plugText` (optional, can follow up) | 1.5 d |
| **F: Admin** | admin agent | `src/lib/admin/coverage.ts` + test, `src/app/admin/catalog/page.tsx`, `src/lib/catalog/asset-registry.ts` + test, `src/app/admin/assets/_components/*` | PR1, then A for counts | 1 d |

Conflict notes:
- `layout.ts` is touched in PR1 (one-line skip) and then owned by D only.
- `coverage.ts` and `asset-registry.ts` are touched in PR1 (compile fixes) and then owned by F only.
- `board-assets.ts` (port coordinates) belongs to D even though it sits under `catalog/`. A must not edit it.
- New module diagram SVGs belong to D; thumbnails belong to A.

Merge order: PR1, then A, then (B, C, E in any order), then D, then F. D merges last among UI because it is the riskiest and benefits from the final data.

| PR | Contents | Tests to add | Risk | Rollback |
|---|---|---|---|---|
| PR2 (A) | all content §3 | media/asset tests stay green; snapshot of `get_part_details` for one camera (in E) | facts wrong | revert data; `verify` flags |
| PR3 (B) | rules §4 | each code: positive + negative; message has no ids; alternatives non-empty where promised; Pi 5 + std cable gives `cable_end_mismatch` with `mini-std` alternatives; Pi 4 camera into `disp` gives `port_role_mismatch`; Uno + camera gives `no_compatible_port`; ESP32-CAM + 9 V gives `esp32cam_power` | false blocking errors on valid guides | rules are isolated in one file; revert, or temporarily downgrade severity |
| PR4 (C) | §5 | `cable-plan.test.ts` (actions by latch, included-cable phrase, end labels); `solder-plan.test.ts` (items unchanged when cables exist; numbers unchanged); `model.test.ts` defaultTab | low | revert |
| PR5 (D) | §6 | `ribbon.test.ts`, `port-anchors.test.ts`, `layout` placement tests (camera beside the Pi 5 port; no overlap with the breadboard); `badges.test.ts`: ribbons get no badge; `bounds.test.ts`: ribbons inside bounds; manual: Pi5+cam, Pi4+cam+display, ESP32-CAM, e-ink, breadboard toggle, print preview, phone drawer | high (measure loop, layout overlap) | gate ribbon drawing behind `guideCables(guide).length > 0`; revert does not affect wire-only guides |
| PR6 (E) | §7 | §7 tests | AI misuse | descriptions + validator hints |
| PR7 (F) | §8 | coverage categories; registry port audit | low | revert |
| PR8 (stretch) | direct mates (ESP32-CAM-MB, HATs on `gpio40`), Pi 5 PCIe + M.2 HAT+, `remove_cable` | | | |

---

## 11. Open questions and facts to verify

### Facts to verify (Phase 0)
1. Pi Zero / Zero W / Zero 2 W CSI: 22-pin 0.5 mm? Latch type? Contacts direction? Length of the official Zero camera cable (38 mm? 150 mm?).
2. Pi 3B+/4B CSI and DSI: 15-pin 1.0 mm. Exact location wording. Contacts direction for each (Pi 4 CAMERA believed "contacts toward HDMI").
3. Pi 5 CAM/DISP 0/1: 22-pin 0.5 mm, each usable for CSI or DSI. Contacts direction. Which side of the board.
4. Pi 5 PCIe FFC: 16-pin 0.5 mm?
5. Are the Pi "Standard-Mini" **camera** cable and **display** cable wired differently (not interchangeable)? This decides `cable_signal_mismatch`.
6. Are official cables same-side ("type A")? Do third-party reversed cables exist and matter?
7. Cable shipped with each of: Camera Module 2 (150 mm?), Camera Module 3 (200 mm?), HQ Camera, AI Camera (both cables?), Touch Display 2 (which cables, and whether its connector is 22-pin).
8. Camera Module 3 connector: 15-pin 1 mm on the camera side?
9. ESP32-CAM: camera FPC 24-pin 0.5 mm flip-lock; 5V pin range; peak current; VCC/P_OUT jumper behaviour; IO16 used by PSRAM.
10. Waveshare 2.13" panel FPC (24-pin 0.5 mm?) and driver HAT supply/logic range per revision.
11. A safe cable-length warning threshold for CSI/DSI.

### Owner decisions
- **Q1.** Option B (separate `cables` column + migration 0007) vs Option A (union inside `connections`, no migration). This plan recommends B.
- **Q2.** Rename the "Solder" tab to "Connect" when a guide has cable links, or keep "Solder" with the "Plug in" section?
- **Q3.** Pill label on ribbons ("Camera cable") vs no label (tooltip only)?
- **Q4.** Add `remove_cable` (and generally `remove_part` / `remove_connection`) now, or keep "replace by id"?
- **Q5.** Should a missing cable on a socket-to-socket link be a warning (current plan) or block sharing?
- **Q6.** Dupont/JST harness wires (e-paper driver, Touch Display power lead) are not soldered either. Add a `GuideConnection.method?: "solder" | "jumper"` later, so the checklist can say "push on, no soldering"?
- **Q7.** ESP32-CAM + usb_wall: draw the USB cable into an ESP32-CAM-MB part when present (needs `BOARD_USB_PORTS` for the MB), or keep the generic "5 V from the USB adapter" wire?
- **Q8.** Include the Pi 5 PCIe / M.2 HAT+ in v1, or stretch only?
- **Q9.** Which e-paper sizes: only 2.13" at first, or also 1.54" / 2.9" / 4.2"?

---

## 12. Effort and risk

| Package | Effort | Risk | Main risk |
|---|---|---|---|
| Phase 0 facts | 0.5 d | Medium | Wrong orientation facts mislead beginners. Mitigation: generic wording when unverified, plus the admin "Facts to verify" list. |
| PR1 foundation | 1.5 d | Low | Migration/deploy order. Mitigation: additive column, read fallback, clear write error. |
| A content | 2-3 d | Medium | Data accuracy |
| B validator | 2 d | Medium | False errors that block sharing. Mitigation: blocking only for clear-cut fit/role faults; everything else is a warning. |
| C checklist/tabs | 2 d | Low | |
| D diagram | 4-5 d | **High** | Measure-loop timing, lane/obstacle interplay, layout overlap with the breadboard, print. Mitigation: ribbons routed first as solid obstacles, excluded from lanes; code paths gated on cable links existing. |
| E MCP | 1.5 d | Low-Medium | AI calls `add_connection` with port ids. Mitigation: `port_is_not_a_pin`, INSTRUCTIONS, `ask_camera`. |
| F admin | 1 d | Low | |
| **Total** | **about 15-17 dev-days** (about 1.5-2 calendar weeks with 3-4 parallel agents after PR1) | | |

Guides without cables are protected by design. `connections`, `buildSolderItems`, nets, colours and numbers are untouched, and every new path runs only when `guideCables(guide).length > 0` or the parts have `ports`.

---

### Critical files for implementation
- C:\dev\helpmesolder\.claude\worktrees\project-review-419444\src\lib\catalog\types.ts
- C:\dev\helpmesolder\.claude\worktrees\project-review-419444\src\lib\guides\validator.ts (plus new src\lib\guides\cable-validator.ts and src\lib\guides\cables.ts)
- C:\dev\helpmesolder\.claude\worktrees\project-review-419444\src\components\wokwi\useWireMeasure.ts (with src\components\WokwiDiagram.tsx, src\components\wokwi\layout.ts, src\lib\catalog\board-assets.ts)
- C:\dev\helpmesolder\.claude\worktrees\project-review-419444\src\lib\mcp\tools.ts (with src\app\mcp\route.test.ts)
- C:\dev\helpmesolder\.claude\worktrees\project-review-419444\src\lib\guides\repository.ts (with src\app\api\guides\[id]\route.ts and new supabase\migrations\0007_guide_cables.sql)
