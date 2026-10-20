// Classic boards redrawn as realistic top views: Raspberry Pi Pico / Pico W / Pico 2,
// Raspberry Pi Zero W / 3 B+ / 4 B / 5, ESP8266 NodeMCU and the capacitive soil moisture probe.
// Components are authored in millimetres inside a scaled group; pins, holes and labels are
// drawn in absolute drawing units so terminals sit exactly on the drawn holes.
import { holeClass, esc, r1 } from "./_lib.mjs";

const GOLD = "#d9b44a";
const GOLD_D = "#a07d1c";
const FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

// ---------------------------------------------------------------- tiny svg helpers (mm space)
const R = (x, y, w, h, fill, o = {}) =>
  `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${o.rx ? ` rx="${o.rx}"` : ""} fill="${fill}"${
    o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 0.2}"` : ""
  }${o.op ? ` opacity="${o.op}"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
const C = (x, y, r, fill, o = {}) =>
  `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 0.2}"` : ""}/>`;
const TX = (x, y, s, o = {}) => {
  const { fs = 1.4, fill = "#eceff1", anchor = "middle", bold = false, rot = 0, op } = o;
  const tr = rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : "";
  return `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}"${tr} style="font-family:${FONT};font-size:${fs}px;fill:${fill};${
    bold ? "font-weight:bold;" : ""
  }${op ? `opacity:${op};` : ""}">${esc(s)}</text>`;
};
const G = (tr, ...parts) => `<g transform="${tr}">\n${parts.flat().join("\n")}\n</g>`;
const gm = (bx, by, S, parts) => G(`translate(${bx} ${by}) scale(${S})`, parts);

/** SMD passive; vertical when `v`. */
const pas = (x, y, v = false, dark = false) => {
  const w = v ? 0.55 : 1.0;
  const h = v ? 1.0 : 0.55;
  return dark ? R(x, y, w, h, "#2b2b2b", { stroke: "#111", sw: 0.08 }) : R(x, y, w, h, "#cfc0ac", { stroke: "#8a7660", sw: 0.08 });
};

/** QFN: black body, gold pads around, pin-1 dot, marking. */
function qfn(cx, cy, s, l1, l2, n = 14) {
  const out = [];
  const step = s / n;
  for (let i = 0; i < n; i++) {
    const o = -s / 2 + step * (i + 0.5);
    out.push(R(cx + o - 0.12, cy - s / 2 - 0.3, 0.24, 0.4, "#b8b8b8"));
    out.push(R(cx + o - 0.12, cy + s / 2 - 0.1, 0.24, 0.4, "#b8b8b8"));
    out.push(R(cx - s / 2 - 0.3, cy + o - 0.12, 0.4, 0.24, "#b8b8b8"));
    out.push(R(cx + s / 2 - 0.1, cy + o - 0.12, 0.4, 0.24, "#b8b8b8"));
  }
  out.push(R(cx - s / 2, cy - s / 2, s, s, "#1c1c1c", { stroke: "#000", sw: 0.12, rx: 0.2 }));
  out.push(C(cx - s / 2 + 0.7, cy - s / 2 + 0.7, 0.28, "#5a5a5a"));
  if (l1) out.push(TX(cx, cy - 0.1, l1, { fs: s * 0.2, fill: "#cfd8dc" }));
  if (l2) out.push(TX(cx, cy + s * 0.2, l2, { fs: s * 0.14, fill: "#90a4ae" }));
  return out.join("\n");
}

/** SOIC-8 style chip with pin stubs on the long sides. */
function soic(x, y, w, h, label, n = 4, fs = 0.8) {
  const out = [];
  const step = w / n;
  for (let i = 0; i < n; i++) {
    out.push(R(x + step * i + step * 0.25, y - 0.3, step * 0.5, 0.4, "#b8b8b8"));
    out.push(R(x + step * i + step * 0.25, y + h - 0.1, step * 0.5, 0.4, "#b8b8b8"));
  }
  out.push(R(x, y, w, h, "#1c1c1c", { stroke: "#000", sw: 0.1, rx: 0.15 }));
  out.push(C(x + 0.45, y + 0.45, 0.17, "#666"));
  if (label) out.push(TX(x + w / 2, y + h / 2 + fs * 0.35, label, { fs, fill: "#cfd8dc" }));
  return out.join("\n");
}

const crystal = (x, y, w, h, label) =>
  [R(x, y, w, h, "#cfd8dc", { stroke: "#78909c", sw: 0.12, rx: 0.2 }), R(x - 0.2, y + h * 0.2, 0.4, h * 0.6, GOLD), R(x + w - 0.2, y + h * 0.2, 0.4, h * 0.6, GOLD), label ? TX(x + w / 2, y + h / 2 + 0.3, label, { fs: 0.75, fill: "#37474f" }) : ""].join("\n");

const led = (x, y, color) => [R(x - 0.7, y - 0.4, 1.4, 0.8, "#e0e0e0", { stroke: "#9e9e9e", sw: 0.08 }), R(x - 0.35, y - 0.3, 0.7, 0.6, color)].join("\n");

const tact = (x, y, w = 3.6, h = 2.8, cap = "#e8e8e8") =>
  [R(x - w / 2, y - h / 2, w, h, "#9aa5ab", { stroke: "#546e7a", sw: 0.12, rx: 0.3 }), C(x, y, Math.min(w, h) * 0.32, cap, { stroke: "#78909c", sw: 0.1 })].join("\n");

/**
 * A connector shell drawn with its mouth facing `dir` (up/right/down/left).
 * Canonical drawing faces up, then the group is rotated about the centre.
 */
function conn(cx, cy, w, h, dir, { fill = "#cfd8dc", inner = "#263238", depthLip = 1.0, openFrac = 0.8 } = {}) {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
  const body = [
    R(cx - w / 2, cy - h / 2, w, h, fill, { stroke: "#607d8b", sw: 0.2, rx: 0.3 }),
    R(cx - (w * openFrac) / 2, cy - h / 2 - 0.02, w * openFrac, depthLip, inner, { rx: 0.2 }),
    R(cx - w / 2 + 0.5, cy - h / 2 + depthLip + 0.5, w - 1, 0.12, "#90a4ae"),
  ];
  return rot ? G(`rotate(${rot} ${cx} ${cy})`, body) : body.join("\n");
}

/** USB-A stack seen from above (mouth facing right). */
function usbA(x, y, depth, w, blue) {
  return [
    R(x, y, depth, w, "#cfd8dc", { stroke: "#607d8b", sw: 0.2, rx: 0.3 }),
    R(x + depth - 1.1, y + 1.2, 1.1, w - 2.4, blue ? "#1e88e5" : "#37474f"),
    R(x + 1.2, y + 1.0, 0.18, w - 2, "#90a4ae"),
    R(x + 2.6, y + 1.0, 0.18, w - 2, "#90a4ae"),
    R(x + 4.0, y + 1.0, 0.18, w - 2, "#90a4ae"),
  ].join("\n");
}

