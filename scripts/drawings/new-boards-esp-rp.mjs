// New boards (esp-rp group): ESP32-C6-DevKitC-1, LOLIN S2 Mini, Seeed XIAO ESP32S3, Adafruit Feather RP2040.
import { dualHeaderBoard, esc, r1 } from "./_lib.mjs";

const GOLD = "#d9b44a";
const GOLD_D = "#a07d1c";
const mono = `font-family="ui-monospace, monospace"`;

const T = (x, y, s, { fs = 7, fill = "#eceff1", anchor = "middle", rot = 0, bold = false } = {}) =>
  `  <text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" ${mono} font-size="${fs}" fill="${fill}"${bold ? ` font-weight="bold"` : ""}${rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : ""}>${esc(s)}</text>`;

const rect = (x, y, w, h, fill, { rx = 0, stroke, sw = 1 } = {}) =>
  `  <rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${rx ? ` rx="${rx}"` : ""} fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""}/>`;

const tact = (cx, cy, w = 16, h = 14) =>
  [
    `  <rect class="btn" x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="2"/>`,
    `  <circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(Math.min(w, h) * 0.3)}" fill="#37474f"/>`,
  ].join("\n");

const smdc = (x, y, w = 7, h = 4) => `  <rect class="smd" x="${r1(x)}" y="${r1(y)}" width="${w}" height="${h}" rx="0.6"/>`;

const ledS = (cx, cy, fill, w = 8, h = 5) =>
  `  <rect x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="1" fill="${fill}" stroke="#00000066" stroke-width="0.6"/>`;

/** Square QFN/QFP package with leads on all sides. */
function qfp(cx, cy, s, label, { n = 9, fs = 6, sub } = {}) {
  const x = cx - s / 2;
  const y = cy - s / 2;
  const out = [];
  const step = (s - 8) / (n - 1);
  for (let i = 0; i < n; i++) {
    const o = 4 + i * step;
    out.push(`  <path d="M${r1(x + o)} ${r1(y - 3)}V${r1(y)} M${r1(x + o)} ${r1(y + s)}V${r1(y + s + 3)} M${r1(x - 3)} ${r1(y + o)}H${r1(x)} M${r1(x + s)} ${r1(y + o)}H${r1(x + s + 3)}" stroke="#b0bec5" stroke-width="1.4"/>`);
  }
  out.push(`  <rect class="chip" x="${r1(x)}" y="${r1(y)}" width="${s}" height="${s}" rx="1.5"/>`);
  out.push(`  <circle cx="${r1(x + 5)}" cy="${r1(y + 5)}" r="1.4" fill="#555"/>`);
  if (label) out.push(T(cx, cy + (sub ? -1 : 2), label, { fs }));
  if (sub) out.push(T(cx, cy + 7, sub, { fs: fs - 1, fill: "#b0bec5" }));
  return out.join("\n");
}

/** Small IC with leads on the two long sides. */
function soic(cx, cy, w, h, label, { n = 4, fs = 5 } = {}) {
  const out = [];
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const px = cx - w / 2 + step * (i + 0.5);
    out.push(`  <path d="M${r1(px)} ${r1(cy - h / 2 - 3)}V${r1(cy - h / 2)} M${r1(px)} ${r1(cy + h / 2)}V${r1(cy + h / 2 + 3)}" stroke="#b0bec5" stroke-width="1.4"/>`);
  }
  out.push(`  <rect class="chip" x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="1"/>`);
  out.push(`  <circle cx="${r1(cx - w / 2 + 3.5)}" cy="${r1(cy - h / 2 + 3.5)}" r="1.1" fill="#555"/>`);
  if (label) out.push(T(cx, cy + fs * 0.35, label, { fs }));
  return out.join("\n");
}

