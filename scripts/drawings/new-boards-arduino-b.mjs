// New boards, group arduino-b: Arduino Nano ESP32, Nano 33 IoT and MKR WiFi 1010.
import { holeMount, esc, r1 } from "./_lib.mjs";

const GOLD = "#d9b44a";
const GOLD_D = "#a07d1c";
const TEAL = "#00838f";
const TEAL_D = "#005b64";
const mono = `font-family="ui-monospace, monospace"`;

const kindOf = (l) =>
  /^(GND)$/i.test(l) ? "gnd" : /^(5V|VBUS|VIN|VUSB)$/i.test(l) ? "pwr" : /^(3V3|VCC)$/i.test(l) ? "v3" : "";
const holeCls = (l) => `hole${kindOf(l) ? " " + kindOf(l) : ""}`;

const T = (x, y, s, { fs = 7, fill = "#eceff1", anchor = "middle", rot = 0, bold = false } = {}) =>
  `  <text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" ${mono} font-size="${fs}" fill="${fill}"${bold ? ` font-weight="bold"` : ""}${rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : ""}>${esc(s)}</text>`;

/** Pin collector: a hole on a gold pad plus its printed label; records catalog terminals. */
function mk() {
  const out = [];
  const terminals = {};
  const pin = (x, y, label, id, o = {}) => {
    const { r = 4.2, pad = 7.2, lbl = "down", gap = 12, fs = 6.5, muted = false, shift = 0 } = o;
    if (pad) out.push(`  <circle cx="${r1(x)}" cy="${r1(y)}" r="${pad}" fill="${GOLD}" stroke="${GOLD_D}" stroke-width="0.8"/>`);
    out.push(`  <circle class="${holeCls(label)}" cx="${r1(x)}" cy="${r1(y)}" r="${r}"/>`);
    const f = muted ? "#90a4ae" : "#eceff1";
    if (lbl === "right") out.push(T(x + gap, y + fs * 0.35, label, { fs, anchor: "start", fill: f }));
    else if (lbl === "left") out.push(T(x - gap, y + fs * 0.35, label, { fs, anchor: "end", fill: f }));
    else if (lbl === "down") out.push(`  <text x="${r1(x)}" y="${r1(y + gap)}" transform="rotate(90 ${r1(x)} ${r1(y + gap)})" dy="${r1(fs * 0.35)}" ${mono} font-size="${fs}" fill="${f}">${esc(label)}</text>`);
    else if (lbl === "up") out.push(`  <text x="${r1(x)}" y="${r1(y - gap)}" transform="rotate(-90 ${r1(x)} ${r1(y - gap)})" dy="${r1(fs * 0.35)}" ${mono} font-size="${fs}" fill="${f}" text-anchor="end">${esc(label)}</text>`);
    for (const i of [].concat(id ?? [])) terminals[i] = { x: r1(x), y: r1(y) };
  };
  return { out, terminals, pin };
}

const rect = (x, y, w, h, fill, { rx = 0, stroke, sw = 1 } = {}) =>
  `  <rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${rx ? ` rx="${rx}"` : ""} fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""} />`;

const tact = (cx, cy, w = 14, h = 12) =>
  [
    `  <rect class="btn" x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="2"/>`,
    `  <circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(Math.min(w, h) * 0.3)}" fill="#37474f"/>`,
  ].join("\n");

const smdc = (x, y, w = 7, h = 4) => `  <rect class="smd" x="${r1(x)}" y="${r1(y)}" width="${w}" height="${h}" rx="0.6"/>`;

const ledS = (cx, cy, fill, w = 7, h = 4) =>
  `  <rect x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="1" fill="${fill}" stroke="#00000066" stroke-width="0.6"/>`;

/** Square QFP package with leads on all sides. */
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

/** SOIC-style IC (pin stubs on the two long sides). */
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

/** Micro-USB shell, mouth facing `dir`, centred on the board edge point. */
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