function ethernet(x, y, depth, w) {
  return [
    R(x, y, depth, w, "#cfd8dc", { stroke: "#607d8b", sw: 0.2, rx: 0.3 }),
    R(x + depth - 1.3, y + 1.4, 1.3, w - 2.8, "#37474f"),
    R(x + depth - 1.3, y + w / 2 - 0.9, 0.5, 1.8, "#90a4ae"),
    TX(x + depth * 0.4, y + w / 2 + 0.6, "ETH", { fs: 1.7, fill: "#546e7a", bold: true }),
    R(x + 1.2, y + 1.2, 0.18, w - 2.4, "#90a4ae"),
  ].join("\n");
}

/** Flat-cable (FFC) connector, long axis `len`, orientation horizontal or vertical. */
function ffc(x, y, len, thick, vertical, label) {
  const w = vertical ? thick : len;
  const h = vertical ? len : thick;
  return [
    R(x, y, w, h, "#e8e4da", { stroke: "#8d8672", sw: 0.15, rx: 0.2 }),
    vertical ? R(x + thick * 0.55, y + 0.4, thick * 0.35, len - 0.8, "#2b2b2b") : R(x + 0.4, y + thick * 0.55, len - 0.8, thick * 0.35, "#2b2b2b"),
    label ? TX(x + w / 2, y + h + 1.6, label, { fs: 1.1, fill: "#eceff1" }) : "",
  ].join("\n");
}

/** Small white JST-SH style socket. */
const jst = (x, y, w, h, label, vertical = false) =>
  [R(x, y, w, h, "#f2f0e8", { stroke: "#9e9a88", sw: 0.12, rx: 0.2 }), R(x + 0.3, y + 0.3, w - 0.6, h - 0.6, "#cfcab8", { rx: 0.1 }), label ? TX(x + w / 2, vertical ? y + h + 1.5 : y - 0.5, label, { fs: 1.0, fill: "#eceff1" }) : ""].join("\n");

const mountHole = (x, y) => [C(x, y, 1.45, "#f5f5f5", { stroke: GOLD, sw: 0.5 })].join("\n");

const doc = (o) => o;

// ============================================================ Raspberry Pi Pico family

const PICO_LEFT = [
  ["GP0", "gp0"], ["GP1", "gp1"], ["GND", "gnd"], ["GP2", "gp2"], ["GP3", "gp3"], ["GP4"], ["GP5"], ["GND"], ["GP6"], ["GP7"],
  ["GP8"], ["GP9"], ["GND"], ["GP10"], ["GP11"], ["GP12"], ["GP13"], ["GND"], ["GP14"], ["GP15", "gp15"],
];
const PICO_RIGHT = [
  ["VBUS", "vbus"], ["VSYS"], ["GND"], ["3V3_EN"], ["3V3", "3v3"], ["ADC_VREF"], ["GP28", "gp28"], ["AGND"], ["GP27", "gp27"], ["GP26", "gp26"],
  ["RUN"], ["GP22"], ["GND"], ["GP21"], ["GP20"], ["GP19"], ["GP18"], ["GND"], ["GP17"], ["GP16"],
];

function pico({ id, file, caption, title, chip, chipSub, wireless, comment }) {
  const S = 9;
  const bw = 21 * S;
  const bh = 51 * S;
  const bx = 30;
  const by = 30;
  const width = bw + 2 * bx;
  const height = bh + by + 24;
  const mm = [];
  // board
  mm.push(R(0, 0, 21, 51, "#1f7a3a", { stroke: "#145a28", sw: 0.25, rx: 0.9 }));
  // micro-USB at the top edge
  mm.push(conn(10.5, 1.7, 7.6, 5.6, "up", { fill: "#cfd8dc" }));
  mm.push(R(7.6, 2.0, 5.8, 1.4, "#78909c", { rx: 0.3 }));
  // BOOTSEL and the user LED
  mm.push(tact(8.0, 9.6, 3.6, 2.6));
  mm.push(TX(8.0, 12.7, "BOOTSEL", { fs: 1.05 }));
  mm.push(led(15.2, 6.2, "#66bb6a"));
  mm.push(TX(15.2, 8.0, "LED", { fs: 0.9, fill: "#c8e6c9" }));
  // RP2040 / RP2350, flash, crystal
  mm.push(qfn(10.5, 20.8, 7, chip, chipSub, 14));
  mm.push(crystal(6.2, 27.4, 3.4, 2.6, "12MHz"));
  mm.push(soic(11.2, 27.4, 4.4, 3.2, "FLASH", 4, 0.7));
  [[6.0, 25.7, true], [7.0, 25.7, true], [14.4, 25.2, true], [15.4, 25.2, true], [5.4, 31.4], [9.6, 31.4], [11.4, 32.3], [14.8, 32.3], [7.4, 32.6, true]].forEach(([x, y, v]) => mm.push(pas(x, y, !!v)));
  mm.push(TX(10.5, 15.2, "Raspberry Pi", { fs: 0.95, fill: "#c8e6c9" }));
  if (wireless) {
    // shielded CYW43439 module and the printed meander antenna
    mm.push(R(5.2, 33.4, 10.6, 7.6, "#cfd8dc", { stroke: "#78909c", sw: 0.2, rx: 0.3 }));
    mm.push(R(5.7, 33.9, 9.6, 6.6, "#e8eceb", { rx: 0.2 }));
    mm.push(TX(10.5, 36.2, "Infineon", { fs: 1.0, fill: "#263238", bold: true }));
    mm.push(TX(10.5, 37.9, "CYW43439", { fs: 0.85, fill: "#455a64" }));
    mm.push(TX(10.5, 39.4, "Pico W", { fs: 0.8, fill: "#607d8b" }));
    let d = "M5.2 44.0";
    for (let i = 0; i < 5; i++) d += ` V41.8 H${5.2 + i * 2.2 + 1.1} V44.0 H${5.2 + i * 2.2 + 2.2}`;
    mm.push(`<path d="${d}" fill="none" stroke="#d8c26a" stroke-width="0.55" stroke-linejoin="round"/>`);
  } else {
    [[5.4, 36.4], [9.0, 36.4], [12.6, 36.4], [6.9, 38.6, true], [13.6, 38.6, true]].forEach(([x, y, v]) => mm.push(pas(x, y, !!v)));
    mm.push(TX(10.5, 41.6, chip === "RP2350" ? "Pico 2" : "Pico", { fs: 1.5, fill: "#c8e6c9", bold: true }));
  }
  // 3-pin debug (SWD) header holes at the bottom edge
  const swd = [["SWCLK", 8.0], ["GND", 10.5], ["SWDIO", 13.0]];
  swd.forEach(([lab, x]) => {
    mm.push(C(x, 48.4, 0.75, GOLD, { stroke: GOLD_D, sw: 0.12 }));
    mm.push(C(x, 48.4, 0.36, "#1f7a3a"));
    mm.push(TX(x + 0.3, 47.4, lab, { fs: 0.85, rot: -90, anchor: "start" }));
  });
  mm.push(TX(10.5, 50.2, "DEBUG", { fs: 0.7, fill: "#a5d6a7" }));

  const pins = [];
  const terminals = {};
  const y0 = by + 12.3;
  const p = 22.86;
  const lx = bx + 14.5;
  const rx = bx + bw - 14.5;
  const addSide = (list, x, side) => {
    list.forEach(([label, cid], i) => {
      const y = r1(y0 + i * p);
      const edgeX = side === "left" ? bx - 0.5 : bx + bw - 13.5;
      pins.push(`<rect x="${edgeX}" y="${r1(y - 8)}" width="14" height="16" rx="3" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="0.8"/>`);
      pins.push(`<circle class="${holeClass(label)}" cx="${x}" cy="${y}" r="4.6"/>`);
      const tx = side === "left" ? x + 10 : x - 10;
      const muted = !cid && !/^GND|AGND$/.test(label);
      pins.push(
        `<text class="pinlbl${muted ? " muted" : ""}" x="${tx}" y="${y + 2.6}" text-anchor="${side === "left" ? "start" : "end"}" style="font-size:6.8px">${esc(label)}</text>`,
      );
      if (cid) terminals[cid] = { x, y };
    });
  };
  addSide(PICO_LEFT, lx, "left");
  addSide(PICO_RIGHT, rx, "right");
  const body = [gm(bx, by, S, mm), ...pins].join("\n");
  return doc({
    id,
    kind: "board",
    file,
    caption,
    title,
    comment,
    width,
    height,
    body,
    terminals,
  });
}