const crystal = (cx, cy, w, h, label) =>
  [
    `  <rect x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="${r1(h / 2.4)}" fill="#cfd8dc" stroke="#78909c" stroke-width="1"/>`,
    `  <rect x="${r1(cx - w / 2 + 3)}" y="${r1(cy - h / 2 + 3)}" width="${r1(w - 6)}" height="${r1(h - 6)}" rx="1.5" fill="#b0bec5"/>`,
    label ? T(cx, cy + 2, label, { fs: 5, fill: "#263238" }) : "",
  ].join("\n");

/** USB-C receptacle seen from above, mouth facing the top (dir "up") or bottom (dir "down") board edge. */
function usbCShell(cx, edgeY, dir, w = 44) {
  const h = 30;
  const y = dir === "up" ? edgeY - 3 : edgeY - h + 3;
  const mouthY = dir === "up" ? y + 2 : y + h - 2 - 12;
  return [
    `  <rect x="${r1(cx - w / 2)}" y="${r1(y)}" width="${w}" height="${h}" rx="4" fill="#d5d9dc" stroke="#7d868c" stroke-width="1.3"/>`,
    `  <rect x="${r1(cx - w / 2 + 4)}" y="${r1(mouthY)}" width="${w - 8}" height="12" rx="6" fill="#9aa3a8"/>`,
    `  <rect x="${r1(cx - w / 2 + 11)}" y="${r1(mouthY + 4)}" width="${w - 22}" height="4" rx="2" fill="#5f686d"/>`,
  ].join("\n");
}

const holeKind = (label) =>
  /^(G|GND)$/i.test(label) ? " gnd" : /^(5V|VBUS|USB|VIN|BAT|VBAT)$/i.test(label) ? " pwr" : /^(3V3|3V|3\.3V)$/i.test(label) ? " v3" : "";

/** One column of header holes with printed labels beside them. pins: [{label, id?, muted?}] top to bottom. */
function column(pins, x, y0, pitch, side, { r = 5.2, fs = 7, plastic = true } = {}) {
  const out = [];
  const terminals = {};
  if (plastic) out.push(rect(x - 8, y0 - 8, 16, pitch * (pins.length - 1) + 16, "#141414", { rx: 2 }));
  pins.forEach((p, i) => {
    const y = y0 + i * pitch;
    out.push(`  <circle cx="${r1(x)}" cy="${r1(y)}" r="${GOLD ? 7 : 7}" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="0.8" opacity="0.9"/>`);
    out.push(`  <circle class="hole${p.id ? holeKind(p.label) : ""}" cx="${r1(x)}" cy="${r1(y)}" r="${r}"/>`);
    const tx = side === "left" ? x + 12 : x - 12;
    out.push(T(tx, y + fs * 0.38, p.label, { fs, anchor: side === "left" ? "start" : "end", fill: p.id ? "#eceff1" : "#90a4ae" }));
    for (const id of [].concat(p.id ?? [])) terminals[id] = { x: r1(x), y: r1(y) };
  });
  return { svg: out.join("\n"), terminals };
}

// ============================================================ ESP32-C6-DevKitC-1