/** USB-C receptacle on the left edge, mouth pointing left, centred on (cx, cy). */
function usbCLeft(cx, cy, { len = 34, wid = 42 } = {}) {
  return [
    `  <rect x="${r1(cx - 8)}" y="${r1(cy - wid / 2)}" width="${len}" height="${wid}" rx="${r1(wid / 2.6)}" fill="#cfd8dc" stroke="#607d8b" stroke-width="1.2"/>`,
    `  <rect x="${r1(cx - 4)}" y="${r1(cy - wid / 2 + 7)}" width="${len - 12}" height="${wid - 14}" rx="${r1((wid - 14) / 2.4)}" fill="#37474f"/>`,
    `  <rect x="${r1(cx - 2)}" y="${r1(cy - 2)}" width="${len - 16}" height="4" rx="1" fill="#90a4ae"/>`,
    `  <rect x="${r1(cx + len - 16)}" y="${r1(cy - wid / 2 + 4)}" width="6" height="${wid - 8}" rx="1" fill="#b0bec5"/>`,
  ].join("\n");
}

/** Shielded radio module (metal can on the left, PCB antenna with meander on the right end). */
function radioModule(x, y, w, h, antW, label, sub) {
  const can = w - antW;
  const out = [];
  out.push(rect(x, y, w, h, "#10272b", { rx: 2, stroke: GOLD, sw: 0.9 }));
  // meander antenna
  const steps = 5;
  const ax = x + can + 5;
  const aw = antW - 10;
  const ys = Array.from({ length: steps }, (_, i) => y + 6 + (i * (h - 12)) / (steps - 1));
  let d = `M${r1(ax)} ${r1(ys[0])}`;
  ys.forEach((yy, i) => {
    const toX = i % 2 === 0 ? ax + aw : ax;
    d += ` H${r1(toX)}`;
    if (i < steps - 1) d += ` V${r1(ys[i + 1])}`;
  });
  const m = [d];
  out.push(`  <path d="${m.join(" ")}" fill="none" stroke="${GOLD}" stroke-width="1.8" stroke-linejoin="round"/>`);
  out.push(rect(x + 2, y + 2, can - 2, h - 4, "#cfd8dc", { rx: 1.5, stroke: "#78909c", sw: 1 }));
  out.push(rect(x + 5, y + 5, can - 8, h - 10, "#e3e8ea", { rx: 1 }));
  out.push(T(x + 2 + (can - 2) / 2, y + h / 2 - 1, label, { fs: 6, fill: "#263238", bold: true }));
  if (sub) out.push(T(x + 2 + (can - 2) / 2, y + h / 2 + 8, sub, { fs: 4.5, fill: "#455a64" }));
  return out.join("\n");
}

const doc = (d) => ({ kind: "board", ...d });

// ============================================================ Nano form factor (horizontal, USB on the left)

function nanoBoard(cfg) {
  const { top, bot, deco } = cfg;
  const width = 360;
  const height = 160;
  const bx = 28;
  const by = 20;
  const bw = 313;
  const h = 120;
  const pitch = 17.4;
  const x0 = bx + 36;
  const m = mk();
  const body = [rect(bx, by, bw, h, TEAL, { rx: 5, stroke: TEAL_D, sw: 2 })];
  const topY = by + 9.5;
  const botY = by + h - 9.5;
  const lblTop = (label, id, i) => m.pin(x0 + i * pitch, topY, label, id, { lbl: "down", muted: !id });
  const lblBot = (label, id, i) => m.pin(x0 + i * pitch, botY, label, id, { lbl: "up", muted: !id });
  top.forEach(([label, id], i) => lblTop(label, id, i));
  bot.forEach(([label, id], i) => lblBot(label, id, i));
  return {
    width,
    height,
    body: body.join("\n") + "\n" + deco({ bx, by, mid: by + h / 2 }) + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  };
}