function picoRp2040() {
  return pico({
    id: "board.pico.rp2040",
    file: "boards/pico-rp2040.svg",
    caption: "Raspberry Pi Pico (RP2040)",
    title: "Raspberry Pi Pico top view (original drawing, CC0)",
    chip: "RP2040",
    chipSub: "Pico",
    wireless: false,
    comment: [
      "Original CC0 top view for HelpmeSolder wiring diagrams.",
      "51 x 21 mm green board, micro-USB and BOOTSEL at the top, RP2040 with crystal and flash in the middle,",
      "three SWD debug holes at the bottom edge, 20 castellated pins per side. Pin 1 (GP0) top left, pin 40 (VBUS) top right.",
      "Left top to bottom: GP0 GP1 GND GP2 GP3 GP4 GP5 GND GP6 GP7 GP8 GP9 GND GP10 GP11 GP12 GP13 GND GP14 GP15.",
      "Right top to bottom: VBUS VSYS GND 3V3_EN 3V3 ADC_VREF GP28 AGND GP27 GP26 RUN GP22 GND GP21 GP20 GP19 GP18 GND GP17 GP16.",
      "The catalog GND terminal is the pin 3 GND hole.",
    ],
  });
}

function picoW() {
  return pico({
    id: "board.pico.w",
    file: "boards/pico-w.svg",
    caption: "Raspberry Pi Pico W (RP2040 + Wi-Fi)",
    title: "Raspberry Pi Pico W top view (original drawing, CC0)",
    chip: "RP2040",
    chipSub: "Pico",
    wireless: true,
    comment: [
      "Original CC0 top view for HelpmeSolder wiring diagrams.",
      "Same pin layout as the Pico; the Pico W adds the shielded Infineon CYW43439 wireless module and a printed meander antenna",
      "at the bottom, above the three SWD debug holes. The catalog GND terminal is the pin 3 GND hole.",
    ],
  });
}

function pico2() {
  return pico({
    id: "board.pico.2",
    file: "boards/pico-2.svg",
    caption: "Raspberry Pi Pico 2 (RP2350)",
    title: "Raspberry Pi Pico 2 top view (original drawing, CC0)",
    chip: "RP2350",
    chipSub: "Pico 2",
    wireless: false,
    comment: [
      "Original CC0 top view for HelpmeSolder wiring diagrams.",
      "Same size and pin layout as the original Pico, with the RP2350 chip. The catalog GND terminal is the pin 3 GND hole.",
    ],
  });
}

// ============================================================ Raspberry Pi (40-pin header) family

// Header pin n (1..40): [label, kind]. Odd pins sit in the row nearer the board centre, even pins on the outer row.
const PI_PINS = [
  "3V3", "5V", "GPIO2", "5V", "GPIO3", "GND", "GPIO4", "GPIO14", "GND", "GPIO15",
  "GPIO17", "GPIO18", "GPIO27", "GND", "GPIO22", "GPIO23", "3V3", "GPIO24", "GPIO10", "GND",
  "GPIO9", "GPIO25", "GPIO11", "GPIO8", "GND", "GPIO7", "ID_SD", "ID_SC", "GPIO5", "GND",
  "GPIO6", "GPIO12", "GPIO13", "GND", "GPIO19", "GPIO16", "GPIO26", "GPIO20", "GND", "GPIO21",
];
const lblColor = (l) => (l === "5V" ? "#ff8a80" : l === "3V3" ? "#ffb74d" : l === "GND" ? "#b0bec5" : "#eceff1");