function esp32C6DevkitC1() {
  const width = 228;
  const height = 470;
  const bx = 20;
  const by = 16;
  const bw = 188;
  const bh = 438;
  const pitch = 17;
  const y0 = by + 30;
  const gpio = (n) => ({ label: String(n), id: `GPIO${n}` });
  const left = [
    { label: "3V3", id: "3V3" },
    { label: "RST", id: "RST" },
    gpio(4), gpio(5), gpio(6), gpio(7), gpio(0), gpio(1), gpio(8), gpio(10), gpio(11), gpio(2), gpio(3),
    { label: "5V", id: "5V" },
    { label: "G", id: "GND.1" },
    { label: "NC" },
  ];
  const right = [
    { label: "G", id: "GND.2" },
    { label: "TX", id: "TX" },
    { label: "RX", id: "RX" },
    gpio(15), gpio(23), gpio(22), gpio(21), gpio(20), gpio(19), gpio(18), gpio(9),
    { label: "G", id: "GND.3" },
    { label: "13" },
    { label: "12" },
    { label: "G", id: "GND.4" },
    { label: "NC" },
  ];
  const L = column(left, bx + 10, y0, pitch, "left");
  const R = column(right, bx + bw - 10, y0, pitch, "right");
  const cx = bx + bw / 2;
  // PCB antenna meander at the very top of the module
  const mx = cx - 52;
  let ant = `M${mx + 6} ${by + 56}`;
  for (let i = 0; i < 6; i++) ant += ` V${by + 14 + (i % 2) * 0} H${mx + 6 + (i + 1) * 15 - 7} V${by + 56} H${mx + 6 + (i + 1) * 15}`;
  const body = [
    rect(bx, by, bw, bh, "#1b1e22", { rx: 8, stroke: "#050607", sw: 2 }),
    `  <circle cx="${bx + 94}" cy="${by + 7}" r="0" fill="none"/>`,
    L.svg,
    R.svg,
    // ESP32-C6-WROOM-1 module: PCB with antenna, silver shield
    rect(mx, by + 6, 104, 172, "#2b3036", { rx: 3, stroke: GOLD, sw: 1 }),
    `  <path d="${ant}" fill="none" stroke="${GOLD}" stroke-width="2.6" stroke-linejoin="round"/>`,
    rect(mx + 4, by + 62, 96, 112, "#cfd8dc", { rx: 2, stroke: "#78909c", sw: 1.2 }),
    rect(mx + 9, by + 67, 86, 102, "#e3e8ea", { rx: 1.5 }),
    T(cx, by + 100, "ESP32-C6", { fs: 10, fill: "#263238", bold: true }),
    T(cx, by + 113, "-WROOM-1", { fs: 8, fill: "#263238", bold: true }),
    T(cx, by + 128, "Wi-Fi 6 BLE", { fs: 5.5, fill: "#455a64" }),
    T(cx, by + 137, "Zigbee Thread", { fs: 5.5, fill: "#455a64" }),
    T(cx, by + 160, "FC  CE", { fs: 6, fill: "#455a64", bold: true }),
    // addressable RGB LED (GPIO8) just under the module
    rect(cx - 25, by + 190, 11, 11, "#fafafa", { rx: 1.5, stroke: "#9e9e9e", sw: 0.8 }),
    `  <circle cx="${cx - 22}" cy="${by + 193}" r="1.3" fill="#ef5350"/><circle cx="${cx - 17}" cy="${by + 193}" r="1.3" fill="#66bb6a"/><circle cx="${cx - 19.5}" cy="${by + 198}" r="1.3" fill="#42a5f5"/>`,
    T(cx - 19.5, by + 212, "RGB", { fs: 5, fill: "#cfd8dc" }),
    // 3V3 power LED and J5 current-measurement jumper
    ledS(cx + 22, by + 195, "#ef5350", 8, 5),
    T(cx + 22, by + 207, "PWR", { fs: 5, fill: "#cfd8dc" }),
    rect(cx + 40, by + 190, 20, 9, "#141414", { rx: 1.5 }),
    `  <circle cx="${cx + 46}" cy="${by + 194.5}" r="2.4" fill="${GOLD}"/><circle cx="${cx + 54}" cy="${by + 194.5}" r="2.4" fill="${GOLD}"/>`,
    T(cx + 50, by + 207, "J5", { fs: 5, fill: "#cfd8dc" }),
    // CP2102N USB bridge, 3V3 regulator and passives
    qfp(cx - 22, by + 300, 30, "CP2102N", { n: 7, fs: 4.5 }),
    `  <rect class="chip" x="${cx + 18}" y="${by + 288}" width="22" height="15" rx="1.5"/>`,
    rect(cx + 40, by + 291, 6, 9, "#1a1a1a"),
    smdc(cx + 12, by + 316, 8, 5),
    smdc(cx + 24, by + 316, 8, 5),
    smdc(cx + 36, by + 316, 8, 5),
    smdc(cx - 56, by + 330, 8, 5),
    smdc(cx - 44, by + 330, 8, 5),
    // BOOT and RST buttons above the two USB-C ports
    tact(cx - 15, by + 372),
    T(cx - 15, by + 388, "BOOT", { fs: 5.5 }),
    tact(cx + 15, by + 372),
    T(cx + 15, by + 388, "RST", { fs: 5.5 }),
    // two USB-C ports on the bottom edge
    usbCShell(cx - 50, by + bh, "down", 40),
    usbCShell(cx + 50, by + bh, "down", 40),
    T(cx - 50, by + bh - 35, "UART", { fs: 6.5 }),
    T(cx + 50, by + bh - 35, "USB", { fs: 6.5 }),
    T(cx, by + 245, "ESP32-C6-DevKitC-1", { fs: 6.5, fill: "#b0bec5" }),
  ].join("\n");
  return {
    id: "board.esp32.c6.devkitc1",
    kind: "board",
    file: "boards/esp32-c6-devkitc-1.svg",
    caption: "ESP32-C6-DevKitC-1",
    title: "ESP32-C6-DevKitC-1 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Black Espressif board: ESP32-C6-WROOM-1 module with its antenna at the top, addressable RGB LED (GPIO8), BOOT and RST buttons and two USB-C ports",
      "(UART bridge and native USB) on the bottom edge.",
      "Left header J1 top to bottom: 3V3, RST, 4, 5, 6, 7, 0, 1, 8, 10, 11, 2, 3, 5V, G, NC. Right header J3: G, TX, RX, 15, 23, 22, 21, 20, 19, 18, 9, G, 13, 12, G, NC.",
      "Pin lists follow Espressif's ESP32-C6-DevKitC-1 v1.2 user guide (16 pins per header). Pins 13 and 12 (USB data) and NC are drawn but not wired in the catalog.",
    ],
    width,
    height,
    body,
    terminals: { ...L.terminals, ...R.terminals },
  };
}

