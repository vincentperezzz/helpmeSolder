// Microcontroller boards: Arduino family, D1 Mini, Pi Zero 2 W, Pico 2 W, Teensy 4.0, Blue Pill, Digispark, micro:bit, XIAO RP2040.
import { dualHeaderBoard, holeMount, esc, r1 } from "./_lib.mjs";

const GOLD = "#d9b44a";
const GOLD_D = "#a07d1c";
const mono = `font-family="ui-monospace, monospace"`;

const kindOf = (l) =>
  /^(GND|G|AGND)$/i.test(l) ? "gnd" : /^(5V|VBUS|VIN|VSYS|VUSB|RAW|VCC)$/i.test(l) ? "pwr" : /^(3V3|3\.3|3V|3\.3V)$/i.test(l) ? "v3" : "";
const holeCls = (l) => `hole${kindOf(l) ? " " + kindOf(l) : ""}`;

const T = (x, y, s, { fs = 7, fill = "#eceff1", anchor = "middle", rot = 0, bold = false, op } = {}) =>
  `  <text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" ${mono} font-size="${fs}" fill="${fill}"${bold ? ` font-weight="bold"` : ""}${op ? ` opacity="${op}"` : ""}${rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : ""}>${esc(s)}</text>`;

/** Pin collector: draws a hole (optionally on a gold pad) plus its printed label, and records catalog terminals. */
function mk() {
  const out = [];
  const terminals = {};
  const pin = (x, y, label, id, o = {}) => {
    const { r = 5, pad = 0, lbl = "right", gap = 11, fs = 7, muted = false, fill } = o;
    if (pad) out.push(`  <circle cx="${r1(x)}" cy="${r1(y)}" r="${pad}" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="0.8"/>`);
    out.push(`  <circle class="${holeCls(label)}" cx="${r1(x)}" cy="${r1(y)}" r="${r}"/>`);
    const f = fill ?? (muted ? "#90a4ae" : "#eceff1");
    if (lbl === "right") out.push(T(x + gap, y + fs * 0.4, label, { fs, anchor: "start", fill: f }));
    else if (lbl === "left") out.push(T(x - gap, y + fs * 0.4, label, { fs, anchor: "end", fill: f }));
    else if (lbl === "down") out.push(`  <text x="${r1(x)}" y="${r1(y + gap)}" transform="rotate(90 ${r1(x)} ${r1(y + gap)})" dy="${r1(fs * 0.4)}" ${mono} font-size="${fs}" fill="${f}">${esc(label)}</text>`);
    else if (lbl === "up") out.push(`  <text x="${r1(x)}" y="${r1(y - gap)}" transform="rotate(-90 ${r1(x)} ${r1(y - gap)})" dy="${r1(fs * 0.4)}" ${mono} font-size="${fs}" fill="${f}">${esc(label)}</text>`);
    for (const i of [].concat(id ?? [])) terminals[i] = { x: r1(x), y: r1(y) };
  };
  return { out, terminals, pin };
}

// ---- small drawing parts -------------------------------------------------

const rect = (x, y, w, h, fill, { rx = 0, stroke, sw = 1, extra = "" } = {}) =>
  `  <rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${rx ? ` rx="${rx}"` : ""} fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""}${extra} />`;

const tact = (cx, cy, w = 16, h = 14) =>
  [
    `  <rect class="btn" x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="2"/>`,
    `  <circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(Math.min(w, h) * 0.3)}" fill="#37474f"/>`,
  ].join("\n");

const smdc = (x, y, w = 7, h = 4) => `  <rect class="smd" x="${r1(x)}" y="${r1(y)}" width="${w}" height="${h}" rx="0.6"/>`;

const ledS = (cx, cy, fill, w = 8, h = 5) =>
  `  <rect x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="1" fill="${fill}" stroke="#00000066" stroke-width="0.6"/>`;

/** Square QFP/QFN package with leads on all sides. */
function qfp(cx, cy, s, label, { n = 9, fs = 6, lead = true, sub } = {}) {
  const x = cx - s / 2;
  const y = cy - s / 2;
  const out = [];
  if (lead) {
    const step = (s - 8) / (n - 1);
    for (let i = 0; i < n; i++) {
      const o = 4 + i * step;
      out.push(`  <path d="M${r1(x + o)} ${r1(y - 3)}V${r1(y)} M${r1(x + o)} ${r1(y + s)}V${r1(y + s + 3)} M${r1(x - 3)} ${r1(y + o)}H${r1(x)} M${r1(x + s)} ${r1(y + o)}H${r1(x + s + 3)}" stroke="#b0bec5" stroke-width="1.4"/>`);
    }
  }
  out.push(`  <rect class="chip" x="${r1(x)}" y="${r1(y)}" width="${s}" height="${s}" rx="1.5"/>`);
  out.push(`  <circle cx="${r1(x + 5)}" cy="${r1(y + 5)}" r="1.4" fill="#555"/>`);
  if (label) out.push(T(cx, cy + (sub ? -1 : 2), label, { fs }));
  if (sub) out.push(T(cx, cy + 7, sub, { fs: fs - 1, fill: "#b0bec5" }));
  return out.join("\n");
}

/** SOIC-style IC: body with pin stubs on the two long sides (horizontal body). */
function soic(cx, cy, w, h, label, { n = 4, fs = 5, rot = 0 } = {}) {
  const out = [`  <g${rot ? ` transform="rotate(${rot} ${r1(cx)} ${r1(cy)})"` : ""}>`];
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const px = cx - w / 2 + step * (i + 0.5);
    out.push(`    <path d="M${r1(px)} ${r1(cy - h / 2 - 3)}V${r1(cy - h / 2)} M${r1(px)} ${r1(cy + h / 2)}V${r1(cy + h / 2 + 3)}" stroke="#b0bec5" stroke-width="1.4"/>`);
  }
  out.push(`    <rect class="chip" x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="1"/>`);
  out.push(`    <circle cx="${r1(cx - w / 2 + 3.5)}" cy="${r1(cy - h / 2 + 3.5)}" r="1.1" fill="#555"/>`);
  if (label) out.push(`    <text x="${r1(cx)}" y="${r1(cy + fs * 0.35)}" text-anchor="middle" ${mono} font-size="${fs}" fill="#eceff1">${esc(label)}</text>`);
  out.push(`  </g>`);
  return out.join("\n");
}

/** Metal can crystal (HC-49 SMD style). */
const crystal = (cx, cy, w, h, label) =>
  [
    `  <rect x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="${r1(h / 2.4)}" fill="#cfd8dc" stroke="#78909c" stroke-width="1"/>`,
    `  <rect x="${r1(cx - w / 2 + 3)}" y="${r1(cy - h / 2 + 3)}" width="${r1(w - 6)}" height="${r1(h - 6)}" rx="1.5" fill="#b0bec5"/>`,
    label ? T(cx, cy + 2, label, { fs: 5.5, fill: "#263238" }) : "",
  ].join("\n");

/** Micro-USB shell. Drawn with its mouth facing `dir`, centred on the board edge point (cx, cy). */
function microUsb(cx, cy, dir, { w = 40, out = 10, inn = 26 } = {}) {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return [
    `  <g transform="translate(${r1(cx)} ${r1(cy)}) rotate(${rot})">`,
    `    <rect x="${r1(-w / 2)}" y="${-out}" width="${w}" height="${out + inn}" rx="2.5" fill="#cfd8dc" stroke="#607d8b" stroke-width="1.2"/>`,
    `    <path d="M${r1(-w * 0.38)} ${-out + 1.5}H${r1(w * 0.38)}V${r1(-out + 1.5 + out * 0.55)}L${r1(w * 0.3)} ${r1(-out + 3 + out * 0.8)}H${r1(-w * 0.3)}L${r1(-w * 0.38)} ${r1(-out + 1.5 + out * 0.55)}Z" fill="#37474f"/>`,
    `    <rect x="${r1(-w * 0.28)}" y="${r1(-out + 4)}" width="${r1(w * 0.56)}" height="2" fill="#90a4ae"/>`,
    `    <rect x="${r1(-w / 2 + 3)}" y="${r1(inn * 0.45)}" width="${r1(w - 6)}" height="${r1(inn * 0.3)}" rx="1" fill="#b0bec5"/>`,
    `  </g>`,
  ].join("\n");
}

