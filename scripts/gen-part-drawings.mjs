// Draws the original (CC0) wiring-diagram SVGs for parts that have no Wokwi
// element, and writes src/lib/catalog/part-drawings.generated.ts with each
// drawing's size and the point every catalog pin's wire ends on. Generating the
// picture and the terminals together keeps them from drifting apart.
//
//   npm run gen:part-drawings
//
// Header orders follow each board's published pinout (physical layout facts
// only, no third-party artwork). src/lib/catalog/part-drawings.test.ts checks
// that every catalog pin has a terminal.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LICENSE = "CC0 - HelpmeSolder original SVG";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r1 = (n) => Math.round(n * 10) / 10;

const STYLE = `
      .hole { fill: #f5f5f5; stroke: #37474f; stroke-width: 1.2; }
      .gnd { fill: #212121; stroke: #000; }
      .pwr { fill: #c62828; stroke: #8e0000; }
      .v3 { fill: #ef6c00; stroke: #e65100; }
      .usb { fill: #cfd8dc; stroke: #546e7a; stroke-width: 1.2; }
      .metal { fill: #b0bec5; stroke: #607d8b; stroke-width: 1; }
      .btn { fill: #eceff1; stroke: #607d8b; stroke-width: 1; }
      .chip { fill: #1a1a1a; stroke: #000; stroke-width: 0.8; }
      .smd { fill: #d7ccc8; stroke: #6d4c41; stroke-width: 0.5; }
      .label { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9px; fill: #eceff1; }
      .pinlbl { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8px; fill: #eceff1; }
      .muted { fill: #90a4ae; }`;

/** Hole colour by what the pin carries, read from its printed label. */
function holeClass(label) {
  if (/^GND$/i.test(label)) return "hole gnd";
  if (/^(5V|VBUS|VIN)$/i.test(label)) return "hole pwr";
  if (/^(3V3|3\.3V)$/i.test(label)) return "hole v3";
  return "hole";
}