function piBoard({ id, file, caption, title, comment, S, W, H, pcb, edge, parts, name, hdrX0 = 8.37, nameAt, extraUnder = 0 }) {
  const bx = 8;
  const stripH = 36;
  const by = stripH + 2;
  const width = r1(W * S + 2 * bx);
  const height = r1(by + H * S + 8 + extraUnder);
  const mm = [];
  mm.push(R(0, 0, W, H, pcb, { stroke: edge, sw: 0.3, rx: 2.2 }));
  [[3.5, 3.5], [61.5, 3.5], [3.5, H - 3.5], [61.5, H - 3.5]].forEach(([x, y]) => mm.push(mountHole(x, y)));
  mm.push(...parts);
  if (name) mm.push(TX(nameAt[0], nameAt[1], name, { fs: 1.9, fill: "#d7ecd9", bold: true }));

  // 40-pin header, two rows of 20
  const terminals = {};
  const hdr = [];
  const rowOuter = by + 3.5 * S;
  const rowInner = by + 6.04 * S;
  const colX = (c) => r1(bx + (hdrX0 + 2.54 * c) * S);
  const x0 = colX(0);
  const x19 = colX(19);
  const hr = 0.95 * S;
  hdr.push(`<rect x="${r1(x0 - 1.4 * S)}" y="${r1(rowOuter - 1.4 * S)}" width="${r1(x19 - x0 + 2.8 * S)}" height="${r1(rowInner - rowOuter + 2.8 * S)}" rx="2" fill="#2b2f33"/>`);
  hdr.push(`<rect x="${r1(x0 - 9)}" y="${by - 36}" width="${r1(x19 - x0 + 18)}" height="33" rx="4" fill="#263238"/>`);
  PI_PINS.forEach((label, k) => {
    const n = k + 1;
    const c = Math.floor(k / 2);
    const outer = n % 2 === 0;
    const x = colX(c);
    const y = r1(outer ? rowOuter : rowInner);
    if (n === 1) hdr.push(`<rect class="${holeClass(label)}" x="${r1(x - hr)}" y="${r1(y - hr)}" width="${r1(hr * 2)}" height="${r1(hr * 2)}"/>`);
    else hdr.push(`<circle class="${holeClass(label)}" cx="${x}" cy="${y}" r="${r1(hr)}"/>`);
    const fs = Math.min(6.4, S * 1.55);
    if (outer) {
      hdr.push(`<line x1="${x}" y1="${r1(y - hr - 1)}" x2="${x}" y2="${by - 3}" stroke="#78909c" stroke-width="0.7"/>`);
      hdr.push(`<text x="${x}" y="${by - 7}" transform="rotate(-90 ${x} ${by - 7})" dy="2.3" text-anchor="start" style="font-family:${FONT};font-size:${fs}px;fill:${lblColor(label)}">${esc(label)}</text>`);
    } else {
      hdr.push(`<text x="${x}" y="${r1(y + hr + 3)}" transform="rotate(90 ${x} ${r1(y + hr + 3)})" dy="2.3" text-anchor="start" style="font-family:${FONT};font-size:${fs}px;fill:${lblColor(label)}">${esc(label)}</text>`);
    }
    if (n === 1) terminals["3V3"] = { x, y };
    if (n === 2) terminals["5V"] = { x, y };
    if (n === 6) terminals.GND = { x, y };
  });
  hdr.push(`<text x="${r1(x0 - 12)}" y="${r1(rowInner + 2.3)}" text-anchor="end" style="font-family:${FONT};font-size:5.5px;fill:#eceff1">1</text>`);
  const body = [gm(bx, by, S, mm), ...hdr].join("\n");
  return { id, kind: "board", file, caption, title, comment, width, height, body, terminals, pinExit: { dx: 0, dy: -1 } };
}

const piLeds = (x, y) => [led(x, y, "#66bb6a"), led(x, y + 2.2, "#ef5350"), TX(x + 1.2, y + 0.35, "ACT", { fs: 0.9, anchor: "start" }), TX(x + 1.2, y + 2.55, "PWR", { fs: 0.9, anchor: "start" })].join("\n");
const sdSlot = (y) => [R(0.0, y, 14, 12, "none", { stroke: "#9ccc9f", sw: 0.2, dash: "0.7 0.5" }), R(-1.6, y + 2, 6, 8, "#b0bec5", { stroke: "#607d8b", sw: 0.2, rx: 0.4 }), TX(8, y + 6.4, "microSD", { fs: 1.1, fill: "#c8e6c9" })].join("\n");
const mountsNote = [
  "Header: 40 pins in two rows of 20. Odd pins (1 = 3V3, square pad) on the row nearer the board centre, even pins (2 = 5V) on the outer row;",
  "pin 1 is at the left end next to the SD-card end. Labels are the BCM GPIO numbers. Catalog terminals: 3V3 = pin 1, 5V = pin 2, GND = pin 6.",
];

function piZeroW() {
  const W = 65;
  const H = 30;
  const parts = [
    sdSlot(11),
    // mini-HDMI, micro-USB data and PWR on the bottom edge
    conn(12.4, 28.3, 11.2, 3.6, "down", { fill: "#cfd8dc", openFrac: 0.85 }),
    TX(12.4, 24.6, "HDMI", { fs: 1.1, fill: "#c8e6c9" }),
    conn(41.4, 27.4, 7.6, 5.6, "down"),
    TX(41.4, 22.9, "USB", { fs: 1.1, fill: "#c8e6c9" }),
    conn(54.0, 27.4, 7.6, 5.6, "down"),
    TX(54.0, 22.9, "PWR", { fs: 1.1, fill: "#c8e6c9" }),
    // camera connector on the right end
    ffc(59.7, 8.6, 17, 3.4, true),
    TX(62.2, 28.4, "CSI", { fs: 1.0, fill: "#c8e6c9" }),
    // Broadcom BCM2835 under its package, RF shield and antenna
    R(21.5, 13.4, 10.5, 10.5, "#222", { stroke: "#000", sw: 0.2, rx: 0.5 }),
    TX(26.75, 18.1, "BCM", { fs: 1.2, fill: "#cfd8dc" }),
    TX(26.75, 19.7, "2835", { fs: 1.2, fill: "#cfd8dc" }),
    R(35.0, 13.4, 12.5, 8.6, "#cfd8dc", { stroke: "#78909c", sw: 0.2, rx: 0.4 }),
    R(35.5, 13.9, 11.5, 7.6, "#e3e8ea", { rx: 0.3 }),
    TX(41.25, 18.4, "RF shield", { fs: 1.0, fill: "#546e7a" }),
    `<path d="M49.6 23.2 V16.8 H50.9 V23.2 H52.2 V16.8 H53.5 V23.2 H54.8 V16.8" fill="none" stroke="#d8c26a" stroke-width="0.45"/>`,
    R(15.0, 20.6, 4.4, 3.4, "#222", { stroke: "#000", sw: 0.12 }),
    TX(17.2, 22.7, "PMIC", { fs: 0.8, fill: "#90a4ae" }),
    [[20, 24.3], [22.4, 25.0], [33.2, 24.4], [34.4, 24.4]].map(([x, y]) => pas(x, y)).join("\n"),
    led(5.0, 26.2, "#66bb6a"),
    TX(6.2, 26.5, "ACT", { fs: 0.9, anchor: "start" }),
  ];
  return piBoard({
    id: "board.pi.zero.w",
    file: "boards/pi-zero-w.svg",
    caption: "Raspberry Pi Zero W",
    title: "Raspberry Pi Zero W top view (original drawing, CC0)",
    S: 5,
    W,
    H,
    pcb: "#1b7f3b",
    edge: "#135f2b",
    parts,
    name: "Pi Zero W",
    nameAt: [28.5, 28.2],
    comment: [
      "Original CC0 top view for HelpmeSolder wiring diagrams.",
      "65 x 30 mm. 40-pin GPIO header along the top edge; microSD slot at the left end; mini-HDMI, the micro-USB data port and the PWR micro-USB",
      "on the bottom edge; CSI camera connector at the right end; BCM2835 beside the metal RF shield.",
      ...mountsNote,
    ],
  });
}