// ============================================================ LOLIN (WEMOS) S2 Mini

function lolinS2Mini() {
  const width = 200;
  const height = 366;
  const bx = 20;
  const by = 16;
  const bw = 160;
  const bh = 334;
  const pitch = 16;
  const y0 = by + 52;
  const io = (n) => ({ label: String(n), id: `GPIO${n}` });
  // pads read in pairs (1,2), (3,4)... from the USB end: left column then right column
  const left = [{ label: "VBUS", id: "VBUS" }, { label: "3V3", id: "3V3" }, io(2), io(4), io(6), io(8), io(10), io(12), io(14), io(16), io(18), io(33), io(35), io(37), io(39), { label: "EN", id: "EN" }];
  const right = [{ label: "GND", id: "GND.1" }, io(1), io(3), io(5), io(7), io(9), io(11), io(13), io(15), io(17), io(21), io(34), io(36), io(38), io(40), { label: "GND", id: "GND.2" }];
  const L = column(left, bx + 10, y0, pitch, "left", { r: 4.6, fs: 6.5 });
  const R = column(right, bx + bw - 10, y0, pitch, "right", { r: 4.6, fs: 6.5 });
  const cx = bx + bw / 2;
  // meander antenna along the bottom end
  let ant = `M${cx - 40} ${by + bh - 12}`;
  for (let i = 0; i < 5; i++) ant += ` V${by + bh - 34} H${cx - 40 + (i + 1) * 16 - 8} V${by + bh - 12} H${cx - 40 + (i + 1) * 16}`;
  const body = [
    rect(bx, by, bw, bh, "#1b1e22", { rx: 8, stroke: "#050607", sw: 2 }),
    L.svg,
    R.svg,
    // USB-C on the top edge, 0 (BOOT) and RST buttons beside it
    usbCShell(cx, by, "up", 44),
    tact(bx + 44, by + 24, 14, 12),
    T(bx + 44, by + 40, "0", { fs: 6 }),
    tact(bx + bw - 44, by + 24, 14, 12),
    T(bx + bw - 44, by + 40, "RST", { fs: 6 }),
    // blue LED on GPIO15 and the 3.3 V regulator
    ledS(cx + 10, by + 62, "#42a5f5", 7, 4),
    `  <rect class="chip" x="${cx - 14}" y="${by + 80}" width="14" height="10" rx="1.2"/>`,
    smdc(cx + 4, by + 80, 6, 4),
    smdc(cx + 4, by + 87, 6, 4),
    smdc(cx - 24, by + 80, 6, 4),
    // ESP32-S2FN4R2 chip and its 40 MHz crystal
    qfp(cx, by + 150, 46, "ESP32-S2", { n: 11, fs: 6.5, sub: "FN4R2" }),
    crystal(cx, by + 204, 18, 11, "40M"),
    smdc(cx - 22, by + 222, 6, 4),
    smdc(cx - 12, by + 222, 6, 4),
    smdc(cx + 6, by + 222, 6, 4),
    T(cx, by + 250, "S2 mini", { fs: 10, bold: true }),
    T(cx, by + 262, "LOLIN", { fs: 6, fill: "#b0bec5" }),
    `  <path d="${ant}" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linejoin="round" opacity="0.9"/>`,
  ].join("\n");
  return {
    id: "board.esp32.s2.mini",
    kind: "board",
    file: "boards/lolin-s2-mini.svg",
    caption: "LOLIN (WEMOS) S2 Mini",
    title: "LOLIN S2 Mini top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Black board with USB-C and the 0 (BOOT) and RST buttons at the top, bare ESP32-S2FN4R2 in the middle, blue LED on GPIO15, 16 pads per side.",
      "The pad order follows the numbered list of the LOLIN S2 Mini pinout (VBUS, GND, 3V3, 1-18, 21, 33-40, EN, GND) read in left/right pairs from the USB end.",
      "Which pad sits on which side is not stated in text sources; check the labels printed on your board.",
    ],
    width,
    height,
    body,
    terminals: { ...L.terminals, ...R.terminals },
  };
}