function nanoEsp32() {
  const top = [["VIN", "VIN"], ["GND", "GND.2"], ["B1"], ["VBUS", "VBUS"], ["A7", "A7"], ["A6", "A6"], ["A5", "A5"], ["A4", "A4"], ["A3", "A3"], ["A2", "A2"], ["A1", "A1"], ["A0", "A0"], ["B0"], ["3V3", "3V3"], ["D13", "D13"]];
  const bot = [["D1", "D1"], ["D0", "D0"], ["RST"], ["GND", "GND.1"], ["D2", "D2"], ["D3", "D3"], ["D4", "D4"], ["D5", "D5"], ["D6", "D6"], ["D7", "D7"], ["D8", "D8"], ["D9", "D9"], ["D10", "D10"], ["D11", "D11"], ["D12", "D12"]];
  const deco = ({ bx, mid }) =>
    [
      usbCLeft(bx + 3, mid),
      tact(bx + 52, mid, 12, 14),
      // LEDs: DL3 power (green), DL2 yellow on D13, DL1 RGB
      ledS(bx + 72, mid - 12, "#66bb6a"),
      ledS(bx + 72, mid, "#ffb74d"),
      T(bx + 79, mid - 10.5, "ON", { fs: 4, anchor: "start" }),
      T(bx + 79, mid + 1.5, "L", { fs: 4, anchor: "start" }),
      rect(bx + 68, mid + 7, 9, 9, "#eceff1", { rx: 1, stroke: "#546e7a", sw: 0.6 }),
      `  <circle cx="${bx + 71}" cy="${mid + 10}" r="1.5" fill="#ef5350"/>`,
      `  <circle cx="${bx + 75}" cy="${mid + 10}" r="1.5" fill="#66bb6a"/>`,
      `  <circle cx="${bx + 73}" cy="${mid + 13.5}" r="1.5" fill="#42a5f5"/>`,
      // MP2322 buck converter, its inductor and passives
      rect(bx + 94, mid - 6, 13, 12, "#1a1a1a", { rx: 1.5 }),
      rect(bx + 110, mid - 8, 17, 16, "#3a3a3a", { rx: 2, stroke: "#222", sw: 0.8 }),
      smdc(bx + 94, mid - 14, 7, 4),
      smdc(bx + 94, mid + 10, 7, 4),
      // flash and the text block
      soic(bx + 168, mid, 20, 12, "FLASH", { n: 4, fs: 4 }),
      T(bx + 142, mid - 1, "NANO", { fs: 7, bold: true, anchor: "middle" }),
      T(bx + 142, mid + 8, "ESP32", { fs: 7, bold: true, anchor: "middle" }),
      // NORA-W106 module with PCB antenna at the far end
      radioModule(bx + 196, mid - 27, 108, 54, 36, "NORA-W106", "ESP32-S3"),
      smdc(bx + 186, mid - 18, 6, 4),
      smdc(bx + 186, mid + 14, 6, 4),
    ].join("\n");
  const art = nanoBoard({ top, bot, deco });
  return doc({
    id: "board.arduino.nano.esp32",
    file: "boards/arduino-nano-esp32.svg",
    caption: "Arduino Nano ESP32",
    title: "Arduino Nano ESP32 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "45 x 18 mm Nano footprint, teal board, USB-C on the left, reset button and LEDs (ON, L on D13, RGB) near it,",
      "MP2322 buck converter and 16 MB flash, and the u-blox NORA-W106 (ESP32-S3) module with its PCB antenna at the far end.",
      "Drawn rotated 90 degrees from the usual upright view. Top row left to right: VIN, GND, B1, VBUS, A7..A0, B0, 3V3, D13.",
      "Bottom row: D1 (TX), D0 (RX), RST, GND, D2-D12. B0/B1/RST are drawn grey because the catalog does not wire them.",
      "PCB colour and exact part positions are from memory of the product photos; verify against a real board.",
    ],
    ...art,
  });
}