const piBottomEdge = (extra) => extra;

function pi3bPlus() {
  const W = 85;
  const H = 56;
  const parts = [
    ffc(1.2, 8.8, 15.5, 3.6, true, "DSI"),
    sdSlot(24.5),
    // bottom edge: micro-USB power, HDMI, CSI, audio
    conn(10.6, 54.3, 7.6, 5.6, "down"),
    TX(10.6, 49.0, "PWR IN", { fs: 1.1, fill: "#c8e6c9" }),
    conn(32, 51.5, 15, 11.5, "down", { fill: "#cfd8dc", openFrac: 0.85 }),
    TX(32, 44.5, "HDMI", { fs: 1.3, fill: "#37474f" }),
    ffc(43.4, 30, 22, 2.8, true),
    TX(44.8, 28.4, "CSI", { fs: 1.0, fill: "#c8e6c9" }),
    R(50.0, 43.6, 7.0, 13.0, "#20252b", { stroke: "#000", sw: 0.2, rx: 0.6 }),
    C(53.5, 54.6, 1.5, "#37474f", { stroke: "#90a4ae", sw: 0.2 }),
    TX(53.5, 48.6, "A/V", { fs: 1.1, fill: "#cfd8dc" }),
    // right edge: 2 USB stacks and Ethernet
    usbA(69.0, 5.5, 17.2, 14.0, false),
    usbA(69.0, 22.0, 17.2, 14.0, false),
    ethernet(65.0, 38.5, 21.2, 16.0),
    // chips
    R(31.0, 22.5, 14.5, 14.5, "#cfd8dc", { stroke: "#78909c", sw: 0.25, rx: 0.8 }),
    R(31.8, 23.3, 12.9, 12.9, "#e3e8ea", { rx: 0.5 }),
    TX(38.25, 29.0, "Broadcom", { fs: 1.2, fill: "#263238", bold: true }),
    TX(38.25, 30.8, "BCM2837B0", { fs: 1.1, fill: "#455a64" }),
    R(14.0, 21.4, 11.5, 10.5, "#cfd8dc", { stroke: "#78909c", sw: 0.2, rx: 0.5 }),
    R(14.5, 21.9, 10.5, 9.5, "#e3e8ea", { rx: 0.3 }),
    TX(19.75, 26.2, "Wi-Fi", { fs: 1.2, fill: "#37474f", bold: true }),
    TX(19.75, 28.0, "BT 4.2", { fs: 1.0, fill: "#546e7a" }),
    `<path d="M16.0 36.5 V33.5 H17.3 V36.5 H18.6 V33.5 H19.9 V36.5 H21.2 V33.5 H22.5 V36.5" fill="none" stroke="#d8c26a" stroke-width="0.5"/>`,
    R(52.0, 24.0, 9.0, 9.0, "#1c1c1c", { stroke: "#000", sw: 0.15, rx: 0.4 }),
    TX(56.5, 28.2, "LAN7515", { fs: 1.0, fill: "#cfd8dc" }),
    TX(56.5, 29.8, "USB/ETH", { fs: 0.85, fill: "#90a4ae" }),
    R(20.0, 40.5, 4.5, 4.5, "#1c1c1c", { stroke: "#000", sw: 0.12 }),
    [[27, 41], [27, 43], [26.4, 46], [46, 40], [47.4, 40], [46, 47]].map(([x, y]) => pas(x, y)).join("\n"),
    piLeds(17.2, 50.4),
    TX(41.5, 16.4, "Raspberry Pi 3 Model B+", { fs: 1.6, fill: "#d7ecd9" }),
  ];
  return piBoard({
    id: "board.pi.3b.plus",
    file: "boards/pi-3b-plus.svg",
    caption: "Raspberry Pi 3 Model B+",
    title: "Raspberry Pi 3 Model B+ top view (original drawing, CC0)",
    S: 4,
    W,
    H,
    pcb: "#1a7a38",
    edge: "#11582a",
    parts,
    comment: [
      "Original CC0 top view for HelpmeSolder wiring diagrams.",
      "85 x 56 mm. GPIO header along the top edge; DSI display and microSD at the left end; micro-USB power, full-size HDMI, CSI camera and",
      "3.5 mm audio/video jack on the bottom edge; two USB-A stacks and Ethernet on the right edge (USB above, Ethernet at the bottom).",
      "BCM2837B0 under the silver heat spreader, Wi-Fi/Bluetooth shield and LAN7515 USB/Ethernet chip.",
      ...mountsNote,
    ],
  });
}