// ============================================================ Seeed Studio XIAO ESP32S3

function xiaoEsp32S3() {
  const mono2 = `font-family="ui-monospace, monospace"`;
  const left = ["D0", "D1", "D2", "D3", "D4", "D5", "D6"].map((l) => ({ label: l, id: l }));
  const right = [
    { label: "5V", id: "5V" },
    { label: "GND", id: "GND" },
    { label: "3V3", id: "3V3" },
    ...["D10", "D9", "D8", "D7"].map((l) => ({ label: l, id: l })),
  ];
  const decorations = [
    // USB-C shell standing over the top edge, charge LED and user LED beside it
    `  <rect x="92" y="26" width="56" height="50" rx="8" fill="#d5d9dc" stroke="#7d868c" stroke-width="1.5"/>`,
    `  <rect x="100" y="34" width="40" height="16" rx="8" fill="#9aa3a8"/>`,
    `  <rect x="108" y="40" width="24" height="4" rx="2" fill="#5f686d"/>`,
    `  <rect x="154" y="38" width="6" height="4" rx="1" fill="#ef9a9a"/>`,
    `  <rect x="154" y="48" width="6" height="4" rx="1" fill="#ffb74d"/>`,
    `  <text class="label" x="164" y="44" font-size="6">CH</text>`,
    `  <text class="label" x="164" y="54" font-size="6">USER</text>`,
    // shielded ESP32-S3R8 module with Seeed's marking
    `  <rect x="80" y="84" width="80" height="102" rx="3" fill="#f4f5f5" stroke="#b0b6ba" stroke-width="1.2"/>`,
    `  <text x="120" y="106" text-anchor="middle" ${mono2} font-size="10" font-weight="bold" fill="#263238">seeed</text>`,
    `  <text x="120" y="118" text-anchor="middle" ${mono2} font-size="8" fill="#263238">studio</text>`,
    `  <text x="120" y="138" text-anchor="middle" ${mono2} font-size="6" fill="#455a64">XIAO-ESP32-S3</text>`,
    `  <text x="104" y="168" text-anchor="middle" ${mono2} font-size="9" font-weight="bold" fill="#263238">FC</text>`,
    `  <text x="136" y="168" text-anchor="middle" ${mono2} font-size="9" font-weight="bold" fill="#263238">CE</text>`,
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
    id: "board.xiao.esp32s3",
    kind: "board",
    file: "boards/xiao-esp32s3.svg",
    caption: "Seeed Studio XIAO ESP32S3",
    title: "Seeed Studio XIAO ESP32S3 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "USB-C at the top with charge and user LEDs; shielded ESP32-S3R8 module, U.FL antenna socket between the B (BOOT) and R (RESET) buttons at the bottom.",
      "Pad order from Seeed's published XIAO pinout: D0-D6 down the left side, 5V, GND, 3V3 and D10-D7 down the right side.",
      "The battery and camera pads on the back of the board are not drawn.",
    ],
    ...art,
  };
}