function svgDoc({ width, height, title, comment, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <!--
${comment.map((line) => `    ${line}`).join("\n")}
  -->
  <defs>
    <style type="text/css"><![CDATA[${STYLE}
    ]]></style>
  </defs>
${body}
</svg>
`;
}

/**
 * A board with one header down each long side. `left` / `right` list the pins
 * top to bottom as { label, id?, muted? }; `id` is the catalog pin id whose wire
 * ends on that hole (a hole without id is drawn but not wired).
 */
function dualHeaderBoard(spec) {
  const { width, height, board, left, right, pitch, firstY, inset = 14, castellated = false } = spec;
  const lx = board.x + inset;
  const rx = board.x + board.w - inset;
  const terminals = {};
  const holes = [];
  const add = (pins, x, side) => {
    pins.forEach((p, i) => {
      const y = firstY + i * pitch;
      if (castellated) {
        // Gold edge pad cut through by a half hole, as on XIAO-style boards.
        const padX = side === "left" ? board.x - 2 : x - 4;
        holes.push(`    <rect x="${padX}" y="${y - 7}" width="${inset + 6}" height="14" rx="3" fill="#d9b44a" stroke="#a07d1c" stroke-width="0.8"/>`);
        holes.push(`    <circle class="${holeClass(p.label)}" cx="${x}" cy="${y}" r="4.5"/>`);
      } else {
        holes.push(`    <circle class="${holeClass(p.label)}" cx="${x}" cy="${y}" r="6"/>`);
      }
      const tx = side === "left" ? x + 11 : x - 11;
      const anchor = side === "left" ? "start" : "end";
      holes.push(
        `    <text class="pinlbl${p.muted ? " muted" : ""}" x="${tx}" y="${y + 3}" text-anchor="${anchor}">${esc(p.label)}</text>`,
      );
      for (const id of [].concat(p.id ?? [])) terminals[id] = { x, y };
    });
  };
  add(left, lx, "left");
  add(right, rx, "right");
  const body = [
    `  <rect x="${board.x}" y="${board.y}" width="${board.w}" height="${board.h}" rx="${board.rx ?? 8}" fill="${board.fill}" stroke="${board.stroke}" stroke-width="2"/>`,
    spec.decorations,
    `  <g id="headers">`,
    ...holes,
    `  </g>`,
  ].join("\n");
  return { width, height, body, terminals };
}

const usbC = (cx, y, w = 34, h = 14, label) =>
  [
    `  <rect class="usb" x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`,
    `  <rect x="${cx - w / 2 + 6}" y="${y + h / 2 - 2}" width="${w - 12}" height="4" rx="2" fill="#78909c"/>`,
    label ? `  <text class="label" x="${cx}" y="${y - 4}" text-anchor="middle" font-size="7">${esc(label)}</text>` : "",
  ].join("\n");

const button = (x, y, label) =>
  [
    `  <rect class="btn" x="${x - 8}" y="${y - 6}" width="16" height="12" rx="2"/>`,
    `  <circle cx="${x}" cy="${y}" r="3" fill="#90a4ae"/>`,
    `  <text class="label" x="${x}" y="${y + 16}" text-anchor="middle" font-size="7">${esc(label)}</text>`,
  ].join("\n");

const holeMount = (x, y, r = 5) =>
  `  <circle cx="${x}" cy="${y}" r="${r}" fill="#f5f5f5" stroke="#c9a227" stroke-width="2.5"/>`;

/* ----------------------------------------------------------------- drawings */

function rc522() {
  // 40 x 60 mm board, header across the short top edge, antenna coil below.
  const width = 200;
  const height = 300;
  const pins = [
    ["SDA", "SDA"],
    ["SCK", "SCK"],
    ["MOSI", "MOSI"],
    ["MISO", "MISO"],
    ["IRQ", "IRQ"],
    ["GND", "GND"],
    ["RST", "RST"],
    ["3.3V", "3V3"],
  ];
  const pitch = 18;
  const x0 = 100 - (pitch * (pins.length - 1)) / 2;
  const pinY = 40;
  const terminals = {};
  const header = [`  <rect x="${x0 - 11}" y="${pinY - 9}" width="${pitch * (pins.length - 1) + 22}" height="18" rx="2" fill="#1b1b1b"/>`];
  pins.forEach(([label, id], i) => {
    const x = r1(x0 + i * pitch);
    terminals[id] = { x, y: pinY };
    header.push(`  <circle class="${holeClass(label)}" cx="${x}" cy="${pinY}" r="6"/>`);
    header.push(
      `  <text class="pinlbl" x="${x}" y="${pinY + 14}" transform="rotate(90 ${x} ${pinY + 14})" font-size="7.5">${esc(label)}</text>`,
    );
  });
  const coil = [];
  for (let i = 0; i < 4; i++) {
    const d = i * 6;
    coil.push(
      `  <rect x="${36 + d}" y="${120 + d}" width="${128 - 2 * d}" height="${140 - 2 * d}" rx="${10 - i * 2}" fill="none" stroke="#c9d8f2" stroke-width="2.2"/>`,
    );
  }
  const waves = [14, 24, 34, 44]
    .map((r) => `  <path d="M ${100 + r * 0.7} ${190 - r * 0.7} A ${r} ${r} 0 0 1 ${100 + r * 0.7} ${190 + r * 0.7}" fill="none" stroke="#eceff1" stroke-width="2"/>`)
    .concat(
      [14, 24, 34, 44].map(
        (r) => `  <path d="M ${100 - r * 0.7} ${190 - r * 0.7} A ${r} ${r} 0 0 0 ${100 - r * 0.7} ${190 + r * 0.7}" fill="none" stroke="#eceff1" stroke-width="2"/>`,
      ),
    );
  const smd = [
    [52, 72],
    [60, 72],
    [52, 82],
    [138, 72],
    [146, 72],
    [138, 82],
    [70, 104],
    [80, 104],
    [90, 104],
    [100, 104],
    [110, 104],
    [120, 104],
  ]
    .map(([x, y]) => `  <rect class="smd" x="${x}" y="${y}" width="6" height="4" rx="0.6"/>`)
    .join("\n");
  const body = [
    `  <rect x="20" y="22" width="160" height="262" rx="6" fill="#1f56b0" stroke="#143c80" stroke-width="2"/>`,
    holeMount(32, 104),
    holeMount(168, 104),
    holeMount(32, 272),
    holeMount(168, 272),
    ...header,
    smd,
    `  <rect class="chip" x="88" y="70" width="20" height="20" rx="1.5" transform="rotate(45 98 80)"/>`,
    `  <text class="label" x="98" y="98" text-anchor="middle" font-size="6">MFRC522</text>`,
    `  <rect class="metal" x="150" y="74" width="12" height="24" rx="6"/>`,
    ...coil,
    `  <circle cx="100" cy="190" r="4" fill="#eceff1"/>`,
    ...waves,
    `  <text class="label" x="100" y="252" text-anchor="middle" font-size="11" font-weight="bold">RFID-RC522</text>`,
  ].join("\n");
  return {
    id: "module.rfid.rc522",
    kind: "module",
    file: "modules/rc522-rfid.svg",
    caption: "RC522 RFID reader (13.56 MHz, 3.3 V)",
    title: "RC522 RFID reader top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Common blue MFRC522 board: 8-pin header on the short edge, printed antenna coil.",
      "Header left to right: SDA (SPI chip select), SCK, MOSI, MISO, IRQ, GND, RST, 3.3V.",
    ],
    width,
    height,
    body,
    terminals,
    pinExit: { dx: 0, dy: -1 },
  };
}

function esp32S3DevkitC() {
  const gpio = (n, extra = {}) => ({ label: `GPIO${n}`, id: `GPIO${n}`, ...extra });
  const unwired = (n, muted = false) => ({ label: `GPIO${n}`, muted });
  const left = [
    { label: "3V3", id: "3V3.1" },
    { label: "3V3", id: "3V3.2" },
    { label: "RST", id: "EN" },
    gpio(4),
    gpio(5),
    gpio(6),
    gpio(7),
    gpio(15),
    gpio(16),
    gpio(17),
    gpio(18),
    gpio(8),
    unwired(3),
    unwired(46),
    gpio(9),
    gpio(10),
    gpio(11),
    gpio(12),
    gpio(13),
    gpio(14),
    { label: "5V", id: "5V" },
    { label: "GND", id: "GND.1" },
  ];
  const right = [
    { label: "GND", id: "GND.2" },
    { label: "TX", id: "TX" },
    { label: "RX", id: "RX" },
    gpio(1),
    gpio(2),
    gpio(42),
    gpio(41),
    gpio(40),
    gpio(39),
    gpio(38),
    unwired(37, true),
    unwired(36, true),
    unwired(35, true),
    unwired(0),
    unwired(45),
    unwired(48),
    gpio(47),
    gpio(21),
    unwired(20, true),
    unwired(19, true),
    { label: "GND", id: "GND.3" },
    { label: "GND" },
  ];
  const decorations = [
    holeMount(46, 56),
    holeMount(234, 56),
    `  <path d="M112 50 V64 H128 V52 H144 V64 H160 V52 H168 V70" fill="none" stroke="#9e9e9e" stroke-width="2"/>`,
    `  <rect class="metal" x="104" y="72" width="72" height="104" rx="3"/>`,
    `  <text x="140" y="120" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="#263238">ESP32-S3</text>`,
    `  <text x="140" y="134" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="#37474f">WROOM-1</text>`,
    `  <circle cx="140" cy="220" r="6" fill="#ffffff" stroke="#9e9e9e"/>`,
    `  <text class="label" x="140" y="238" text-anchor="middle" font-size="7">RGB</text>`,
    `  <text class="label" x="140" y="330" text-anchor="middle" font-size="8" transform="rotate(-90 140 330)">ESP32-S3-DevKitC-1</text>`,
    button(120, 508, "BOOT"),
    button(160, 508, "RST"),
    usbC(112, 556, 30, 14, "UART"),
    usbC(168, 556, 30, 14, "USB"),
  ].join("\n");
  const art = dualHeaderBoard({
    width: 280,
    height: 580,
    board: { x: 30, y: 40, w: 220, h: 524, fill: "#1d2026", stroke: "#0b0c0f" },
    left,
    right,
    pitch: 21,
    firstY: 92,
    decorations,
  });
  return {
    id: "board.esp32.s3.devkitc1",
    kind: "board",
    file: "boards/esp32-s3-devkitc.svg",
    caption: "ESP32-S3-DevKitC-1",
    title: "ESP32-S3-DevKitC-1 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Module and antenna at the top, the two USB-C ports (UART, USB) at the bottom.",
      "Header order from Espressif's published J1 / J3 pinout. Grey labels are pins",
      "the board reserves (USB data GPIO19/20, octal PSRAM GPIO35-37).",
    ],
    ...art,
  };
}

function esp32C3DevkitM() {
  const io = (n) => ({ label: `GPIO${n}`, id: `GPIO${n}` });
  const left = [
    { label: "GND", id: "GND.1" },
    { label: "3V3", id: "3V3" },
    { label: "3V3" },
    io(2),
    io(3),
    { label: "GND" },
    { label: "RST", id: "RST" },
    { label: "GND" },
    io(0),
    io(1),
    io(10),
    { label: "GND" },
    { label: "5V", id: "5V" },
    { label: "5V" },
    { label: "GND" },
  ];
  const right = [
    { label: "GND", id: "GND.2" },
    { label: "TX", id: "TX" },
    { label: "RX", id: "RX" },
    { label: "GND" },
    io(9),
    io(8),
    { label: "GND" },
    io(7),
    io(6),
    io(5),
    io(4),
    { label: "GND" },
    { label: "GPIO18", muted: true },
    { label: "GPIO19", muted: true },
    { label: "GND" },
  ];
  const decorations = [
    `  <path d="M106 50 V62 H118 V52 H130 V62 H142 V52 H154 V66" fill="none" stroke="#9e9e9e" stroke-width="2"/>`,
    `  <rect class="metal" x="98" y="68" width="64" height="74" rx="3"/>`,
    `  <text x="130" y="104" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#263238">ESP32-C3</text>`,
    `  <text x="130" y="117" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="#37474f">MINI-1</text>`,
    `  <circle cx="130" cy="170" r="5" fill="#ffffff" stroke="#9e9e9e"/>`,
    `  <text class="label" x="130" y="186" text-anchor="middle" font-size="7">RGB</text>`,
    `  <text class="label" x="130" y="270" text-anchor="middle" font-size="8" transform="rotate(-90 130 270)">ESP32-C3-DevKitM-1</text>`,
    button(112, 370, "BOOT"),
    button(148, 370, "RST"),
    `  <rect class="usb" x="114" y="402" width="32" height="14" rx="3"/>`,
    `  <text class="label" x="130" y="398" text-anchor="middle" font-size="7">USB</text>`,
  ].join("\n");
  const art = dualHeaderBoard({
    width: 260,
    height: 424,
    board: { x: 30, y: 40, w: 200, h: 370, fill: "#1d2026", stroke: "#0b0c0f" },
    left,
    right,
    pitch: 21,
    firstY: 82,
    decorations,
  });
  return {
    id: "board.esp32.c3.devkitm1",
    kind: "board",
    file: "boards/esp32-c3-devkitm1.svg",
    caption: "ESP32-C3-DevKitM-1",
    title: "ESP32-C3-DevKitM-1 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "ESP32-C3-MINI-1 module at the top, micro-USB at the bottom.",
      "Header order from Espressif's published J1 / J3 pinout. GPIO18/19 (grey) are USB data.",
    ],
    ...art,
  };
}