function pi4b() {
  const W = 85;
  const H = 56;
  const parts = [
    ffc(1.2, 8.8, 15.5, 3.6, true, "DSI"),
    sdSlot(24.5),
    // bottom edge: USB-C power, 2 micro-HDMI, CSI, audio
    conn(11.2, 53.3, 9.0, 3.3, "down", { fill: "#cfd8dc", openFrac: 0.8, depthLip: 0.8 }),
    TX(11.2, 49.2, "USB-C", { fs: 1.1, fill: "#c8e6c9" }),
    conn(26.0, 52.6, 7.0, 5.2, "down", { fill: "#cfd8dc", depthLip: 0.8 }),
    TX(26.0, 48.0, "HDMI0", { fs: 1.0, fill: "#c8e6c9" }),
    conn(39.5, 52.6, 7.0, 5.2, "down", { fill: "#cfd8dc", depthLip: 0.8 }),
    TX(39.5, 48.0, "HDMI1", { fs: 1.0, fill: "#c8e6c9" }),
    ffc(43.9, 33, 18, 2.8, true),
    TX(45.3, 31.4, "CSI", { fs: 1.0, fill: "#c8e6c9" }),
    R(50.0, 43.6, 7.0, 13.0, "#20252b", { stroke: "#000", sw: 0.2, rx: 0.6 }),
    C(53.5, 54.6, 1.5, "#37474f", { stroke: "#90a4ae", sw: 0.2 }),
    TX(53.5, 48.6, "A/V", { fs: 1.1, fill: "#cfd8dc" }),
    // right edge: Ethernet on top, USB 3 pair, USB 2 pair
    ethernet(65.0, 4.0, 21.2, 16.0),
    usbA(69.0, 22.0, 17.2, 14.0, true),
    usbA(69.0, 38.6, 17.2, 14.0, false),
    TX(76.5, 20.9, "USB 3.0", { fs: 0.9, fill: "#c8e6c9" }),
    // chips
    R(27.0, 22.0, 15.0, 15.0, "#cfd8dc", { stroke: "#78909c", sw: 0.25, rx: 0.8 }),
    R(27.8, 22.8, 13.4, 13.4, "#e3e8ea", { rx: 0.5 }),
    TX(34.5, 29.0, "Broadcom", { fs: 1.2, fill: "#263238", bold: true }),
    TX(34.5, 30.8, "BCM2711", { fs: 1.1, fill: "#455a64" }),
    R(44.0, 24.0, 12.0, 9.0, "#1c1c1c", { stroke: "#000", sw: 0.15, rx: 0.4 }),
    TX(50.0, 28.8, "SDRAM", { fs: 1.1, fill: "#cfd8dc" }),
    R(58.2, 24.5, 5.2, 5.2, "#1c1c1c", { stroke: "#000", sw: 0.12 }),
    TX(60.8, 27.7, "VL805", { fs: 0.85, fill: "#cfd8dc" }),
    R(50.5, 10.6, 11.5, 8.0, "#cfd8dc", { stroke: "#78909c", sw: 0.2, rx: 0.4 }),
    R(51.0, 11.1, 10.5, 7.0, "#e3e8ea", { rx: 0.3 }),
    TX(56.25, 15.0, "Wi-Fi/BT", { fs: 1.0, fill: "#37474f" }),
    R(15.0, 38.0, 6.0, 6.0, "#1c1c1c", { stroke: "#000", sw: 0.12 }),
    TX(18, 41.4, "PMIC", { fs: 0.9, fill: "#cfd8dc" }),
    [[24, 40], [24, 42], [26, 45.4], [46, 40], [47.4, 40], [29, 38]].map(([x, y]) => pas(x, y)).join("\n"),
    piLeds(4.8, 46.8),
    TX(24.5, 17.2, "Raspberry Pi 4 Model B", { fs: 1.6, fill: "#d7ecd9" }),
  ];
  return piBoard({
    id: "board.pi.4b",
    file: "boards/pi-4b.svg",
    caption: "Raspberry Pi 4 Model B",
    title: "Raspberry Pi 4 Model B top view (original drawing, CC0)",
    S: 4,
    W,
    H,
    pcb: "#15703a",
    edge: "#0e5028",
    parts,
    comment: [
      "Original CC0 top view for HelpmeSolder wiring diagrams.",
      "85 x 56 mm. GPIO header along the top edge; USB-C power, two micro-HDMI ports, CSI camera and the audio/video jack on the bottom edge;",
      "DSI and microSD at the left end; Gigabit Ethernet, two USB 3 (blue) and two USB 2 ports on the right edge.",
      "The USB 3 / USB 2 stack order on the right edge is drawn from memory: check it against your board.",
      ...mountsNote,
    ],
  });
}

function pi5() {
  const W = 85;
  const H = 56;
  const parts = [
    ffc(1.2, 8.8, 15.5, 3.6, true, "PCIe"),
    sdSlot(24.5),
    jst(1.4, 41.6, 3.6, 5.2, "RTC", true),
    // bottom edge: USB-C, power button, 2 micro-HDMI, 2 camera/display FFCs
    conn(11.2, 53.3, 9.0, 3.3, "down", { fill: "#cfd8dc", openFrac: 0.8, depthLip: 0.8 }),
    TX(11.2, 49.2, "USB-C", { fs: 1.1, fill: "#c8e6c9" }),
    tact(19.2, 53.2, 3.4, 2.4, "#f5f5f5"),
    TX(19.2, 50.0, "PWR", { fs: 1.0, fill: "#c8e6c9" }),
    conn(26.0, 52.6, 7.0, 5.2, "down", { fill: "#cfd8dc", depthLip: 0.8 }),
    TX(26.0, 48.0, "HDMI0", { fs: 1.0, fill: "#c8e6c9" }),
    conn(39.5, 52.6, 7.0, 5.2, "down", { fill: "#cfd8dc", depthLip: 0.8 }),
    TX(39.5, 48.0, "HDMI1", { fs: 1.0, fill: "#c8e6c9" }),
    ffc(44.0, 46.4, 11.0, 3.3, false),
    TX(49.5, 45.2, "CAM/DISP 0", { fs: 0.9, fill: "#c8e6c9" }),
    ffc(56.6, 46.4, 11.0, 3.3, false),
    TX(62.1, 45.2, "CAM/DISP 1", { fs: 0.9, fill: "#c8e6c9" }),
    // fan and UART connectors near the right
    jst(62.4, 9.4, 4.6, 6.4, "FAN", true),
    jst(62.4, 20.6, 4.6, 4.2, "UART", true),
    // right edge: Ethernet on top, USB 3 pair, USB 2 pair
    ethernet(65.0, 4.0, 21.2, 16.0),
    usbA(69.0, 22.0, 17.2, 14.0, true),
    usbA(69.0, 38.6, 17.2, 14.0, false),
    // chips
    R(25.0, 21.0, 17.0, 17.0, "#cfd8dc", { stroke: "#78909c", sw: 0.25, rx: 0.8 }),
    R(25.8, 21.8, 15.4, 15.4, "#e3e8ea", { rx: 0.5 }),
    TX(33.5, 29.0, "Broadcom", { fs: 1.2, fill: "#263238", bold: true }),
    TX(33.5, 30.8, "BCM2712", { fs: 1.1, fill: "#455a64" }),
    R(46.0, 23.0, 12.0, 12.0, "#1c1c1c", { stroke: "#000", sw: 0.15, rx: 0.5 }),
    TX(52.0, 28.4, "RP1", { fs: 1.6, fill: "#cfd8dc", bold: true }),
    TX(52.0, 30.4, "I/O", { fs: 0.9, fill: "#90a4ae" }),
    R(46.0, 10.6, 11.5, 8.0, "#cfd8dc", { stroke: "#78909c", sw: 0.2, rx: 0.4 }),
    R(46.5, 11.1, 10.5, 7.0, "#e3e8ea", { rx: 0.3 }),
    TX(51.75, 15.0, "Wi-Fi/BT", { fs: 1.0, fill: "#37474f" }),
    R(13.0, 36.0, 6.0, 6.0, "#1c1c1c", { stroke: "#000", sw: 0.12 }),
    TX(16, 39.4, "PMIC", { fs: 0.9, fill: "#cfd8dc" }),
    [[22, 40], [22, 42], [21, 45.4], [44, 40], [45.4, 40], [28, 41]].map(([x, y]) => pas(x, y)).join("\n"),
    led(8.2, 49.0, "#66bb6a"),
    led(8.2, 51.2, "#ef5350"),
    TX(24.5, 17.2, "Raspberry Pi 5", { fs: 1.7, fill: "#d7ecd9" }),
  ];
  return piBoard({
    id: "board.pi.5",
    file: "boards/pi-5.svg",
    caption: "Raspberry Pi 5",
    title: "Raspberry Pi 5 top view (original drawing, CC0)",
    S: 4,
    W,
    H,
    pcb: "#0f6a3a",
    edge: "#0a4b2a",
    parts,
    comment: [
      "Original CC0 top view for HelpmeSolder wiring diagrams.",
      "85 x 56 mm. GPIO header along the top edge; USB-C power, power button, two micro-HDMI ports and two camera/display FFC connectors on the",
      "bottom edge; PCIe FFC connector and microSD at the left end, RTC battery socket bottom left; fan and UART sockets near the right.",
      "BCM2712 under the heat spreader and the RP1 I/O chip. Exact positions of the FAN, UART, RTC and PCIe connectors are approximate.",
      ...mountsNote,
    ],
  });
}