// ============================================================ Adafruit Feather RP2040

function featherRp2040() {
  const width = 200;
  const height = 366;
  const bx = 20;
  const by = 16;
  const bw = 150;
  const bh = 334;
  const pitch = 16;
  const y0 = by + 38;
  // Feather landscape (USB left) rotated so USB is on top: the 16-pin header runs down the right side, the 12-pin header down the left.
  const right = [
    { label: "NC" },
    { label: "RST", id: "RST" },
    { label: "3V3", id: "3V3" },
    { label: "ARef", id: "ARef" },
    { label: "GND", id: "GND" },
    { label: "A0", id: "A0" },
    { label: "A1", id: "A1" },
    { label: "A2", id: "A2" },
    { label: "A3", id: "A3" },
    { label: "24", id: "D24" },
    { label: "25", id: "D25" },
    { label: "SCK", id: "SCK" },
    { label: "MOSI", id: "MOSI" },
    { label: "MISO", id: "MISO" },
    { label: "RX", id: "RX" },
    { label: "TX", id: "TX" },
  ];
  const left = [
    { label: "BAT", id: "VBAT" },
    { label: "EN", id: "EN" },
    { label: "USB", id: "USB" },
    { label: "13", id: "D13" },
    { label: "12", id: "D12" },
    { label: "11", id: "D11" },
    { label: "10", id: "D10" },
    { label: "9", id: "D9" },
    { label: "6", id: "D6" },
    { label: "5", id: "D5" },
    { label: "SCL", id: "SCL" },
    { label: "SDA", id: "SDA" },
  ];
  const L = column(left, bx + 10, y0 + 4 * pitch, pitch, "left", { r: 4.8, fs: 6.5 });
  const R = column(right, bx + bw - 10, y0, pitch, "right", { r: 4.8, fs: 6.5 });
  const cx = bx + bw / 2;
  const body = [
    rect(bx, by, bw, bh, "#1b1e22", { rx: 8, stroke: "#050607", sw: 2 }),
    L.svg,
    R.svg,
    // USB-C on the top edge, BOOTSEL and RESET buttons beside it
    usbCShell(cx, by, "up", 44),
    tact(bx + 30, by + 20, 14, 12),
    T(bx + 30, by + 34, "BOOT", { fs: 5 }),
    tact(bx + bw - 46, by + 20, 14, 12),
    T(bx + bw - 46, by + 34, "RESET", { fs: 5 }),
    // JST PH battery connector on the left edge, near the USB end
    rect(bx - 2, by + 50, 24, 36, "#f1f1ea", { rx: 2, stroke: "#9e9e9e", sw: 1 }),
    rect(bx + 4, by + 56, 12, 24, "#d6d6cc", { rx: 1 }),
    T(bx + 34, by + 71, "LiPo", { fs: 5.5, fill: "#cfd8dc", anchor: "start" }),
    // red LED on pin 13, NeoPixel, charge LED
    ledS(cx + 14, by + 60, "#ef5350", 7, 4),
    T(cx + 14, by + 71, "#13", { fs: 5, fill: "#cfd8dc" }),
    rect(cx - 28, by + 54, 11, 11, "#fafafa", { rx: 1.5, stroke: "#9e9e9e", sw: 0.8 }),
    `  <circle cx="${cx - 25}" cy="${by + 57}" r="1.3" fill="#ef5350"/><circle cx="${cx - 20}" cy="${by + 57}" r="1.3" fill="#66bb6a"/><circle cx="${cx - 22.5}" cy="${by + 62}" r="1.3" fill="#42a5f5"/>`,
    T(cx - 22.5, by + 76, "NeoPixel", { fs: 4.5, fill: "#cfd8dc" }),
    ledS(cx + 14, by + 86, "#ffb74d", 7, 4),
    T(cx + 14, by + 97, "CHG", { fs: 5, fill: "#cfd8dc" }),
    // regulator and charger
    `  <rect class="chip" x="${cx - 24}" y="${by + 96}" width="14" height="10" rx="1.2"/>`,
    smdc(cx - 6, by + 98, 6, 4),
    // RP2040, its QSPI flash and 12 MHz crystal
    qfp(cx, by + 160, 44, "RP2040", { n: 11, fs: 7 }),
    soic(cx, by + 214, 26, 15, "FLASH", { n: 4, fs: 4.5 }),
    crystal(cx - 24, by + 240, 18, 10, "12M"),
    smdc(cx + 4, by + 236, 6, 4),
    smdc(cx + 14, by + 236, 6, 4),
    // STEMMA QT (JST SH) connector at the bottom edge
    rect(cx - 16, by + bh - 20, 32, 22, "#f1f1ea", { rx: 2, stroke: "#9e9e9e", sw: 1 }),
    rect(cx - 12, by + bh - 20, 24, 10, "#d6d6cc", { rx: 1 }),
    T(cx, by + bh - 27, "STEMMA QT", { fs: 5, fill: "#cfd8dc" }),
    T(cx, by + 272, "Feather", { fs: 8, bold: true }),
    T(cx, by + 283, "RP2040", { fs: 7, bold: true, fill: "#ffb74d" }),
  ].join("\n");
  return {
    id: "board.adafruit.feather.rp2040",
    kind: "board",
    file: "boards/adafruit-feather-rp2040.svg",
    caption: "Adafruit Feather RP2040",
    title: "Adafruit Feather RP2040 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Feather footprint drawn upright with USB-C on top (Adafruit usually shows it sideways with USB on the left): 16-pin header on the right, 12-pin header on the left.",
      "Right side top to bottom: NC, RST, 3V3, ARef, GND, A0-A3, 24, 25, SCK, MOSI, MISO, RX, TX. Left side: BAT, EN, USB, 13, 12, 11, 10, 9, 6, 5, SCL, SDA.",
      "BOOTSEL and RESET buttons beside the USB-C, red LED on pin 13, NeoPixel, JST PH battery connector, STEMMA QT connector, RP2040 with QSPI flash and 12 MHz crystal.",
      "Pin-1 position of the 16-pin header (NC) and the exact spot of the connectors are drawn from memory of the Feather standard; check against your board.",
    ],
    width,
    height,
    body,
    terminals: { ...L.terminals, ...R.terminals },
  };
}

const drawings = [esp32C6DevkitC1, lolinS2Mini, xiaoEsp32S3, featherRp2040];

export default drawings;