function esp32C3SuperMini() {
  const io = (n) => ({ label: `GPIO${n}`, id: `GPIO${n}` });
  // The board has a single GND pad; both catalog grounds end on it.
  const left = [
    { label: "5V", id: "5V" },
    { label: "GND", id: ["GND.1", "GND.2"] },
    { label: "3V3", id: "3V3" },
    io(4),
    io(3),
    io(2),
    io(1),
    io(0),
  ];
  const right = [io(5), io(6), io(7), io(8), io(9), io(10), { label: "RX", id: "RX" }, { label: "TX", id: "TX" }];
  const decorations = [
    usbC(110, 30, 40, 18),
    `  <rect class="chip" x="94" y="132" width="32" height="32" rx="2"/>`,
    `  <text class="label" x="110" y="151" text-anchor="middle" font-size="6">C3</text>`,
    `  <circle cx="110" cy="96" r="3" fill="#42a5f5"/>`,
    `  <text class="label" x="110" y="112" text-anchor="middle" font-size="6">LED</text>`,
    `  <rect x="96" y="234" width="28" height="10" rx="1.5" fill="#455a64"/>`,
    `  <text class="label" x="110" y="228" text-anchor="middle" font-size="6">ANT</text>`,
    `  <text class="label" x="110" y="196" text-anchor="middle" font-size="7">SuperMini</text>`,
  ].join("\n");
  const art = dualHeaderBoard({
    width: 220,
    height: 270,
    board: { x: 30, y: 40, w: 160, h: 214, fill: "#1d2026", stroke: "#0b0c0f", rx: 6 },
    left,
    right,
    pitch: 24,
    firstY: 76,
    decorations,
  });
  return {
    id: "board.esp32.c3.supermini",
    kind: "board",
    file: "boards/esp32-c3-supermini.svg",
    caption: "ESP32-C3 SuperMini",
    title: "ESP32-C3 SuperMini top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "USB-C at the top, antenna at the bottom, eight pads down each side.",
      "Pad order from the commonly printed SuperMini pinout; clones can differ, check the silkscreen.",
    ],
    ...art,
  };
}