// ============================================================ ESP8266 NodeMCU

function nodemcu() {
  const S = 9;
  const bw = 26 * S;
  const bh = 49 * S;
  const bx = 14;
  const by = 20;
  const width = bw + 2 * bx;
  const height = by + bh + 16;
  const mm = [];
  mm.push(R(0, 0, 26, 49, "#16191c", { stroke: "#000", sw: 0.3, rx: 0.8 }));
  // ESP-12E module with its meander antenna at the top
  mm.push(R(5.0, -1.2, 16, 24, "#101018", { stroke: "#2a2a40", sw: 0.2 }));
  for (let i = 0; i < 8; i++) {
    mm.push(R(4.7, 7.6 + i * 1.8, 0.7, 1.0, GOLD));
    mm.push(R(20.6, 7.6 + i * 1.8, 0.7, 1.0, GOLD));
  }
  for (let i = 0; i < 6; i++) mm.push(R(7.0 + i * 2.0, 22.5, 1.0, 0.7, GOLD));
  let ant = "M6.5 4.2";
  for (let i = 0; i < 6; i++) ant += ` V0.2 H${6.5 + i * 2.2 + 1.1} V4.2 H${6.5 + i * 2.2 + 2.2}`;
  mm.push(`<path d="${ant}" fill="none" stroke="${GOLD}" stroke-width="0.5" stroke-linejoin="round"/>`);
  mm.push(R(5.5, 7.0, 15, 15, "#cfd8dc", { stroke: "#78909c", sw: 0.2, rx: 0.4 }));
  mm.push(R(6.0, 7.5, 14, 14, "#e3e8ea", { rx: 0.3 }));
  mm.push(TX(13, 12.6, "ESP-12E", { fs: 1.7, fill: "#263238", bold: true }));
  mm.push(TX(13, 14.6, "ESP8266MOD", { fs: 1.1, fill: "#455a64" }));
  mm.push(TX(13, 16.3, "FCC ID", { fs: 0.9, fill: "#607d8b" }));
  mm.push(TX(13, 5.9, "", { fs: 1 }));
  mm.push(led(9.0, 41.8, "#42a5f5"));
  // silk text and support parts
  mm.push(TX(13, 26.0, "NodeMCU", { fs: 1.9, bold: true, fill: "#e0e0e0" }));
  mm.push(TX(13, 27.9, "v1.0 (Amica)", { fs: 0.95, fill: "#9e9e9e" }));
  mm.push(qfn(9.5, 33.5, 4.8, "CP2102", "", 7));
  mm.push(R(14.2, 31.2, 4.4, 3.0, "#222", { stroke: "#000", sw: 0.1 }));
  mm.push(R(15.4, 34.2, 2.0, 1.4, "#222"));
  mm.push(TX(16.4, 32.9, "1117", { fs: 0.8, fill: "#cfd8dc" }));
  [[6.6, 29.0, true], [19.2, 29.2, true], [6.4, 37.0, true], [12.6, 37.4], [14.3, 37.4], [18.8, 37.2, true]].forEach(([x, y, v]) => mm.push(pas(x, y, !!v)));
  // buttons and USB
  mm.push(tact(5.2, 44.2, 3.4, 3.4));
  mm.push(TX(5.2, 47.4, "FLASH", { fs: 0.95 }));
  mm.push(tact(20.8, 44.2, 3.4, 3.4));
  mm.push(TX(20.8, 47.4, "RST", { fs: 0.95 }));
  mm.push(conn(13.0, 47.4, 7.6, 5.6, "down"));
  mm.push(R(9.8, 43.6, 6.4, 1.2, "#cfd8dc", { rx: 0.3 }));

  const L = [
    ["A0", "a0"], ["RSV"], ["RSV"], ["SD3"], ["SD2"], ["SD1"], ["CMD"], ["SD0"], ["CLK"], ["GND", "gnd"], ["3V3", "3v3"], ["EN"], ["RST"], ["GND"], ["VIN", "vin"],
  ];
  const Rr = [
    ["D0", "d0"], ["D1", "d1"], ["D2", "d2"], ["D3", "d3"], ["D4", "d4"], ["3V3"], ["GND"], ["D5", "d5"], ["D6", "d6"], ["D7", "d7"], ["D8", "d8"], ["RX"], ["TX"], ["GND"], ["3V3"],
  ];
  const terminals = {};
  const pins = [];
  const lx = bx + 1.57 * S;
  const rx = lx + 22.86 * S;
  const y0 = by + 3.2 * S;
  const p = 2.54 * S;
  const add = (list, x, side) =>
    list.forEach(([label, cid], i) => {
      const y = r1(y0 + i * p);
      pins.push(`<circle class="${holeClass(label)}" cx="${r1(x)}" cy="${y}" r="5.4"/>`);
      pins.push(
        `<text class="pinlbl${cid ? "" : " muted"}" x="${r1(side === "left" ? x + 9 : x - 9)}" y="${y + 2.6}" text-anchor="${side === "left" ? "start" : "end"}" style="font-size:7px">${esc(label)}</text>`,
      );
      if (cid) terminals[cid] = { x: r1(x), y };
    });
  add(L, lx, "left");
  add(Rr, rx, "right");
  return doc({
    id: "board.esp8266.nodemcu",
    kind: "board",
    file: "boards/esp8266-nodemcu.svg",
    caption: "ESP8266 NodeMCU (ESP-12E, v1.0 Amica)",
    title: "ESP8266 NodeMCU top view (original drawing, CC0)",
    comment: [
      "Original CC0 top view for HelpmeSolder wiring diagrams.",
      "Black NodeMCU v1.0 (Amica) with a CP2102 USB bridge (CH340 on clones), ESP-12E module and antenna at the top, micro-USB with FLASH and RST at the bottom.",
      "Left header top to bottom: A0 RSV RSV SD3 SD2 SD1 CMD SD0 CLK GND 3V3 EN RST GND VIN.",
      "Right header top to bottom: D0 D1 D2 D3 D4 3V3 GND D5 D6 D7 D8 RX TX GND 3V3.",
      "Catalog GND is the left-header GND next to 3V3, catalog 3V is the left-header 3V3.",
    ],
    width,
    height,
    body: [gm(bx, by, S, mm), ...pins].join("\n"),
    terminals,
  });
}