/** Header strip (plastic block) with plain pads, no labels or terminals. */
function dotRow(x, y, n, pitch, dir = "x", { r = 3.6, fill = "#1b1b1b", pad = GOLD } = {}) {
  const out = [];
  if (dir === "x") out.push(rect(x - 9, y - 9, pitch * (n - 1) + 18, 18, fill, { rx: 2 }));
  else out.push(rect(x - 9, y - 9, 18, pitch * (n - 1) + 18, fill, { rx: 2 }));
  for (let i = 0; i < n; i++) {
    const px = dir === "x" ? x + i * pitch : x;
    const py = dir === "x" ? y : y + i * pitch;
    out.push(`  <circle cx="${r1(px)}" cy="${r1(py)}" r="${r}" fill="${pad}"/>`);
  }
  return out.join("\n");
}

const doc = (d) => ({ kind: d.id.startsWith("board.") ? "board" : "module", ...d });

// ============================================================ Arduino Leonardo

function leonardo() {
  const width = 360;
  const height = 300;
  const bx = 14;
  const by = 16;
  const bw = 343;
  const bh = 267;
  const m = mk();
  const hx = (inch) => bx + inch * 127;
  const topY = by + 13;
  const botY = by + bh - 13;
  const rows = [];
  const rh = (pins, x, y, side) => {
    const out = [];
    const n = pins.length;
    out.push(rect(x - 9, y - 9, 12.7 * (n - 1) + 18, 18, "#1b1b1b", { rx: 2 }));
    pins.forEach(([label, id], i) => {
      m.pin(x + i * 12.7, y, label, id, { r: 4.3, lbl: side === "top" ? "down" : "up", gap: 11, fs: 7 });
    });
    rows.push(...out);
  };
  // header plastics first, then pins (pins push into m.out)
  const topA = [["SCL"], ["SDA"], ["AREF"], ["GND", "GND.3"], ["D13", "D13"], ["D12", "D12"], ["D11", "D11"], ["D10", "D10"], ["D9", "D9"], ["D8", "D8"]];
  const topB = [["D7", "D7"], ["D6", "D6"], ["D5", "D5"], ["D4", "D4"], ["D3", "D3"], ["D2", "D2"], ["D1", "D1"], ["D0", "D0"]];
  const botP = [["NC"], ["IOREF"], ["RESET"], ["3V3", "3V3"], ["5V", "5V"], ["GND", "GND.1"], ["GND", "GND.2"], ["VIN", "VIN"]];
  const botA = [["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]];
  rh(topA, hx(0.7), topY, "top");
  rh(topB, hx(1.8), topY, "top");
  rh(botP, hx(1.0), botY, "bot");
  rh(botA, hx(1.9), botY, "bot");
  // ICSP-style SDA/SCL labels already printed; D2/D3 wired at the D2/D3 holes
  const decor = [
    rect(bx, by, bw, bh, "#00838f", { rx: 8, stroke: "#005b64", sw: 2 }),
    holeMount(bx + 76, by + 13, 6),
    holeMount(bx + 316, by + 89, 6),
    holeMount(bx + 316, by + 229, 6),
    holeMount(bx + 70, by + bh - 12, 6),
    ...rows,
    // micro-USB on the left, reset button above it
    microUsb(bx, 104, "left", { w: 38, out: 9, inn: 28 }),
    tact(62, 46),
    T(62, 66, "RESET", { fs: 6 }),
    // DC jack
    rect(bx - 10, by + bh - 86, 76, 46, "#212121", { rx: 3, stroke: "#000" }),
    rect(bx - 6, by + bh - 82, 30, 38, "#37474f", { rx: 2 }),
    `  <circle cx="${bx + 40}" cy="${by + bh - 63}" r="9" fill="#111" stroke="#455a64"/>`,
    `  <circle cx="${bx + 40}" cy="${by + bh - 63}" r="3" fill="#78909c"/>`,
    T(bx + 55, by + bh - 76, "DC", { fs: 6, fill: "#90a4ae" }),
    // regulator, caps
    `  <rect class="chip" x="96" y="140" width="20" height="14" rx="1.5"/>`,
    rect(116, 143, 6, 8, "#1a1a1a"),
    smdc(96, 160, 8, 5),
    smdc(108, 160, 8, 5),
    smdc(96, 168, 8, 5),
    // crystal and the ATmega32U4
    crystal(138, 150, 22, 52, "16.000"),
    qfp(205, 150, 58, "ATmega32U4", { n: 11, fs: 6 }),
    // ICSP 2x3 (vertical, MISO/SCK/RESET on the left column)
    dotRow(322, 130, 3, 13, "y"),
    dotRow(335, 130, 3, 13, "y"),
    T(329, 123, "ICSP", { fs: 6, fill: "#b0bec5" }),
    // status LEDs
    ledS(262, 100, "#ffb74d"),
    ledS(262, 112, "#ffb74d"),
    ledS(262, 124, "#ffb74d"),
    T(273, 102, "TX", { fs: 5.5, anchor: "start" }),
    T(273, 114, "RX", { fs: 5.5, anchor: "start" }),
    T(273, 126, "L", { fs: 5.5, anchor: "start" }),
    ledS(262, 205, "#66bb6a"),
    T(273, 207, "ON", { fs: 5.5, anchor: "start" }),
    T(205, 218, "LEONARDO", { fs: 13, bold: true }),
    T(205, 230, "ARDUINO", { fs: 7, fill: "#b2ebf2" }),
  ].join("\n");
  return doc({
    id: "board.arduino.leonardo",
    file: "boards/arduino-leonardo.svg",
    caption: "Arduino Leonardo",
    title: "Arduino Leonardo top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Uno-shaped teal board: micro-USB and DC jack on the left edge, digital header D13..D8 / D7..D0 along the top,",
      "power and analog headers along the bottom, 2x3 ICSP near the right edge, ATmega32U4 with 16 MHz crystal in the middle.",
      "The SCL/SDA pins next to AREF are the same nets as D3/D2; wires end on the numbered D2/D3 holes.",
    ],
    width,
    height,
    body: decor + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

// ============================================================ Nano-form Arduino boards (Micro, Nano Every)

function nanoForm(cfg) {
  const { sc, bx, by, top, bot, x0, h, usbY, deco, width, height, pitch } = cfg;
  const bw = cfg.bw;
  const m = mk();
  const topY = by + 9.5;
  const botY = by + h - 9.5;
  const body = [rect(bx, by, bw, h, "#00838f", { rx: 5, stroke: "#005b64", sw: 2 })];
  body.push(rect(bx, by, 0, 0, "none"));
  top.forEach(([label, id], i) => m.pin(x0 + i * pitch, topY, label, id, { r: 4.2, pad: 7.2, lbl: "down", gap: 12, fs: 6.5 }));
  bot.forEach(([label, id], i) => m.pin(x0 + i * pitch, botY, label, id, { r: 4.2, pad: 7.2, lbl: "up", gap: 12, fs: 6.5 }));
  return { body: body.join("\n") + "\n" + deco + "\n" + m.out.join("\n"), terminals: m.terminals, width, height };
}

function arduinoMicro() {
  const sc = 6.6;
  const top = [["D13", "D13"], ["3V3", "3V3"], ["REF"], ["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"], ["15"], ["14"], ["16"], ["5V", "5V"], ["GND", "GND.2"], ["VIN", "VIN"]];
  const bot = [["TX1", "D1"], ["RX0", "D0"], ["RST"], ["GND", "GND.1"], ["D2", "D2"], ["D3", "D3"], ["D4", "D4"], ["D5", "D5"], ["D6", "D6"], ["D7", "D7"], ["D8", "D8"], ["D9", "D9"], ["D10", "D10"], ["D11", "D11"], ["D12", "D12"]];
  const bx = 28;
  const by = 20;
  const h = 120;
  const pitch = 16.8;
  const x0 = bx + 38;
  const mid = by + h / 2;
  const deco = [
    microUsb(bx, mid, "left", { w: 40, out: 9, inn: 26 }),
    tact(bx + 42, mid - 4, 14, 12),
    T(bx + 42, mid + 10, "RESET", { fs: 4.5, fill: "#cfd8dc" }),
    crystal(bx + 104, mid, 40, 14, "16.000"),
    qfp(bx + 175, mid, 46, "ATmega", { n: 9, fs: 5.5, sub: "32U4" }),
    smdc(bx + 118, mid - 22, 7, 4),
    smdc(bx + 128, mid - 22, 7, 4),
    smdc(bx + 118, mid + 20, 7, 4),
    `  <rect class="chip" x="${bx + 218}" y="${mid - 7}" width="14" height="10" rx="1.5"/>`,
    ledS(bx + 64, mid - 12, "#66bb6a", 7, 4),
    ledS(bx + 64, mid - 2, "#ffb74d", 7, 4),
    ledS(bx + 64, mid + 8, "#ffb74d", 7, 4),
    ledS(bx + 64, mid + 18, "#ffb74d", 7, 4),
    T(bx + 71, mid - 10.5, "ON", { fs: 4, anchor: "start" }),
    T(bx + 71, mid - 0.5, "RX", { fs: 4, anchor: "start" }),
    T(bx + 71, mid + 9.5, "TX", { fs: 4, anchor: "start" }),
    T(bx + 71, mid + 19.5, "L", { fs: 4, anchor: "start" }),
    dotRow(bx + 280, mid - 12, 3, 12, "y"),
    dotRow(bx + 292, mid - 12, 3, 12, "y"),
    T(bx + 286, mid - 22, "ICSP", { fs: 4.5, fill: "#b0bec5" }),
    T(bx + 240, mid + 2, "MICRO", { fs: 9, bold: true }),
    T(bx + 240, mid + 12, "ARDUINO", { fs: 5, fill: "#b2ebf2" }),
  ].join("\n");
  const art = nanoForm({ sc, bx, by, top, bot, x0, h, usbY: mid, deco, width: 360, height: 160, pitch, bw: 316 });
  return doc({
    id: "board.arduino.micro",
    file: "boards/arduino-micro.svg",
    caption: "Arduino Micro",
    title: "Arduino Micro top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "48 x 18 mm teal board, micro-USB on the left, ATmega32U4 with 16 MHz crystal, reset button, L/TX/RX/ON LEDs, ICSP at the right end.",
      "Top row left to right: D13, 3V3, REF, A0-A5, 15 (SCK), 14 (MISO), 16 (MOSI), 5V, GND, VIN.",
      "Bottom row: TX1 (D1), RX0 (D0), RST, GND, D2-D12. Printed names are from Arduino's published Micro pinout; verify on a clone.",
    ],
    ...art,
  });
}

function nanoEvery() {
  const top = [["VIN", "VIN"], ["GND", "GND.2"], ["RST"], ["5V", "5V"], ["A7", "A7"], ["A6", "A6"], ["A5", "A5"], ["A4", "A4"], ["A3", "A3"], ["A2", "A2"], ["A1", "A1"], ["A0", "A0"], ["REF"], ["3V3", "3V3"], ["D13", "D13"]];
  const bot = [["D1", "D1"], ["D0", "D0"], ["RST"], ["GND", "GND.1"], ["D2", "D2"], ["D3", "D3"], ["D4", "D4"], ["D5", "D5"], ["D6", "D6"], ["D7", "D7"], ["D8", "D8"], ["D9", "D9"], ["D10", "D10"], ["D11", "D11"], ["D12", "D12"]];
  const bx = 28;
  const by = 20;
  const h = 120;
  const pitch = 17.4;
  const x0 = bx + 36;
  const mid = by + h / 2;
  const deco = [
    microUsb(bx, mid, "left", { w: 40, out: 9, inn: 26 }),
    tact(bx + 50, mid - 26, 14, 12),
    T(bx + 50, mid - 14, "RESET", { fs: 5, fill: "#cfd8dc" }),
    soic(bx + 66, mid + 6, 22, 12, "SAMD11", { n: 5, fs: 4.5 }),
    soic(bx + 100, mid - 14, 12, 8, "", { n: 3 }),
    smdc(bx + 94, mid + 14, 7, 4),
    smdc(bx + 104, mid + 14, 7, 4),
    qfp(bx + 170, mid, 50, "ATMEGA", { n: 12, fs: 5.5, sub: "4809" }),
    smdc(bx + 215, mid - 18, 7, 4),
    smdc(bx + 215, mid + 14, 7, 4),
    ledS(bx + 232, mid - 14, "#66bb6a", 7, 4),
    ledS(bx + 232, mid - 5, "#ffb74d", 7, 4),
    ledS(bx + 232, mid + 4, "#ffb74d", 7, 4),
    ledS(bx + 232, mid + 13, "#ffb74d", 7, 4),
    T(bx + 242, mid - 12, "ON", { fs: 4.5, anchor: "start" }),
    T(bx + 242, mid - 3, "L", { fs: 4.5, anchor: "start" }),
    T(bx + 242, mid + 6, "RX", { fs: 4.5, anchor: "start" }),
    T(bx + 242, mid + 15, "TX", { fs: 4.5, anchor: "start" }),
    T(bx + 274, mid - 2, "NANO", { fs: 10, bold: true }),
    T(bx + 274, mid + 9, "EVERY", { fs: 8, bold: true }),
  ].join("\n");
  const art = nanoForm({ sc: 6.9, bx, by, top, bot, x0, h, usbY: mid, deco, width: 360, height: 160, pitch, bw: 313 });
  return doc({
    id: "board.arduino.nano.every",
    file: "boards/arduino-nano-every.svg",
    caption: "Arduino Nano Every",
    title: "Arduino Nano Every top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "45 x 18 mm Nano footprint, micro-USB on the left, ATMega4809 (QFP-48, no crystal) and the small SAMD11 USB bridge.",
      "Drawn rotated 90 degrees from the usual upright view. Top row left to right: VIN, GND, RST, 5V, A7..A0, REF, 3V3, D13.",
      "Bottom row: D1 (TX1), D0 (RX0), RST, GND, D2-D12.",
    ],
    ...art,
  });
}

// ============================================================ Pro Mini 5V

function proMini() {
  const width = 250;
  const height = 392;
  const bx = 32;
  const by = 20;
  const bw = 180;
  const bh = 348;
  const m = mk();
  const lx = bx + 12;
  const rx = bx + bw - 12;
  const y0 = 94;
  const p = 23;
  const left = [["TXO", "D1"], ["RXI", "D0"], ["RST"], ["GND", "GND.1"], ["D2", "D2"], ["D3", "D3"], ["D4", "D4"], ["D5", "D5"], ["D6", "D6"], ["D7", "D7"], ["D8", "D8"], ["D9", "D9"]];
  const right = [["RAW", "RAW"], ["GND", "GND.2"], ["RST"], ["VCC", "VCC"], ["A3", "A3"], ["A2", "A2"], ["A1", "A1"], ["A0", "A0"], ["D13", "D13"], ["D12", "D12"], ["D11", "D11"], ["D10", "D10"]];
  left.forEach(([l, id], i) => m.pin(lx, y0 + i * p, l, id, { r: 4.3, pad: 7.6, lbl: "right", gap: 11 }));
  right.forEach(([l, id], i) => m.pin(rx, y0 + i * p, l, id, { r: 4.3, pad: 7.6, lbl: "left", gap: 11 }));
  // inner analog-only holes
  const ix = rx - 34;
  m.pin(ix, y0 + 4 * p, "A4", "A4", { r: 4.3, pad: 7.6, lbl: "left", gap: 11 });
  m.pin(ix, y0 + 5 * p, "A5", "A5", { r: 4.3, pad: 7.6, lbl: "left", gap: 11 });
  m.pin(ix, y0 + 2 * p, "A6", "A6", { r: 4.3, pad: 7.6, lbl: "left", gap: 11 });
  m.pin(ix, y0 + 3 * p, "A7", "A7", { r: 4.3, pad: 7.6, lbl: "left", gap: 11 });
  // FTDI header across the top
  const ftdi = ["GND", "CTS", "VCC", "TXO", "RXI", "DTR"];
  const fx0 = bx + 24;
  const fy = by + 28;
  const deco = [
    rect(bx, by, bw, bh, "#c62828", { rx: 6, stroke: "#7f0000", sw: 2 }),
    dotRow(fx0, fy, 6, 22, "x", { r: 5 }),
    ...ftdi.map((l, i) =>
      i === 0
        ? ""
        : T(fx0 + i * 22, fy + 22, l, { fs: 6.5, rot: 0 }),
    ),
    T(fx0, fy + 22, "GND", { fs: 6.5 }),
    tact(bx + bw - 22, by + 30, 16, 14),
    T(bx + bw - 22, by + 48, "RST", { fs: 5.5 }),
    // ATmega328P (TQFP-32) and the resonator
    qfp(bx + 70, by + 185, 54, "ATmega", { n: 8, fs: 6, sub: "328P" }),
    `  <rect x="${bx + 58}" y="${by + 238}" width="24" height="12" rx="2" fill="#e0c068" stroke="#8d6e1b"/>`,
    T(bx + 70, by + 262, "16MHz", { fs: 5.5 }),
    `  <rect class="chip" x="${bx + 100}" y="${by + 258}" width="16" height="10" rx="1.5"/>`,
    smdc(bx + 90, by + 280, 8, 5),
    smdc(bx + 102, by + 280, 8, 5),
    ledS(bx + 40, by + 300, "#66bb6a", 8, 5),
    T(bx + 40, by + 312, "PWR", { fs: 5.5 }),
    ledS(bx + 100, by + 300, "#ffb74d", 8, 5),
    T(bx + 100, by + 312, "13", { fs: 5.5 }),
    T(bx + 90, by + 332, "Pro Mini 5V/16MHz", { fs: 7, fill: "#ffcdd2" }),
  ].join("\n");
  return doc({
    id: "board.arduino.promini.5v",
    file: "boards/arduino-pro-mini-5v.svg",
    caption: "Arduino Pro Mini 5 V / 16 MHz",
    title: "Arduino Pro Mini 5 V top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Red 33 x 18 mm SparkFun-style board, 6-pin FTDI header across the top, ATmega328P TQFP and 16 MHz resonator.",
      "Left edge top to bottom: TXO, RXI, RST, GND, D2-D9. Right edge: RAW, GND, RST, VCC, A3, A2, A1, A0, D13-D10.",
      "A4/A5 and A6/A7 are the inner holes. The FTDI GND pin is the third GND (GND.3 is drawn there only as label; wire to the edge pins).",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals: (() => {
      const t = m.terminals;
      t["GND.3"] = { x: r1(fx0), y: r1(fy) };
      return t;
    })(),
  });
}

// ============================================================ Wemos D1 Mini

function d1Mini() {
  const width = 260;
  const height = 332;
  const bx = 28;
  const by = 20;
  const bw = 204;
  const bh = 274;
  const m = mk();
  const lx = bx + 11;
  const rx = bx + bw - 11;
  const y0 = 138;
  const p = 20;
  const left = [["RST", "RST"], ["A0", "A0"], ["D0", "D0"], ["D5", "D5"], ["D6", "D6"], ["D7", "D7"], ["D8", "D8"], ["3V3", "3V3"]];
  const right = [["TX", "TX"], ["RX", "RX"], ["D1", "D1"], ["D2", "D2"], ["D3", "D3"], ["D4", "D4"], ["G", "GND"], ["5V", "5V"]];
  left.forEach(([l, id], i) => m.pin(lx, y0 + i * p, l, id, { r: 4.3, pad: 7.4, lbl: "right", gap: 10, fs: 7 }));
  right.forEach(([l, id], i) => m.pin(rx, y0 + i * p, l, id, { r: 4.3, pad: 7.4, lbl: "left", gap: 10, fs: 7 }));
  const cx = bx + bw / 2;
  // meandering antenna in the top of the module
  let ant = `M${cx - 44} 80`;
  for (let i = 0; i < 6; i++) ant += ` V${34 + (i % 2) * 0} H${cx - 44 + (i + 1) * 15} V80`.replace(`V${34} `, "V34 ");
  const meander = [];
  for (let i = 0; i < 6; i++) {
    const x = cx - 46 + i * 18;
    meander.push(`M${x} 78 V32 H${x + 9} V78`);
  }
  const deco = [
    rect(bx, by, bw, bh, "#1b1e23", { rx: 7, stroke: "#050607", sw: 2 }),
    // ESP-12 module: dark PCB with castellated pads, antenna on top, shield below
    rect(cx - 64, by + 2, 128, 196, "#101214", { rx: 3, stroke: "#c9a227", sw: 1 }),
    `  <path d="${meander.join(" ")}" fill="none" stroke="#d9b44a" stroke-width="3" stroke-linejoin="round"/>`,
    `  <path d="M${cx - 46} 78 H${cx + 54}" stroke="#d9b44a" stroke-width="3"/>`,
    rect(cx - 58, by + 82, 116, 110, "#cfd8dc", { rx: 2, stroke: "#78909c", sw: 1.2 }),
    rect(cx - 52, by + 88, 104, 98, "#e3e8ea", { rx: 1.5 }),
    T(cx, by + 118, "ESP-12F", { fs: 11, fill: "#263238", bold: true }),
    T(cx, by + 132, "ESP8266", { fs: 7, fill: "#455a64" }),
    T(cx, by + 143, "2.4 GHz WiFi", { fs: 6, fill: "#455a64" }),
    // CH340, regulator, reset, LED
    soic(cx - 32, by + 226, 28, 14, "CH340", { n: 5, fs: 5 }),
    `  <rect class="chip" x="${cx + 12}" y="${by + 216}" width="16" height="10" rx="1.5"/>`,
    smdc(cx - 6, by + 244, 7, 4),
    smdc(cx + 6, by + 244, 7, 4),
    tact(cx + 40, by + 236, 16, 14),
    T(cx + 40, by + 252, "RST", { fs: 5 }),
    ledS(cx - 52, by + 200, "#42a5f5", 7, 4),
    microUsb(cx, by + bh, "down", { w: 56, out: 10, inn: 28 }),
  ].join("\n");
  return doc({
    id: "board.esp8266.d1mini",
    file: "boards/esp8266-d1-mini.svg",
    caption: "Wemos / LOLIN D1 Mini (ESP8266)",
    title: "Wemos D1 Mini top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "34 x 26 mm board: ESP-12F style shielded module with PCB antenna at the top, CH340 USB chip, reset button, micro-USB at the bottom.",
      "Left edge top to bottom: RST, A0, D0, D5, D6, D7, D8, 3V3. Right edge: TX, RX, D1, D2, D3, D4, G, 5V.",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

// ============================================================ Raspberry Pi Zero 2 W

function piZero2w() {
  const width = 362;
  const height = 232;
  const bx = 16;
  const by = 44;
  const bw = 330;
  const bh = 156;
  const m = mk();
  const names = {
    1: "3V3", 2: "5V", 3: "GP2", 4: "5V", 5: "GP3", 6: "GND", 7: "GP4", 8: "GP14", 9: "GND", 10: "GP15",
    11: "GP17", 12: "GP18", 13: "GP27", 14: "GND", 15: "GP22", 16: "GP23", 17: "3V3", 18: "GP24", 19: "GP10", 20: "GND",
    21: "GP9", 22: "GP25", 23: "GP11", 24: "GP8", 25: "GND", 26: "GP7", 27: "ID_SD", 28: "ID_SC", 29: "GP5", 30: "GND",
    31: "GP6", 32: "GP12", 33: "GP13", 34: "GND", 35: "GP19", 36: "GP16", 37: "GP26", 38: "GP20", 39: "GND", 40: "GP21",
  };
  const idOf = (n) => {
    const l = names[n];
    if (n === 1) return "3V3.1";
    if (n === 17) return "3V3.2";
    if (n === 2) return "5V.1";
    if (n === 4) return "5V.2";
    if (l === "GND") return `GND.${n}`;
    if (/^GP\d+$/.test(l)) return `GPIO${l.slice(2)}`;
    return undefined;
  };
  const x0 = bx + 38;
  const pitch = 13;
  const rowTop = by + 17;
  const rowBot = by + 30;
  const header = rect(x0 - 10, rowTop - 9, pitch * 19 + 20, 31, "#151515", { rx: 2 });
  const pins = [];
  for (let i = 0; i < 20; i++) {
    const nTop = 2 * i + 2;
    const nBot = 2 * i + 1;
    m.pin(x0 + i * pitch, rowTop, names[nTop], idOf(nTop), { r: 4, lbl: "up", gap: 9, fs: 6.5, muted: !idOf(nTop) });
    m.pin(x0 + i * pitch, rowBot, names[nBot], idOf(nBot), { r: 4, lbl: "down", gap: 9, fs: 6.5, muted: !idOf(nBot) });
  }
  const deco = [
    rect(bx, by, bw, bh, "#2e7d32", { rx: 8, stroke: "#1b5e20", sw: 2 }),
    holeMount(bx + 18, by + 18, 6),
    holeMount(bx + bw - 18, by + 18, 6),
    holeMount(bx + 18, by + bh - 18, 6),
    holeMount(bx + bw - 18, by + bh - 18, 6),
    header,
    // micro SD slot on the left short edge
    rect(bx - 10, by + 62, 54, 56, "#cfd8dc", { rx: 2, stroke: "#607d8b", sw: 1.2 }),
    rect(bx - 6, by + 72, 40, 36, "#90a4ae", { rx: 1 }),
    rect(bx - 10, by + 86, 14, 8, "#37474f"),
    // camera connector on the right edge
    rect(bx + bw - 22, by + 50, 22, 68, "#eceff1", { rx: 2, stroke: "#90a4ae" }),
    rect(bx + bw - 16, by + 54, 12, 60, "#37474f", { rx: 1 }),
    T(bx + bw - 30, by + 86, "CAM", { fs: 6, rot: -90 }),
    // RP3A0 package
    rect(bx + 150, by + 78, 56, 56, "#b0bec5", { rx: 3, stroke: "#78909c", sw: 1.4 }),
    rect(bx + 154, by + 82, 48, 48, "#cfd8dc", { rx: 2 }),
    T(bx + 178, by + 104, "RP3A0", { fs: 7, fill: "#263238", bold: true }),
    T(bx + 178, by + 114, "Pi Zero 2", { fs: 5.5, fill: "#455a64" }),
    smdc(bx + 120, by + 84, 7, 4),
    smdc(bx + 120, by + 92, 7, 4),
    smdc(bx + 214, by + 84, 7, 4),
    smdc(bx + 214, by + 92, 7, 4),
    ledS(bx + 232, by + 70, "#66bb6a", 7, 4),
    // mini HDMI and the two micro-USB ports
    `  <g>`,
    rect(bx + 50, by + bh - 36, 58, 36 + 3, "#cfd8dc", { rx: 2, stroke: "#607d8b", sw: 1.2 }),
    rect(bx + 56, by + bh - 6, 46, 7, "#263238", { rx: 2 }),
    `  </g>`,
    T(bx + 79, by + bh - 44, "HDMI", { fs: 6 }),
    microUsb(bx + 214, by + bh, "down", { w: 42, out: 3, inn: 28 }),
    microUsb(bx + 278, by + bh, "down", { w: 42, out: 3, inn: 28 }),
    T(bx + 214, by + bh - 36, "USB", { fs: 6 }),
    T(bx + 278, by + bh - 36, "PWR", { fs: 6 }),
    T(bx + 168, by + bh - 6, "Raspberry Pi Zero 2 W", { fs: 6.5, fill: "#c8e6c9" }),
  ].join("\n");
  return doc({
    id: "board.pi.zero.2w",
    file: "boards/raspberry-pi-zero-2w.svg",
    caption: "Raspberry Pi Zero 2 W",
    title: "Raspberry Pi Zero 2 W top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "65 x 30 mm green board: 40-pin header along the top edge (pin 1 at the left, odd pins on the lower row, even pins on the upper row),",
      "mini-HDMI bottom-left, two micro-USB ports (USB data, PWR IN) at the bottom, microSD slot on the left, camera connector on the right,",
      "silver RP3A0 package. Pin labels are the usual BCM names (GP = GPIO).",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

// ============================================================ Raspberry Pi Pico 2 W

function pico2w() {
  const width = 270;
  const height = 510;
  const bx = 40;
  const by = 36;
  const bw = 189;
  const bh = 459;
  const m = mk();
  const lx = bx + 14.5;
  const rx = bx + bw - 14.5;
  const y0 = by + 12.3;
  const p = 22.86;
  const L = [
    ["GP0", "GP0"], ["GP1", "GP1"], ["GND", "GND.3"], ["GP2", "GP2"], ["GP3", "GP3"], ["GP4", "GP4"], ["GP5", "GP5"], ["GND", "GND.8"], ["GP6", "GP6"], ["GP7", "GP7"],
    ["GP8", "GP8"], ["GP9", "GP9"], ["GND", "GND.13"], ["GP10", "GP10"], ["GP11", "GP11"], ["GP12", "GP12"], ["GP13", "GP13"], ["GND", "GND.18"], ["GP14", "GP14"], ["GP15", "GP15"],
  ];
  const R = [
    ["VBUS", "VBUS"], ["VSYS", "VSYS"], ["GND", "GND.38"], ["3V3_EN"], ["3V3", "3V3"], ["ADC_VREF"], ["GP28", "GP28"], ["GND", "GND.33"], ["GP27", "GP27"], ["GP26", "GP26"],
    ["RUN"], ["GP22", "GP22"], ["GND", "GND.28"], ["GP21", "GP21"], ["GP20", "GP20"], ["GP19", "GP19"], ["GP18", "GP18"], ["GND", "GND.23"], ["GP17", "GP17"], ["GP16", "GP16"],
  ];
  L.forEach(([l, id], i) => m.pin(lx, y0 + i * p, l, id, { r: 4.6, pad: 7.4, lbl: "right", gap: 11, fs: 7, muted: !id }));
  R.forEach(([l, id], i) => m.pin(rx, y0 + i * p, l, id, { r: 4.6, pad: 7.4, lbl: "left", gap: 11, fs: 7, muted: !id }));
  const cx = bx + bw / 2;
  // castellated edge half-moons between the pads
  const moons = [];
  for (let i = 0; i < 20; i++) {
    const y = y0 + i * p;
    moons.push(`  <rect x="${bx - 1}" y="${r1(y - 8)}" width="14" height="16" rx="3" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="0.8"/>`);
    moons.push(`  <rect x="${bx + bw - 13}" y="${r1(y - 8)}" width="14" height="16" rx="3" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="0.8"/>`);
  }
  // antenna meander at the bottom edge
  let ant = `M${cx - 42} ${by + bh - 18}`;
  for (let i = 0; i < 5; i++) {
    const x = cx - 42 + i * 18;
    ant += ` V${by + bh - 54} H${x + 9} V${by + bh - 18} H${x + 18}`;
  }
  const deco = [
    rect(bx, by, bw, bh, "#2e7d32", { rx: 7, stroke: "#1b5e20", sw: 2 }),
    ...moons,
    microUsb(cx, by, "up", { w: 66, out: 14, inn: 34 }),
    tact(bx + 50, by + 74, 24, 18),
    T(bx + 50, by + 96, "BOOTSEL", { fs: 6 }),
    ledS(bx + bw - 54, by + 66, "#66bb6a", 8, 5),
    T(cx, by + 138, "Raspberry Pi", { fs: 8, fill: "#c8e6c9" }),
    T(cx, by + 152, "Pico 2 W", { fs: 11, bold: true }),
    // RP2350 and support parts
    qfp(cx, by + 226, 62, "RP2350", { n: 12, fs: 8, sub: "Pico 2" }),
    soic(cx + 34, by + 296, 26, 18, "FLASH", { n: 4, fs: 5 }),
    crystal(cx - 30, by + 296, 28, 18, "12MHz"),
    smdc(cx - 6, by + 312, 8, 5),
    smdc(cx + 6, by + 312, 8, 5),
    smdc(cx - 46, by + 330, 8, 5),
    // Infineon CYW43439 shielded wireless module
    rect(cx - 42, by + 340, 84, 56, "#cfd8dc", { rx: 2, stroke: "#78909c", sw: 1.2 }),
    rect(cx - 37, by + 345, 74, 46, "#e3e8ea", { rx: 1.5 }),
    T(cx, by + 364, "Infineon", { fs: 7, fill: "#263238", bold: true }),
    T(cx, by + 376, "CYW43439", { fs: 5.5, fill: "#455a64" }),
    `  <path d="${ant}" fill="none" stroke="#c8e6c9" stroke-width="2.4" stroke-linejoin="round" opacity="0.9"/>`,
    // SWD debug pads
    ...[0, 1, 2].map((i) => `  <circle cx="${cx - 23 + i * 23}" cy="${by + bh - 8}" r="3.4" fill="${GOLD}"/>`),
  ].join("\n");
  return doc({
    id: "board.pico.2w",
    file: "boards/pico-2-w.svg",
    caption: "Raspberry Pi Pico 2 W",
    title: "Raspberry Pi Pico 2 W top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "51 x 21 mm green board, micro-USB and BOOTSEL at the top, RP2350 in the middle, Infineon CYW43439 shielded wireless module",
      "and the PCB antenna at the bottom, three SWD pads at the bottom edge. 20 castellated pins per side, pin 1 (GP0) top left.",
      "Grey labels are pins the catalog does not wire (3V3_EN, ADC_VREF, RUN).",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

// ============================================================ Teensy 4.0

function teensy40() {
  const width = 240;
  const height = 400;
  const bx = 40;
  const by = 36;
  const bw = 160;
  const bh = 320;
  const m = mk();
  const lx = bx + 11.4;
  const rx = bx + bw - 11.4;
  const y0 = by + 11.5;
  const p = 22.86;
  const L = [["GND", "GND.1"]].concat(Array.from({ length: 13 }, (_, i) => [`${i}`, `D${i}`]));
  const R = [["VIN", "VIN"], ["GND", "GND.2"], ["3V3", "3V3.1"]].concat(Array.from({ length: 11 }, (_, i) => [`${23 - i}`, `D${23 - i}`]));
  L.forEach(([l, id], i) => m.pin(lx, y0 + i * p, l, id, { r: 4.5, pad: 7.4, lbl: "right", gap: 10, fs: 7 }));
  R.forEach(([l, id], i) => m.pin(rx, y0 + i * p, l, id, { r: 4.5, pad: 7.4, lbl: "left", gap: 10, fs: 7 }));
  const cx = bx + bw / 2;
  const deco = [
    rect(bx, by, bw, bh, "#14161a", { rx: 5, stroke: "#000", sw: 2 }),
    microUsb(cx, by, "up", { w: 56, out: 12, inn: 28 }),
    // program button and the VUSB pad
    rect(bx + 30, by + 44, 22, 18, "#eceff1", { rx: 2, stroke: "#90a4ae" }),
    `  <circle cx="${bx + 41}" cy="${by + 53}" r="5.5" fill="#37474f"/>`,
    rect(bx + 112, by + 46, 14, 14, GOLD, { rx: 2, stroke: GOLD_D }),
    T(bx + 119, by + 72, "VUSB", { fs: 5.5, fill: "#ef9a9a" }),
    // NXP i.MX RT1062 and neighbours
    qfp(cx, by + 146, 82, "NXP", { n: 11, fs: 9, sub: "iMXRT1062" }),
    soic(cx, by + 218, 36, 20, "W25Q", { n: 4, fs: 5 }),
    `  <rect class="chip" x="${cx + 28}" y="${by + 262}" width="14" height="14" rx="1.5"/>`,
    T(cx + 35, by + 288, "MKL02", { fs: 4.5 }),
    crystal(cx - 36, by + 268, 24, 12, "24M"),
    crystal(cx - 4, by + 268, 16, 10, "32k"),
    smdc(cx + 46, by + 232, 7, 4),
    smdc(cx + 46, by + 240, 7, 4),
    smdc(cx - 56, by + 232, 7, 4),
    ledS(cx + 30, by + 242, "#ffb74d", 7, 4),
    T(cx, by + 296, "Teensy 4.0", { fs: 8, fill: "#cfd8dc", bold: true }),
    // extra 3V3 pad on the underside edge
    rect(cx - 8, by + bh - 18, 16, 12, GOLD, { rx: 2, stroke: GOLD_D }),
  ].join("\n");
  const terminals = { ...m.terminals, VUSB: { x: bx + 119, y: by + 53 }, "3V3.2": { x: cx, y: by + bh - 12 } };
  return doc({
    id: "board.teensy.40",
    file: "boards/teensy-4-0.svg",
    caption: "Teensy 4.0",
    title: "Teensy 4.0 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "36 x 18 mm black board: micro-USB and program button at the top, NXP i.MX RT1062 with 24 MHz crystal, 14 breadboard pins per side.",
      "Left edge top to bottom: GND, 0-12. Right edge: VIN, GND, 3V3, 23 down to 13.",
      "VUSB (square pad next to the USB) and the second 3V3 (pad on the bottom edge) are drawn as edge pads; check the PJRC card for their exact spot.",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals,
  });
}

// ============================================================ STM32 Blue Pill

function bluePill() {
  const width = 290;
  const height = 536;
  const bx = 30;
  const by = 40;
  const bw = 206;
  const bh = 477;
  const m = mk();
  const lx = bx + 11.4;
  const rx = bx + bw - 11.4;
  const y0 = by + 21.5;
  const p = 22.86;
  const L = [
    ["PB12", "PB12"], ["PB13", "PB13"], ["PB14", "PB14"], ["PB15", "PB15"], ["PA8", "PA8"], ["PA9", "PA9"], ["PA10", "PA10"], ["PA11"], ["PA12"], ["PA15"],
    ["PB3"], ["PB4"], ["PB5", "PB5"], ["PB6", "PB6"], ["PB7", "PB7"], ["PB8", "PB8"], ["PB9", "PB9"], ["5V", "5V"], ["GND", "GND.1"], ["3.3", "3V3.1"],
  ];
  const R = [
    ["VBat"], ["PC13", "PC13"], ["PC14"], ["PC15"], ["PA0", "PA0"], ["PA1", "PA1"], ["PA2", "PA2"], ["PA3", "PA3"], ["PA4", "PA4"], ["PA5", "PA5"],
    ["PA6", "PA6"], ["PA7", "PA7"], ["PB0", "PB0"], ["PB1", "PB1"], ["PB10", "PB10"], ["PB11", "PB11"], ["RST"], ["3.3", "3V3.2"], ["GND", "GND.2"], ["GND", "GND.3"],
  ];
  L.forEach(([l, id], i) => m.pin(lx, y0 + i * p, l, id, { r: 4.6, pad: 7.4, lbl: "right", gap: 11, fs: 7, muted: !id }));
  R.forEach(([l, id], i) => m.pin(rx, y0 + i * p, l, id, { r: 4.6, pad: 7.4, lbl: "left", gap: 11, fs: 7, muted: !id }));
  const cx = bx + bw / 2;
  const jumper = (x, label) => [
    dotRow(x, by + 82, 3, 14, "y", { r: 3.4 }),
    rect(x - 7, by + 82 - 7, 14, 30, "#fbc02d", { rx: 2, stroke: "#b28704" }),
    T(x, by + 128, label, { fs: 5.5 }),
  ].join("\n");
  const deco = [
    rect(bx, by, bw, bh, "#1550a8", { rx: 7, stroke: "#0b2f6b", sw: 2 }),
    microUsb(cx, by, "up", { w: 66, out: 14, inn: 32 }),
    tact(cx - 40, by + 74, 18, 16),
    T(cx - 40, by + 94, "RESET", { fs: 5.5 }),
    jumper(cx + 8, "BOOT0"),
    jumper(cx + 38, "BOOT1"),
    // regulator
    `  <rect class="chip" x="${cx - 10}" y="${by + 168}" width="22" height="14" rx="1.5"/>`,
    rect(cx + 12, by + 171, 6, 8, "#1a1a1a"),
    smdc(cx - 28, by + 172, 8, 5),
    smdc(cx - 28, by + 180, 8, 5),
    // STM32F103C8T6
    qfp(cx, by + 252, 66, "STM32", { n: 12, fs: 8, sub: "F103C8T6" }),
    ledS(bx + 150, by + 172, "#66bb6a", 8, 5),
    T(bx + 150, by + 184, "PWR", { fs: 5 }),
    // crystals: 8 MHz can, 32.768 kHz cylinder
    crystal(cx - 4, by + 336, 64, 24, "8.000"),
    `  <rect x="${cx + 36}" y="${by + 318}" width="8" height="30" rx="4" fill="#cfd8dc" stroke="#78909c"/>`,
    T(cx + 40, by + 360, "32K", { fs: 4.5 }),
    smdc(cx - 40, by + 358, 8, 5),
    smdc(cx - 28, by + 358, 8, 5),
    ledS(bx + 158, by + 392, "#66bb6a", 9, 6),
    T(bx + 158, by + 404, "PC13", { fs: 5 }),
    // SWD header (3V3 DIO CLK GND)
    dotRow(cx - 34, by + bh - 20, 4, 22.9, "x", { r: 4.4 }),
    ...["3V3", "DIO", "CLK", "GND"].map((l, i) => T(cx - 34 + i * 22.9, by + bh - 36, l, { fs: 5.5 })),
    T(cx - 4, by + 420, "STM32F103C8T6", { fs: 6, fill: "#bbdefb" }),
  ].join("\n");
  return doc({
    id: "board.stm32.bluepill",
    file: "boards/stm32-blue-pill.svg",
    caption: "STM32 Blue Pill (STM32F103C8T6)",
    title: "STM32 Blue Pill top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "53 x 23 mm blue board: micro-USB and reset at the top, BOOT0/BOOT1 jumpers, STM32F103C8 with 8 MHz and 32.768 kHz crystals,",
      "PC13 LED, 4-pin SWD header (3V3 DIO CLK GND) at the bottom edge.",
      "Left edge top to bottom: PB12..PB15, PA8-PA12, PA15, PB3-PB9, 5V, GND, 3.3. Right edge: VBat, PC13-PC15, PA0-PA7, PB0, PB1, PB10, PB11, RST, 3.3, GND, GND.",
      "Grey labels are header pins the catalog does not wire.",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

// ============================================================ Digispark ATtiny85

function digispark() {
  const width = 260;
  const height = 410;
  const bx = 28;
  const by = 30;
  const bw = 204;
  const bh = 275;
  const m = mk();
  const cx = bx + bw / 2;
  const lx = bx + 16;
  const rx = bx + bw - 16;
  const y0 = by + 36;
  const p = 30;
  const Lp = [["P5", "P5"], ["P4", "P4"], ["P3", "P3"]];
  const Rp = [["P0", "P0"], ["P1", "P1"], ["P2", "P2"]];
  Lp.forEach(([l, id], i) => m.pin(lx, y0 + i * p, l, id, { r: 5, pad: 8.4, lbl: "right", gap: 12, fs: 8 }));
  Rp.forEach(([l, id], i) => m.pin(rx, y0 + i * p, l, id, { r: 5, pad: 8.4, lbl: "left", gap: 12, fs: 8 }));
  const py = by + bh - 24;
  [["VIN", "VIN"], ["GND", "GND"], ["5V", "5V"]].forEach(([l, id], i) =>
    m.pin(cx - 30 + i * 30, py, l, id, { r: 5, pad: 8.4, lbl: "up", gap: 13, fs: 7.5 }),
  );
  const tabW = 132;
  const tab = [
    rect(cx - tabW / 2, by + bh - 4, tabW, 110, "#1565c0", { rx: 3, stroke: "#0d3c7a", sw: 2 }),
    ...[0, 1, 2, 3].map((i) => rect(cx - 48 + i * 25, by + bh + 8, 16, 88, GOLD, { rx: 2, stroke: GOLD_D, sw: 0.8 })),
    T(cx, by + bh + 108, "USB-A tab", { fs: 5, fill: "#90caf9" }),
  ].join("\n");
  const deco = [
    tab,
    rect(bx, by, bw, bh, "#1565c0", { rx: 8, stroke: "#0d3c7a", sw: 2 }),
    // ATtiny85 and neighbours
    soic(cx, by + 120, 64, 46, "t85", { n: 4, fs: 11 }),
    T(cx, by + 148, "ATTINY85", { fs: 6, fill: "#b0bec5" }),
    T(cx, by + 86, "DIGISPARK", { fs: 10, bold: true }),
    ledS(rx - 26, by + 78, "#ef5350", 10, 6),
    T(rx - 26, by + 94, "P1", { fs: 5.5 }),
    ledS(lx + 30, by + 188, "#66bb6a", 10, 6),
    T(lx + 30, by + 204, "PWR", { fs: 5.5 }),
    `  <rect class="chip" x="${rx - 48}" y="${by + 176}" width="22" height="14" rx="1.5"/>`,
    T(rx - 37, by + 202, "78L05", { fs: 5 }),
    // USB zeners and pull-up resistors near the tab
    `  <rect x="${cx - 40}" y="${by + 200}" width="24" height="8" rx="3" fill="#e0b050" stroke="#8d6e1b"/>`,
    `  <rect x="${cx + 16}" y="${by + 200}" width="24" height="8" rx="3" fill="#e0b050" stroke="#8d6e1b"/>`,
    smdc(cx - 8, by + 188, 8, 5),
    smdc(cx + 2, by + 188, 8, 5),
  ].join("\n");
  return doc({
    id: "board.digispark.attiny85",
    file: "boards/digispark-attiny85.svg",
    caption: "Digispark ATtiny85 USB",
    title: "Digispark ATtiny85 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Small blue board with a PCB tab that plugs straight into a USB-A port (the four gold fingers at the bottom).",
      "Drawn with P5, P4, P3 down the left edge, P0, P1, P2 down the right edge and VIN, GND, 5V across the bottom, next to the USB tab.",
      "Hole positions vary slightly between Digispark clones; most-common arrangement drawn here, please verify against a board in hand.",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

// ============================================================ micro:bit v2

function microbitV2() {
  const width = 360;
  const height = 342;
  const bx = 14;
  const by = 34;
  const bw = 332;
  const bh = 268;
  const bottom = by + bh;
  const cx = bx + bw / 2;
  const m = mk();
  const slot = 11.5;
  const sx0 = cx - 12 * slot;
  const sx = (i) => sx0 + i * slot;
  const ringCy = bottom - 12;
  const rings = [
    [0, "0", "P0"],
    [6, "1", "P1"],
    [12, "2", "P2"],
    [18, "3V", "3V"],
    [24, "GND", "GND.1"],
  ];
  const smallNames = [
    ["P3", "P3"], ["P4", "P4"], ["P5", "P5"], ["P6", "P6"], ["P7", "P7"],
    ["P8", "P8"], ["P9", "P9"], ["P10", "P10"], ["P11", "P11"], ["P12", "P12"],
    ["P13", "P13"], ["P14", "P14"], ["P15", "P15"], ["P16", "P16"], ["3V"],
    ["P19", "P19"], ["P20", "P20"], ["GND", "GND.2"], ["3V"], ["GND"],
  ];
  const edge = [];
  let k = 0;
  for (let i = 0; i < 25; i++) {
    if (rings.some((r) => r[0] === i)) continue;
    const [label, id] = smallNames[k++];
    const x = sx(i);
    edge.push(rect(x - 2.6, bottom - 26, 5.2, 26, GOLD, { stroke: GOLD_D, sw: 0.6 }));
    if (id) m.terminals[id] = { x: r1(x), y: r1(bottom - 13) };
    edge.push(`  <text x="${r1(x)}" y="${bottom - 30}" transform="rotate(-90 ${r1(x)} ${bottom - 30})" dy="2" ${mono} font-size="6" fill="${id ? "#eceff1" : "#90a4ae"}">${esc(label)}</text>`);
  }
  for (const [i, label, id] of rings) {
    const x = sx(i);
    edge.push(`  <circle cx="${r1(x)}" cy="${ringCy}" r="9.5" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="0.8"/>`);
    edge.push(`  <circle class="${holeCls(label)}" cx="${r1(x)}" cy="${ringCy}" r="4.2"/>`);
    m.terminals[id] = { x: r1(x), y: ringCy };
    edge.push(T(x, bottom - 30 - (label.length > 1 ? 0 : 0) + 0, "", { fs: 1 }));
    edge.push(T(x, ringCy - 15, label, { fs: 8, bold: true }));
  }
  // 5x5 LED matrix
  const mx = cx - 32;
  const my = by + 112;
  const leds = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      leds.push(rect(mx + c * 16 - 3.5, my + r * 16 - 5, 7, 10, "#7a1c1c", { rx: 1.4, stroke: "#b71c1c", sw: 0.5 }));
    }
  }
  const deco = [
    rect(bx, by, bw, bh, "#15171b", { rx: 7, stroke: "#000", sw: 2 }),
    microUsb(cx, by, "up", { w: 52, out: 12, inn: 26 }),
    // touch logo (gold) and microphone LED
    `  <path d="M${cx - 12} ${by + 56} a12 12 0 1 1 24 0 v12 a12 12 0 1 1 -24 0 z" fill="none" stroke="${GOLD}" stroke-width="3"/>`,
    `  <circle cx="${cx - 4}" cy="${by + 54}" r="2.2" fill="${GOLD}"/><circle cx="${cx + 4}" cy="${by + 54}" r="2.2" fill="${GOLD}"/>`,
    ledS(cx + 30, by + 52, "#ffb74d", 7, 4),
    // matrix
    rect(mx - 14, my - 15, 92, 92, "#0b0c0e", { rx: 4 }),
    ...leds,
    // buttons A / B
    tact(bx + 50, my + 32, 28, 28),
    tact(bx + bw - 50, my + 32, 28, 28),
    T(bx + 50, my + 62, "A", { fs: 12, bold: true }),
    T(bx + bw - 50, my + 62, "B", { fs: 12, bold: true }),
    T(cx, my + 98, "micro:bit", { fs: 11, bold: true }),
    ...edge,
  ].join("\n");
  return doc({
    id: "board.microbit.v2",
    file: "boards/microbit-v2.svg",
    caption: "BBC micro:bit v2",
    title: "BBC micro:bit v2 front view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified front view for HelpmeSolder wiring diagrams.",
      "52 x 42 mm board: micro-USB on top, 5x5 LED matrix with the gold touch logo, buttons A and B, edge connector along the bottom.",
      "The five large rings are 0, 1, 2, 3V and GND; between them sit the 20 small edge pads. Their order here is a simplified grouping",
      "(P3-P7, P8-P12, P13-P16, P19/P20 and extra 3V/GND), so check the micro:bit pinout page before wiring small pads.",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

// ============================================================ Seeed XIAO RP2040

function xiaoRp2040() {
  const left = ["D0", "D1", "D2", "D3", "D4", "D5", "D6"].map((l) => ({ label: l, id: l }));
  const right = [
    { label: "5V", id: "5V" },
    { label: "GND", id: "GND" },
    { label: "3V3", id: "3V3" },
    ...["D10", "D9", "D8", "D7"].map((l) => ({ label: l, id: l })),
  ];
  const decorations = [
    // USB-C shell standing over the top edge
    `  <rect x="92" y="26" width="56" height="50" rx="8" fill="#d5d9dc" stroke="#7d868c" stroke-width="1.5"/>`,
    `  <rect x="100" y="34" width="40" height="16" rx="8" fill="#9aa3a8"/>`,
    `  <rect x="108" y="40" width="24" height="4" rx="2" fill="#5f686d"/>`,
    // user RGB LED, charge LED, 12 MHz crystal
    rect(150, 84, 10, 10, "#fafafa", { rx: 1.5, stroke: "#9e9e9e", sw: 0.8 }),
    `  <circle cx="152.5" cy="86.5" r="1.4" fill="#ef5350"/><circle cx="157.5" cy="86.5" r="1.4" fill="#66bb6a"/><circle cx="155" cy="91" r="1.4" fill="#42a5f5"/>`,
    ledS(166, 54, "#ffb74d", 6, 4),
    crystal(100, 92, 20, 10, "12M"),
    // RP2040 and its flash, no shield
    qfp(120, 142, 58, "RP2040", { n: 9, fs: 8 }),
    soic(120, 186, 26, 16, "FLASH", { n: 4, fs: 4.5 }),
    smdc(80, 126, 6, 4),
    smdc(80, 134, 6, 4),
    smdc(160, 126, 6, 4),
    smdc(160, 134, 6, 4),
    // BOOT and RESET buttons
    tact(80, 214, 20, 14),
    tact(160, 214, 20, 14),
    T(80, 230, "B", { fs: 7 }),
    T(160, 230, "R", { fs: 7 }),
    T(120, 214, "XIAO", { fs: 7, bold: true }),
    T(120, 223, "RP2040", { fs: 5.5, fill: "#b0bec5" }),
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
  return doc({
    id: "board.xiao.rp2040",
    file: "boards/xiao-rp2040.svg",
    caption: "Seeed Studio XIAO RP2040",
    title: "Seeed Studio XIAO RP2040 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "USB-C at the top, bare RP2040 with its flash chip and 12 MHz crystal, RGB LED, RESET and BOOT buttons at the bottom edge.",
      "Pad order from Seeed's published XIAO pinout: D0-D6 down the left side, 5V, GND, 3V3 and D10-D7 down the right side.",
    ],
    ...art,
  });
}

const drawings = [
  leonardo,
  proMini,
  arduinoMicro,
  nanoEvery,
  d1Mini,
  piZero2w,
  pico2w,
  teensy40,
  bluePill,
  digispark,
  microbitV2,
  xiaoRp2040,
];

export default drawings;