function esp32Cam() {
  const io = (n, label = `IO${n}`) => ({ label, id: `IO${n}` });
  // Camera end at the top; both headers start with their supply pin there.
  const left = [{ label: "5V", id: "5V" }, { label: "GND", id: "GND.1" }, io(12), io(13), io(15), io(14), io(2), io(4)];
  const right = [
    { label: "3V3", id: "3V3" },
    { label: "IO16", muted: true },
    io(0),
    { label: "GND", id: "GND.2" },
    { label: "VCC" },
    { label: "U0R", id: "U0R" },
    { label: "U0T", id: "U0T" },
    { label: "GND", id: "GND.3" },
  ];
  const decorations = [
    // microSD socket (metal) under the camera
    `  <rect class="metal" x="82" y="50" width="66" height="92" rx="3" opacity="0.85"/>`,
    // camera: square lens holder with the lens
    `  <rect x="90" y="56" width="50" height="50" rx="5" fill="#141414" stroke="#000"/>`,
    `  <circle cx="115" cy="81" r="17" fill="#1f1f1f" stroke="#3a3a3a" stroke-width="2"/>`,
    `  <circle cx="115" cy="81" r="8" fill="#0b0f2e"/>`,
    `  <circle cx="113" cy="79" r="3" fill="#3949ab"/>`,
    // orange camera ribbon running down to the white FPC connector
    `  <path d="M104 106 H126 V150 H104 Z" fill="#e0912e" stroke="#b86e12" stroke-width="0.8"/>`,
    `  <rect x="80" y="150" width="70" height="26" rx="2" fill="#ece7dc" stroke="#9e9a90"/>`,
    `  <rect x="86" y="158" width="58" height="10" fill="#2b2b2b"/>`,
    // flash LED near the far end, board name under it
    `  <rect x="134" y="262" width="16" height="16" rx="2" fill="#fffde7" stroke="#bdb76b"/>`,
    `  <circle cx="142" cy="270" r="4.5" fill="#fff59d"/>`,
    `  <text class="label" x="142" y="290" text-anchor="middle" font-size="6">FLASH</text>`,
    `  <text class="label" x="104" y="306" text-anchor="middle" font-size="12" font-weight="bold">ESP32-CAM</text>`,
  ].join("\n");
  const art = dualHeaderBoard({
    width: 230,
    height: 340,
    board: { x: 30, y: 40, w: 170, h: 286, fill: "#111214", stroke: "#000", rx: 6 },
    left,
    right,
    pitch: 26,
    firstY: 64,
    decorations,
  });
  return {
    id: "board.esp32.cam",
    kind: "board",
    file: "boards/esp32-cam.svg",
    caption: "ESP32-CAM (AI-Thinker)",
    title: "ESP32-CAM top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Camera end at the top; 5V (left) and 3V3 (right) are the header pins nearest the camera.",
      "Header order from the AI-Thinker ESP32-CAM pinout. IO16 (grey) is used by PSRAM;",
      "VCC is a supply output whose voltage depends on a solder jumper.",
    ],
    ...art,
  };
}