// ============================================================ Capacitive soil moisture sensor v1.2

function soil() {
  const S = 5.5;
  const bw = 23 * S;
  const bh = 98 * S;
  const bx = 22;
  const by = 36;
  const width = bw + 2 * bx;
  const height = by + bh + 10;
  const mm = [];
  const outline = "M0 0 H23 V27.5 H20.6 V30.2 H23 V88.5 L19.2 98 H3.8 L0 88.5 V30.2 H2.4 V27.5 H0 Z";
  mm.push(`<path d="${outline}" fill="#232a2d" stroke="#0e1213" stroke-width="0.3" stroke-linejoin="round"/>`);
  mm.push(C(3.5, 3.6, 1.5, "#f5f5f5", { stroke: GOLD, sw: 0.4 }));
  mm.push(C(19.5, 3.6, 1.5, "#f5f5f5", { stroke: GOLD, sw: 0.4 }));
  // 3-pin JST connector at the top edge
  mm.push(R(7.5, -2.6, 8.0, 6.2, "#f2f0e8", { stroke: "#9e9a88", sw: 0.2, rx: 0.3 }));
  mm.push(R(8.2, -1.9, 6.6, 4.1, "#d7d2c0", { rx: 0.2 }));
  const px = [9.5, 11.5, 13.5];
  px.forEach((x) => mm.push(R(x - 0.4, -1.5, 0.8, 3.0, GOLD)));
  const labels = ["GND", "VCC", "AOUT"];
  labels.forEach((l, i) => mm.push(TX(px[i] - 0.35, 5.0, l, { fs: 1.1, fill: "#eceff1", rot: 90, anchor: "start" })));
  // 555 timer, regulator and passives
  mm.push(soic(6.4, 9.6, 4.8, 3.9, "TLC555", 4, 0.8));
  mm.push(R(14.0, 10.4, 3.0, 1.7, "#1c1c1c", { stroke: "#000", sw: 0.08 }));
  mm.push(R(14.3, 12.0, 0.6, 0.7, "#b8b8b8"));
  mm.push(R(15.2, 12.0, 0.6, 0.7, "#b8b8b8"));
  mm.push(R(16.1, 12.0, 0.6, 0.7, "#b8b8b8"));
  mm.push(R(14.3, 9.8, 0.6, 0.7, "#b8b8b8"));
  mm.push(R(16.1, 9.8, 0.6, 0.7, "#b8b8b8"));
  mm.push(TX(15.5, 9.2, "662K", { fs: 0.9, fill: "#cfd8dc" }));
  [[4.0, 9.8, true], [4.0, 11.4, true], [4.0, 13.0, true], [6.4, 15.0], [8.2, 15.0], [10.0, 15.0], [14.4, 15.4], [17.6, 15.0, true], [19.2, 11.0, true], [19.2, 12.6, true], [12.2, 9.6, true]].forEach(([x, y, v]) => mm.push(pas(x, y, !!v)));
  mm.push(R(18.8, 15.0, 2.2, 1.6, "#cfc0ac", { stroke: "#8a7660", sw: 0.08 }));
  // silk text
  mm.push(TX(11.5, 21.0, "Capacitive Soil", { fs: 1.35, fill: "#e0e0e0" }));
  mm.push(TX(11.5, 22.8, "Moisture Sensor v1.2", { fs: 1.1, fill: "#e0e0e0" }));
  mm.push(TX(11.5, 25.0, "3.3-5.5V DC", { fs: 0.95, fill: "#9e9e9e" }));
  // insertion limit line at the cut-outs
  mm.push(`<line x1="2.4" y1="29" x2="20.6" y2="29" stroke="#eceff1" stroke-width="0.3" stroke-dasharray="1 0.6"/>`);
  mm.push(TX(11.5, 31.8, "do not insert past this line", { fs: 0.9, fill: "#9e9e9e" }));
  // sensing area: white pad with the electrode comb underneath
  mm.push(R(3.0, 33.0, 17.0, 60.0, "#f1f3f2", { stroke: "#cfd8dc", sw: 0.2, rx: 1.4 }));
  for (let i = 0; i < 8; i++) {
    const y = 36 + i * 7.1;
    mm.push(R(5.0, y, 13.0, 0.9, "#cdd5d6"));
  }
  mm.push(R(10.9, 35.0, 1.2, 55.0, "#cdd5d6"));
  mm.push(TX(11.5, 90.8, "", { fs: 1 }));
  const terminals = {
    GND: { x: r1(bx + px[0] * S), y: r1(by - 1.5 * S + 0.0) },
    VCC: { x: r1(bx + px[1] * S), y: r1(by - 1.5 * S + 0.0) },
    AO: { x: r1(bx + px[2] * S), y: r1(by - 1.5 * S + 0.0) },
  };
  // the v1.2 board has no comparator: DO shares the AOUT pad
  terminals.DO = { ...terminals.AO };
  // terminal marker dots on the connector pins
  const dots = Object.values(px).map((x) => `<circle class="hole" cx="${r1(bx + x * S)}" cy="${terminals.GND.y}" r="3.2"/>`);
  dots[0] = `<circle class="hole gnd" cx="${r1(bx + px[0] * S)}" cy="${terminals.GND.y}" r="3.2"/>`;
  dots[1] = `<circle class="hole pwr" cx="${r1(bx + px[1] * S)}" cy="${terminals.GND.y}" r="3.2"/>`;
  return doc({
    id: "module.soil.moisture",
    kind: "module",
    file: "modules/soil-moisture-capacitive.svg",
    caption: "Capacitive soil moisture sensor v1.2",
    title: "Capacitive soil moisture sensor v1.2 top view (original drawing, CC0)",
    comment: [
      "Original CC0 top view for HelpmeSolder wiring diagrams.",
      "98 x 23 mm board: 3-pin JST connector at the top (GND, VCC, AOUT as printed), TLC555 timer and 3.3 V regulator below it,",
      "notches on both edges marking the maximum insertion depth, and the white sensing area down to the pointed tip.",
      "The v1.2 board has no digital output: the catalog DO pin shares the AOUT pad. Silk colour and electrode pattern are simplified.",
    ],
    width,
    height,
    body: [gm(bx, by, S, mm), ...dots].join("\n"),
    terminals,
    pinExit: { dx: 0, dy: -1 },
  });
}

export default [picoRp2040, picoW, pico2, piZeroW, pi3bPlus, pi4b, pi5, nodemcu, soil];