function nano33Iot() {
  const top = [["VIN", "VIN"], ["GND", "GND.2"], ["RST"], ["VUSB", "VUSB"], ["A7", "A7"], ["A6", "A6"], ["A5", "A5"], ["A4", "A4"], ["A3", "A3"], ["A2", "A2"], ["A1", "A1"], ["A0", "A0"], ["REF"], ["3V3", "3V3"], ["D13", "D13"]];
  const bot = [["D1", "D1"], ["D0", "D0"], ["RST"], ["GND", "GND.1"], ["D2", "D2"], ["D3", "D3"], ["D4", "D4"], ["D5", "D5"], ["D6", "D6"], ["D7", "D7"], ["D8", "D8"], ["D9", "D9"], ["D10", "D10"], ["D11", "D11"], ["D12", "D12"]];
  const deco = ({ bx, mid }) =>
    [
      microUsb(bx, mid, "left", { w: 40, out: 9, inn: 26 }),
      tact(bx + 46, mid - 18, 14, 12),
      ledS(bx + 50, mid + 4, "#66bb6a"),
      ledS(bx + 50, mid + 14, "#ffb74d"),
      T(bx + 57, mid + 5.5, "ON", { fs: 4, anchor: "start" }),
      T(bx + 57, mid + 15.5, "L", { fs: 4, anchor: "start" }),
      // MPM3610 power module, IMU, crypto chip
      rect(bx + 76, mid - 9, 16, 14, "#1a1a1a", { rx: 1.5 }),
      T(bx + 84, mid + 0.5, "MPM", { fs: 3.5 }),
      rect(bx + 98, mid - 6, 9, 9, "#1a1a1a", { rx: 1 }),
      soic(bx + 100, mid + 13, 12, 7, "", { n: 4 }),
      smdc(bx + 76, mid + 10, 7, 4),
      // SAMD21G18A and its 32 kHz crystal
      qfp(bx + 150, mid, 46, "SAMD21", { n: 12, fs: 5.5, sub: "G18A" }),
      `  <rect x="${bx + 118}" y="${mid - 22}" width="8" height="3.5" rx="1.5" fill="#cfd8dc" stroke="#78909c" stroke-width="0.6"/>`,
      smdc(bx + 118, mid + 17, 7, 4),
      smdc(bx + 128, mid + 17, 7, 4),
      // NINA-W102 Wi-Fi module with antenna end
      radioModule(bx + 196, mid - 27, 108, 54, 36, "NINA-W102", "u-blox"),
    ].join("\n");
  const art = nanoBoard({ top, bot, deco });
  return doc({
    id: "board.arduino.nano33.iot",
    file: "boards/arduino-nano-33-iot.svg",
    caption: "Arduino Nano 33 IoT",
    title: "Arduino Nano 33 IoT top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "45 x 18 mm Nano footprint, teal board, micro-USB on the left, reset button and ON / L LEDs, MPM3610 power module,",
      "SAMD21G18A in the middle and the NINA-W102 Wi-Fi/Bluetooth module with PCB antenna at the far end.",
      "Drawn rotated 90 degrees from the usual upright view. Top row left to right: VIN, GND, RST, VUSB (5V via jumper), A7..A0, REF, 3V3, D13.",
      "Bottom row: D1 (TX), D0 (RX), RST, GND, D2-D12. RST and REF are drawn grey because the catalog does not wire them.",
      "PCB colour and exact part positions are from memory of the product photos; verify against a real board.",
    ],
    ...art,
  });
}

// ============================================================ MKR WiFi 1010 (vertical, USB at the top)