function xiaoEsp32C3() {
  const left = [
    { label: "D0", id: "D0" },
    { label: "D1", id: "D1" },
    { label: "D2", id: "D2" },
    { label: "D3", id: "D3" },
    { label: "D4", id: "D4" },
    { label: "D5", id: "D5" },
    { label: "D6", id: "D6" },
  ];
  const right = [
    { label: "5V", id: "5V" },
    { label: "GND", id: "GND" },
    { label: "3V3", id: "3V3" },
    { label: "D10", id: "D10" },
    { label: "D9", id: "D9" },
    { label: "D8", id: "D8" },
    { label: "D7", id: "D7" },
  ];
  const mono = `font-family="ui-monospace, monospace"`;
  const decorations = [
    // USB-C shell standing over the top edge, charge LED beside it
    `  <rect x="92" y="26" width="56" height="50" rx="8" fill="#d5d9dc" stroke="#7d868c" stroke-width="1.5"/>`,
    `  <rect x="100" y="34" width="40" height="16" rx="8" fill="#9aa3a8"/>`,
    `  <rect x="108" y="40" width="24" height="4" rx="2" fill="#5f686d"/>`,
    `  <rect x="154" y="38" width="6" height="4" rx="1" fill="#ef9a9a"/>`,
    `  <text class="label" x="164" y="44" font-size="7">CH</text>`,
    // shielded module with Seeed's marking
    `  <rect x="80" y="84" width="80" height="102" rx="3" fill="#f4f5f5" stroke="#b0b6ba" stroke-width="1.2"/>`,
    `  <text x="120" y="106" text-anchor="middle" ${mono} font-size="10" font-weight="bold" fill="#263238">seeed</text>`,
    `  <text x="120" y="118" text-anchor="middle" ${mono} font-size="8" fill="#263238">studio</text>`,
    `  <text x="120" y="138" text-anchor="middle" ${mono} font-size="6" fill="#455a64">XIAO-ESP32-C3</text>`,
    `  <text x="104" y="168" text-anchor="middle" ${mono} font-size="9" font-weight="bold" fill="#263238">FC</text>`,
    `  <text x="136" y="168" text-anchor="middle" ${mono} font-size="9" font-weight="bold" fill="#263238">CE</text>`,
    // BOOT button, U.FL antenna socket, RESET button along the bottom edge
    `  <rect x="82" y="196" width="22" height="20" rx="2" fill="#cfd3d6" stroke="#7d868c"/>`,
    `  <circle cx="93" cy="206" r="5" fill="#263238"/>`,
    `  <circle cx="120" cy="206" r="9" fill="#cfd3d6" stroke="#7d868c"/>`,
    `  <circle cx="120" cy="206" r="3.5" fill="#b8860b"/>`,
    `  <rect x="136" y="196" width="22" height="20" rx="2" fill="#cfd3d6" stroke="#7d868c"/>`,
    `  <circle cx="147" cy="206" r="5" fill="#263238"/>`,
    `  <text class="label" x="93" y="228" text-anchor="middle" font-size="7">B</text>`,
    `  <text class="label" x="147" y="228" text-anchor="middle" font-size="7">R</text>`,
  ].join("\n");
  const art = dualHeaderBoard({
    width: 240,
    height: 250,
    board: { x: 40, y: 40, w: 160, h: 196, fill: "#141414", stroke: "#000", rx: 16 },
    left,
    right,
    pitch: 24,
    firstY: 64,
    inset: 10,
    castellated: true,
    decorations,
  });
  return {
    id: "board.xiao.esp32c3",
    kind: "board",
    file: "boards/xiao-esp32c3.svg",
    caption: "Seeed Studio XIAO ESP32C3",
    title: "Seeed Studio XIAO ESP32C3 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "USB-C at the top; D0-D6 down the left side, 5V, GND, 3V3 and D10-D7 down the right.",
      "Pad order from Seeed's published XIAO pinout.",
    ],
    ...art,
  };
}

/* ------------------------------------------------------------------- output */

const drawings = [rc522(), esp32S3DevkitC(), esp32C3DevkitM(), esp32C3SuperMini(), esp32Cam(), xiaoEsp32C3()];

for (const d of drawings) {
  const svg = svgDoc({ width: d.width, height: d.height, title: d.title, comment: d.comment, body: d.body });
  writeFileSync(path.join(root, "public/assets", d.file), svg);
}

const entry = (d) => {
  const terminals = Object.entries(d.terminals)
    .map(([k, p]) => `      ${JSON.stringify(k)}: { x: ${p.x}, y: ${p.y} },`)
    .join("\n");
  return [
    `  ${JSON.stringify(d.id)}: {`,
    `    src: ${JSON.stringify(`/assets/${d.file}`)},`,
    `    width: ${d.width},`,
    `    height: ${d.height},`,
    `    caption: ${JSON.stringify(d.caption)},`,
    `    license: ${JSON.stringify(LICENSE)},`,
    d.pinExit ? `    pinExit: { dx: ${d.pinExit.dx}, dy: ${d.pinExit.dy} },` : null,
    `    terminals: {`,
    terminals,
    `    },`,
    `  },`,
  ]
    .filter((line) => line !== null)
    .join("\n");
};

const ts = [
  "// GENERATED by scripts/gen-part-drawings.mjs. Do not edit; run `npm run gen:part-drawings`.",
  'import type { BoardAsset } from "./board-assets";',
  "",
  "export const GENERATED_BOARD_ASSETS: Record<string, BoardAsset> = {",
  ...drawings.filter((d) => d.kind === "board").map(entry),
  "};",
  "",
  "export const GENERATED_MODULE_ASSETS: Record<string, BoardAsset> = {",
  ...drawings.filter((d) => d.kind === "module").map(entry),
  "};",
  "",
].join("\n");
writeFileSync(path.join(root, "src/lib/catalog/part-drawings.generated.ts"), ts);
console.log(`Wrote ${drawings.length} drawings and src/lib/catalog/part-drawings.generated.ts`);