function mkrWifi1010() {
  const width = 232;
  const height = 468;
  const bx = 28;
  const by = 24;
  const bw = 175;
  const bh = 430;
  const m = mk();
  const cx = bx + bw / 2;
  const lx = bx + 12;
  const rx = bx + bw - 12;
  const y0 = by + 80;
  const p = 17.78;
  const left = [["AREF"], ["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"], ["A6", "A6"], ["D0", "D0"], ["D1", "D1"], ["D2", "D2"], ["D3", "D3"], ["D4", "D4"], ["D5", "D5"]];
  const right = [["D6", "D6"], ["D7", "D7"], ["D8", "D8"], ["D9", "D9"], ["D10", "D10"], ["D11", "D11"], ["D12", "D12"], ["D13", "D13"], ["D14", "D14"], ["RST"], ["GND", "GND"], ["VCC", "3V3"], ["VIN", "VIN"], ["5V", "5V"]];
  left.forEach(([l, id], i) => m.pin(lx, y0 + i * p, l, id, { r: 4.3, pad: 7.4, lbl: "right", gap: 11, fs: 6.5, muted: !id }));
  right.forEach(([l, id], i) => m.pin(rx, y0 + i * p, l, id, { r: 4.3, pad: 7.4, lbl: "left", gap: 11, fs: 6.5, muted: !id }));
  const hdr = (x) => rect(x - 9.5, y0 - 10, 19, p * 13 + 20, "#1b1b1b", { rx: 2 });
  const deco = [
    rect(bx, by, bw, bh, TEAL, { rx: 8, stroke: TEAL_D, sw: 2 }),
    holeMount(bx + 12, by + 12, 5),
    holeMount(bx + bw - 12, by + 12, 5),
    holeMount(bx + 12, by + bh - 12, 5),
    holeMount(bx + bw - 12, by + bh - 12, 5),
    hdr(lx),
    hdr(rx),
    // micro-USB at the top, JST battery connector beside it
    microUsb(cx - 12, by, "up", { w: 42, out: 9, inn: 28 }),
    rect(bx + bw - 62, by + 3, 30, 20, "#f5f5f5", { rx: 2, stroke: "#9e9e9e", sw: 1 }),
    rect(bx + bw - 58, by + 8, 22, 10, "#cfd8dc", { rx: 1 }),
    `  <circle cx="${bx + bw - 52}" cy="${by + 13}" r="2" fill="#424242"/>`,
    `  <circle cx="${bx + bw - 42}" cy="${by + 13}" r="2" fill="#424242"/>`,
    T(bx + bw - 47, by + 35, "BATT", { fs: 5.5, fill: "#cfd8dc" }),
    // LEDs: ON, L (D6), charge
    ledS(cx - 52, by + 44, "#66bb6a"),
    T(cx - 44, by + 45.5, "ON", { fs: 4.5, anchor: "start" }),
    ledS(cx - 52, by + 56, "#ffb74d"),
    T(cx - 44, by + 57.5, "L", { fs: 4.5, anchor: "start" }),
    ledS(cx + 38, by + 44, "#ff7043"),
    T(cx + 46, by + 45.5, "CHG", { fs: 4.5, anchor: "start" }),
    // charger IC and passives
    rect(cx + 8, by + 100, 16, 14, "#1a1a1a", { rx: 1.5 }),
    T(cx + 16, by + 109, "BQ", { fs: 4.5 }),
    rect(cx - 22, by + 100, 14, 12, "#3a3a3a", { rx: 2, stroke: "#222", sw: 0.8 }),
    smdc(cx + 8, by + 120, 7, 4),
    smdc(cx + 18, by + 120, 7, 4),
    // SAMD21G18A and its crystal
    qfp(cx, by + 190, 46, "SAMD21", { n: 12, fs: 6, sub: "G18A" }),
    `  <rect x="${cx - 12}" y="${by + 232}" width="24" height="7" rx="3" fill="#cfd8dc" stroke="#78909c" stroke-width="0.8"/>`,
    smdc(cx - 24, by + 214, 7, 4),
    smdc(cx + 18, by + 214, 7, 4),
    // ECC crypto chip and the board name
    soic(cx - 20, by + 262, 16, 9, "", { n: 4 }),
    smdc(cx + 6, by + 258, 7, 4),
    T(cx + 14, by + 275, "MKR WiFi", { fs: 7, bold: true, anchor: "middle" }),
    T(cx + 14, by + 285, "1010", { fs: 9, bold: true, anchor: "middle" }),
    // NINA-W102: can on top, antenna toward the bottom end
    `  <g transform="rotate(90 ${cx} ${by + 372})">${radioModule(cx - 52, by + 372 - 33, 104, 66, 34, "NINA-W102", "u-blox")}</g>`,
  ].join("\n");
  return doc({
    id: "board.arduino.mkr.wifi1010",
    file: "boards/arduino-mkr-wifi-1010.svg",
    caption: "Arduino MKR WiFi 1010",
    title: "Arduino MKR WiFi 1010 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "61 x 25 mm teal board, micro-USB and the 2-pin JST battery connector at the top, ON / L (D6) / charge LEDs,",
      "BQ24195L charger, SAMD21G18A, ECC crypto chip and the NINA-W102 module with PCB antenna at the bottom end.",
      "Left header top to bottom: AREF, A0-A6, D0-D5. Right header: D6-D14, RESET, GND, VCC (3.3 V), VIN, 5V.",
      "The pin printed VCC is the 3.3 V rail and is wired as catalog pin 3V3. AREF and RESET are drawn grey (not wired in the catalog).",
      "PCB colour and exact part positions are from memory of the product photos; verify against a real board.",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

export default [nanoEsp32, nano33Iot, mkrWifi1010];
