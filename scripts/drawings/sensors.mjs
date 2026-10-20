// Sensor and input modules: touch, buttons, environment, light/colour, magnetic, IR,
// rain/water/soil/gas, mic, motion, distance, current sensors and the FSR.
import { holeClass, esc, r1 } from "./_lib.mjs";
import { screwTerminal } from "./_helpers.mjs";

const OFF = "#78909c"; // label colour for text that sits on the page, not on a board
const GOLD = "#d9b44a";
const BLUE = "#1f56b0";
const BLUE_S = "#143c80";

const g = (...a) => a.flat().filter(Boolean).join("\n");
const rect = (x, y, w, h, fill, { stroke, rx = 0, sw = 1, extra = "" } = {}) =>
  `  <rect x="${r1(x)}" y="${r1(y)}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""}${extra}/>`;
const circ = (x, y, r, fill, stroke, sw = 1) =>
  `  <circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""}/>`;
const txt = (x, y, s, { fs = 7, fill, anchor = "middle", rot = 0, bold = false } = {}) =>
  `  <text class="label" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" font-size="${fs}"${bold ? ` font-weight="bold"` : ""}${rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : ""}${fill ? ` style="fill:${fill}"` : ""}>${esc(s)}</text>`;
const pcb = (x, y, w, h, fill = BLUE, stroke = BLUE_S, rx = 5) => rect(x, y, w, h, fill, { stroke, rx, sw: 2 });
const mount = (x, y, r = 5) => `  <circle cx="${x}" cy="${y}" r="${r}" fill="#f5f5f5" stroke="${GOLD}" stroke-width="2.5"/>`;

/** Surface-mount bits. */
const res = (x, y, vertical = false) => rect(x, y, vertical ? 5 : 10, vertical ? 10 : 5, "#212121", { stroke: "#000", rx: 0.8, sw: 0.5 });
const cap = (x, y, vertical = false) => rect(x, y, vertical ? 5 : 8, vertical ? 8 : 5, "#c8a06a", { stroke: "#6d4c41", rx: 0.8, sw: 0.5 });
const smdLed = (x, y, color) => g(rect(x, y, 9, 5, color, { stroke: "#00000066", rx: 1, sw: 0.6 }), rect(x + 2.5, y + 1.2, 4, 2.6, "#ffffff88", { rx: 1 }));
const sot23 = (cx, cy) =>
  g(
    rect(cx - 6, cy - 4, 12, 8, "#1a1a1a", { stroke: "#000", rx: 1, sw: 0.5 }),
    ...[-4, 0, 4].map((dx) => rect(cx + dx - 1, cy + 4, 2, 3, "#cfd8dc")),
    ...[-3, 3].map((dx) => rect(cx + dx - 1, cy - 7, 2, 3, "#cfd8dc")),
  );

/** SOIC-8 style chip with pin stubs on the left and right long sides. */
function soic(cx, cy, label, { w = 30, h = 20, n = 4, fs = 5.5, label2 } = {}) {
  const out = [];
  const step = h / n;
  for (let i = 0; i < n; i++) {
    const y = cy - h / 2 + step * i + step / 2 - 1.2;
    out.push(rect(cx - w / 2 - 4, y, 4, 2.4, "#cfd8dc"));
    out.push(rect(cx + w / 2, y, 4, 2.4, "#cfd8dc"));
  }
  out.push(rect(cx - w / 2, cy - h / 2, w, h, "#1a1a1a", { stroke: "#000", rx: 1.5, sw: 0.8 }));
  out.push(circ(cx - w / 2 + 4, cy - h / 2 + 4, 1.2, "#555"));
  if (label) out.push(txt(cx, cy + (label2 ? -0.5 : 2), label, { fs }));
  if (label2) out.push(txt(cx, cy + 6, label2, { fs }));
  return out.join("\n");
}

/** Blue multi-turn trimmer (3296 style): blue block, brass screw with a slot. */
const trimmer = (cx, cy, s = 22) =>
  g(
    rect(cx - s / 2, cy - s / 2, s, s, "#2f80ed", { stroke: "#0d3c7a", rx: 2, sw: 1.2 }),
    circ(cx, cy, s * 0.32, "#e0c070", "#8d6e1c", 1),
    `  <path d="M${r1(cx - s * 0.24)} ${r1(cy - s * 0.1)} L${r1(cx + s * 0.24)} ${r1(cy + s * 0.1)}" stroke="#5d4a12" stroke-width="1.6" stroke-linecap="round"/>`,
  );

/**
 * A row of header pads. `pins` is [label | [label, id]]. Horizontal row centred on cx at y,
 * labels printed on the board beside it (`below` = under the pins, `above` = over them).
 */
function hdr(pins, cx, y, { pitch = 18, side = "below", fs = 7.5 } = {}) {
  const t = {};
  const out = [];
  const n = pins.length;
  const x0 = cx - (pitch * (n - 1)) / 2;
  pins.forEach((p, i) => {
    const [label, id = label] = Array.isArray(p) ? p : [p];
    const x = r1(x0 + i * pitch);
    out.push(circ(x, y, 8.5, GOLD, "#a07d1c", 0.8));
    out.push(`  <circle class="${holeClass(label)}" cx="${x}" cy="${y}" r="5"/>`);
    const ty = side === "below" ? y + 14 : y - 14;
    out.push(
      `  <text class="pinlbl" x="${x}" y="${ty}" transform="rotate(${side === "below" ? 90 : -90} ${x} ${ty})" text-anchor="start" dy="2.7" font-size="${fs}">${esc(label)}</text>`,
    );
    t[id] = { x, y };
  });
  return { svg: out.join("\n"), t };
}

/** Vertical header along x, labels beside it on `side` (left/right). */
function hdrY(pins, x, cy, { pitch = 18, side = "left", fs = 7.5 } = {}) {
  const t = {};
  const out = [];
  const n = pins.length;
  const y0 = cy - (pitch * (n - 1)) / 2;
  pins.forEach((p, i) => {
    const [label, id = label] = Array.isArray(p) ? p : [p];
    const y = r1(y0 + i * pitch);
    out.push(circ(x, y, 8.5, GOLD, "#a07d1c", 0.8));
    out.push(`  <circle class="${holeClass(label)}" cx="${x}" cy="${y}" r="5"/>`);
    out.push(
      `  <text class="pinlbl" x="${side === "left" ? x - 13 : x + 13}" y="${y + 2.7}" text-anchor="${side === "left" ? "end" : "start"}" font-size="${fs}">${esc(label)}</text>`,
    );
    t[id] = { x, y };
  });
  return { svg: out.join("\n"), t };
}

/** A solder-lug / spade terminal hanging down from y0; the terminal is the hole near the tip. */
function lug(x, y0, len, label, { wide = 12, labelY } = {}) {
  const holeY = y0 + len - 10;
  return {
    svg: g(
      rect(x - wide / 2, y0, wide, len, "#cfd8dc", { stroke: "#607d8b", rx: 2 }),
      circ(x, holeY, 3.2, "#37474f", "#263238", 0.8),
      txt(x, labelY ?? y0 + len + 18, label, { fs: 8, fill: OFF }),
    ),
    pt: { x, y: holeY },
  };
}

/** TO-92 seen from the flat face, legs down. Returns svg and the lead tips. */
function to92(cx, top, lines, legLabels, legLen = 110) {
  const bodyBottom = top + 100;
  const legX = [cx - 27, cx, cx + 27];
  const out = [];
  legX.forEach((x) => out.push(rect(x - 3.5, bodyBottom - 4, 7, legLen + 4, "#cfd8dc", { stroke: "#78909c", rx: 2, sw: 0.8 })));
  out.push(
    `  <path d="M${cx - 45} ${bodyBottom} V${top + 45} A45 45 0 0 1 ${cx + 45} ${top + 45} V${bodyBottom} Z" fill="#232323" stroke="#000" stroke-width="1.5"/>`,
    `  <path d="M${cx - 38} ${top + 50} A38 38 0 0 1 ${cx - 12} ${top + 12}" fill="none" stroke="#ffffff30" stroke-width="3" stroke-linecap="round"/>`,
  );
  lines.forEach((l, i) => out.push(txt(cx, top + 52 + i * 15, l, { fs: 12, bold: i === 0 })));
  const t = [];
  legX.forEach((x, i) => {
    t.push({ x, y: bodyBottom + legLen - 8 });
    out.push(txt(x, bodyBottom + legLen + 20, legLabels[i], { fs: 9, fill: OFF }));
  });
  return { svg: out.join("\n"), t };
}

const make = (o) => ({ kind: "module", ...o });

// ---------------------------------------------------------------------------

function ttp223() {
  const h = hdr([["I/O", "IO"], "VCC", "GND"], 75, 36);
  const body = g(
    pcb(20, 14, 110, 162),
    h.svg,
    circ(75, 120, 44, GOLD, "#a07d1c", 1),
    circ(75, 120, 36, BLUE),
    circ(75, 120, 31, GOLD),
    circ(75, 120, 5, "#a07d1c"),
    // TTP223 (SOT-23-6), LED and its resistor, mode pads A and B.
    sot23(36, 86),
    smdLed(104, 82, "#ef5350"),
    res(108, 92),
    rect(26, 150, 9, 9, GOLD, { stroke: "#a07d1c" }),
    rect(115, 150, 9, 9, GOLD, { stroke: "#a07d1c" }),
    txt(30, 168, "A", { fs: 7 }),
    txt(119, 168, "B", { fs: 7 }),
  );
  return make({
    id: "module.touch.ttp223",
    file: "modules/ttp223-touch.svg",
    caption: "TTP223 touch pad module (3 pins: I/O, VCC, GND)",
    title: "TTP223 capacitive touch module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Common blue TTP223 board: round gold touch pad, SOT-23-6 chip, LED, solder pads A and B.",
      "Header left to right: I/O, VCC, GND.",
    ],
    width: 150,
    height: 190,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function arcade() {
  const lugs = [
    lug(70, 168, 84, "LED +"),
    lug(110, 168, 84, "LED -"),
    lug(172, 168, 84, "COM"),
    lug(214, 168, 84, "NO"),
  ];
  const body = g(
    // seen from below: threaded body, nut, lamp holder and microswitch with their spade tabs
    circ(150, 106, 90, "#455a64", "#263238", 2),
    circ(150, 106, 76, "none", "#78909c", 1.5).replace("/>", ` stroke-dasharray="3 3"/>`),
    circ(150, 106, 60, "#37474f", "#263238", 1.5),
    rect(60, 120, 64, 48, "#111111", { stroke: "#000", rx: 4 }),
    rect(150, 120, 90, 48, "#2e7d32", { stroke: "#1b5e20", rx: 4 }),
    txt(92, 150, "LAMP", { fs: 8 }),
    txt(195, 150, "MICROSWITCH", { fs: 7 }),
    ...lugs.map((l) => l.svg),
  );
  const ids = ["LED+", "LED-", "COM", "NO"];
  const terminals = {};
  ids.forEach((id, i) => (terminals[id] = lugs[i].pt));
  return make({
    id: "module.button.arcade",
    file: "modules/arcade-button.svg",
    caption: "Arcade push button with LED (seen from the back: switch and lamp tabs)",
    title: "Arcade button with LED rear view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified drawing for HelpmeSolder wiring diagrams.",
      "Seen from the back: lamp holder with LED + and LED - tabs, microswitch with COM and NO tabs (the NC tab is left out).",
      "Tab order differs between brands; check the + mark on the lamp tab.",
    ],
    width: 300,
    height: 290,
    body,
    terminals,
    pinExit: { dx: 0, dy: 1 },
  });
}

function button12() {
  const lugs = [lug(85, 160, 74, "COM", { wide: 10 }), lug(115, 160, 74, "NO", { wide: 10 }), lug(145, 160, 74, "LED +", { wide: 10 }), lug(175, 160, 74, "LED -", { wide: 10 })];
  const body = g(
    rect(65, 138, 130, 30, "#263238", { stroke: "#000", rx: 4 }),
    ...lugs.map((l) => l.svg),
    circ(130, 90, 66, "#b0bec5", "#607d8b", 2),
    circ(130, 90, 58, "#90a4ae", "#607d8b", 1),
    circ(130, 90, 52, "#29b6f6"),
    circ(130, 90, 44, "#cfd8dc", "#78909c", 1.5),
    circ(130, 90, 38, "#eceff1"),
    `  <path d="M104 74 A30 30 0 0 1 128 58" fill="none" stroke="#ffffffcc" stroke-width="4" stroke-linecap="round"/>`,
    txt(130, 94, "12 mm", { fs: 9, fill: "#546e7a" }),
  );
  const terminals = {};
  ["COM", "NO", "LED+", "LED-"].forEach((id, i) => (terminals[id] = lugs[i].pt));
  return make({
    id: "module.button.12mm.led",
    file: "modules/button-12mm-led.svg",
    caption: "12 mm metal push button with LED ring (4 solder pins)",
    title: "12 mm metal push button with LED ring (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified drawing for HelpmeSolder wiring diagrams.",
      "Metal bezel with glowing ring, four solder lugs below: COM, NO (switch) then LED +, LED - (ring light).",
      "Lug order varies by seller; check the symbol on the body.",
    ],
    width: 260,
    height: 270,
    body,
    terminals,
    pinExit: { dx: 0, dy: 1 },
  });
}

/** BME280 / BMP280 breakout. */
function bmx({ id, file, name, color, stroke, square, caption }) {
  const h = hdr(["VCC", "GND", "SCL", "SDA", "CSB", "SDO"], 85, 34);
  const lid = square
    ? g(rect(71, 94, 28, 28, "#cfd8dc", { stroke: "#607d8b", rx: 2, sw: 1 }), circ(79, 102, 2.4, "#37474f"), `  <path d="M71 118 L75 122" stroke="#607d8b"/>`)
    : g(rect(71, 96, 28, 22, "#cfd8dc", { stroke: "#607d8b", rx: 2, sw: 1 }), circ(79, 103, 2.4, "#37474f"));
  const body = g(
    pcb(20, 14, 130, 152, color, stroke),
    h.svg,
    lid,
    sot23(124, 96),
    res(32, 90),
    res(32, 100),
    cap(124, 114),
    cap(124, 124),
    cap(32, 124),
    txt(85, 152, name, { fs: 8 }),
  );
  return make({
    id,
    file,
    caption,
    title: `${name} breakout top view (original simplified drawing, CC0)`,
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      `${name} breakout with the metal-lidded sensor (${square ? "square lid" : "rectangular lid"}), 3.3 V regulator and a 6-pin header.`,
      "Header left to right: VCC, GND, SCL, SDA, CSB, SDO (4-pin boards omit CSB and SDO). Board colour varies by seller.",
    ],
    width: 170,
    height: 180,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function bme280() {
  return bmx({ id: "module.bme280", file: "modules/bme280.svg", name: "BME280", color: "#5b2c8a", stroke: "#3b1a5c", square: true, caption: "BME280 temperature, humidity and pressure board" });
}
function bmp280() {
  return bmx({ id: "module.bmp280", file: "modules/bmp280.svg", name: "BMP280", color: BLUE, stroke: BLUE_S, square: false, caption: "BMP280 pressure and temperature board" });
}

function ds18b20() {
  const wires = [
    ["GND", 62, "#212121"],
    ["DQ", 100, "#fbc02d"],
    ["VDD", 138, "#e53935"],
  ];
  const terminals = {};
  const out = [
    rect(82, 20, 36, 172, "#cfd8dc", { stroke: "#78909c", rx: 18, sw: 1.5 }),
    rect(90, 36, 6, 140, "#ffffff", { rx: 3, extra: ` opacity="0.55"` }),
    rect(77, 190, 46, 38, "#1b1b1b", { stroke: "#546e7a", rx: 5 }),
    rect(93, 228, 14, 38, "#37474f", { stroke: "#546e7a", rx: 3 }),
  ];
  for (const [id, x, c] of wires) {
    const d = `M100 262 C100 300 ${x} 318 ${x} 372`;
    out.push(`  <path d="${d}" fill="none" stroke="#78909c" stroke-width="7" stroke-linecap="round"/>`);
    out.push(`  <path d="${d}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`);
    out.push(rect(x - 2.5, 366, 5, 16, "#d4a24c", { rx: 1 }));
    out.push(txt(x, 404, id, { fs: 9, fill: OFF }));
    terminals[id] = { x, y: 378 };
  }
  return make({
    id: "module.ds18b20",
    file: "modules/ds18b20.svg",
    caption: "DS18B20 waterproof probe (3 wires: GND, DQ, VDD)",
    title: "DS18B20 waterproof temperature probe (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified drawing for HelpmeSolder wiring diagrams.",
      "Waterproof probe: stainless tube, heat-shrink, 3 wires. Usual colours: black GND, yellow/white DQ, red VDD (check the seller note).",
      "The bare TO-92 chip has the same three pins, flat face toward you: GND, DQ, VDD.",
    ],
    width: 200,
    height: 420,
    body: g(...out),
    terminals,
    pinExit: { dx: 0, dy: 1 },
  });
}

function lm35() {
  const p = to92(90, 24, ["LM35", "DZ"], ["+Vs", "Vout", "GND"]);
  const terminals = { VS: p.t[0], VOUT: p.t[1], GND: p.t[2] };
  return make({
    id: "module.lm35",
    file: "modules/lm35.svg",
    caption: "LM35 temperature sensor (TO-92: +Vs, Vout, GND)",
    title: "LM35 TO-92 temperature sensor front view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified drawing for HelpmeSolder wiring diagrams.",
      "TO-92 package seen from the flat face with the legs down: +Vs, Vout, GND from the left.",
    ],
    width: 180,
    height: 270,
    body: p.svg,
    terminals,
    pinExit: { dx: 0, dy: 1 },
  });
}

function bh1750() {
  const h = hdr(["VCC", "GND", "SCL", "SDA", "ADDR"], 75, 34);
  const body = g(
    pcb(20, 14, 110, 148, "#5e35b1", "#311b92"),
    h.svg,
    // clear light window with the photodiode behind it
    rect(80, 100, 30, 22, "#e3f2fd", { stroke: "#90a4ae", rx: 2 }),
    rect(87, 106, 16, 10, "#3949ab", { rx: 1 }),
    sot23(42, 104),
    cap(34, 120),
    cap(48, 120),
    res(34, 132),
    res(48, 132),
    cap(100, 134),
    txt(75, 154, "GY-302", { fs: 7 }),
  );
  return make({
    id: "module.bh1750",
    file: "modules/bh1750.svg",
    caption: "BH1750 light sensor board (GY-302, 5 pins)",
    title: "BH1750 light sensor board top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "GY-302 board: clear BH1750 window, 3.3 V regulator, I2C pull-ups.",
      "Header left to right: VCC, GND, SCL, SDA, ADDR (some boards order them differently or add DVI; check the silkscreen).",
    ],
    width: 150,
    height: 175,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function tcs34725() {
  const h = hdr(["VIN", "3V3", "GND", "SDA", "SCL", "INT", "LED"], 89, 34);
  const ledBlock = (x) => g(rect(x, 108, 24, 16, "#fffde7", { stroke: "#bdbdbd", rx: 2 }), rect(x + 6, 112, 12, 8, "#ffe082", { stroke: "#f9a825", rx: 1, sw: 0.6 }));
  const body = g(
    pcb(16, 14, 146, 168, "#1c1c1c", "#424242"),
    h.svg,
    ledBlock(30),
    ledBlock(124),
    // colour sensor chip with its window
    rect(72, 108, 34, 20, "#0d0d0d", { stroke: "#555", rx: 2 }),
    rect(80, 112, 18, 12, "#455a64", { stroke: "#78909c", rx: 1, sw: 0.6 }),
    sot23(46, 150),
    cap(64, 146),
    cap(76, 146),
    res(90, 146),
    res(106, 146),
    res(122, 146),
    txt(89, 172, "TCS34725", { fs: 7 }),
  );
  return make({
    id: "module.tcs34725",
    file: "modules/tcs34725.svg",
    caption: "TCS34725 colour sensor board (7 pins)",
    title: "TCS34725 colour sensor board top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Square board: sensor chip with window in the middle, white LED on each side, 3.3 V regulator.",
      "Header left to right: VIN, 3V3, GND, SDA, SCL, INT, LED. Board colour varies (black or purple).",
    ],
    width: 178,
    height: 196,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function a3144() {
  const h = hdr(["S", ["+", "VCC"], ["-", "GND"]], 65, 34);
  const legs = [47, 65, 83].map((x) => rect(x - 2.5, 124, 5, 20, "#cfd8dc", { stroke: "#78909c", sw: 0.6 }));
  const body = g(
    pcb(15, 14, 100, 168, "#2e7d32", "#1b5e20"),
    h.svg,
    ...legs,
    `  <path d="M${65 - 24} 126 V${96} A24 24 0 0 1 ${65 + 24} 96 V126 Z" fill="#232323" stroke="#000" stroke-width="1"/>`,
    txt(65, 108, "3144", { fs: 7 }),
    smdLed(22, 148, "#ef5350"),
    res(86, 154),
    res(92, 130, true),
    cap(24, 164),
    txt(65, 172, "KY-003", { fs: 7 }),
  );
  return make({
    id: "module.hall.a3144",
    file: "modules/hall-a3144.svg",
    caption: "A3144 Hall sensor board KY-003 (S, +, -)",
    title: "A3144 Hall sensor board KY-003 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "KY-003: A3144 in a TO-92 package (printed face shown), LED and resistor, 3-pin header.",
      "Header left to right: S (signal), + (VCC), - (GND). Silkscreen order differs on some boards; check yours.",
    ],
    width: 130,
    height: 196,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function reed() {
  const h = hdr(["VCC", "GND", "DO", "AO"], 85, 34);
  const body = g(
    pcb(20, 14, 130, 258),
    h.svg,
    soic(62, 112, "LM393", { w: 30, h: 18 }),
    trimmer(112, 114),
    smdLed(36, 146, "#ef5350"),
    smdLed(122, 146, "#66bb6a"),
    res(60, 146),
    res(80, 146),
    cap(94, 148),
    // glass capsule reed switch soldered across the bottom
    rect(26, 206, 18, 12, GOLD, { stroke: "#a07d1c", rx: 2 }),
    rect(126, 206, 18, 12, GOLD, { stroke: "#a07d1c", rx: 2 }),
    rect(36, 203, 98, 18, "#b2dfdb", { stroke: "#4db6ac", rx: 9, extra: ` opacity="0.85"` }),
    `  <path d="M30 212 H78 L96 207 H100" fill="none" stroke="#78909c" stroke-width="1.6" stroke-linecap="round"/>`,
    `  <path d="M140 212 H96 L78 217 H74" fill="none" stroke="#78909c" stroke-width="1.6" stroke-linecap="round"/>`,
    txt(85, 246, "REED", { fs: 9, bold: true }),
    txt(85, 258, "KY-025", { fs: 7 }),
  );
  return make({
    id: "module.reed.switch",
    file: "modules/reed-switch.svg",
    caption: "Reed switch module (glass capsule, LM393, 4 pins)",
    title: "Reed switch module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue board: glass reed capsule soldered across the end, LM393 comparator, sensitivity trimmer, power and output LEDs.",
      "Header left to right: VCC, GND, DO, AO (many boards print AO, DO, GND, VCC; check yours).",
    ],
    width: 170,
    height: 286,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function tcrt5000() {
  const h = hdr(["VCC", "GND", "DO", "AO"], 80, 34);
  const body = g(
    pcb(30, 14, 100, 252),
    h.svg,
    mount(118, 198, 4),
    soic(80, 106, "LM393", { w: 30, h: 18 }),
    trimmer(80, 152),
    smdLed(44, 150, "#ef5350"),
    smdLed(108, 150, "#66bb6a"),
    res(48, 128),
    res(104, 120),
    cap(104, 132),
    txt(80, 196, "TCRT5000", { fs: 8 }),
    // reflective sensor: IR LED (clear lens) and phototransistor (dark lens) in one block
    rect(48, 214, 64, 44, "#1c1c1c", { stroke: "#000", rx: 4 }),
    circ(64, 236, 11, "#cfd8dc", "#78909c", 1.2),
    circ(64, 236, 5, "#eceff1"),
    circ(96, 236, 11, "#0b0b2a", "#455a64", 1.2),
    circ(96, 236, 5, "#1a237e"),
  );
  return make({
    id: "module.tcrt5000",
    file: "modules/tcrt5000.svg",
    caption: "TCRT5000 IR line sensor module (4 pins)",
    title: "TCRT5000 IR line sensor module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue board: TCRT5000 (IR LED and phototransistor side by side) on the end, LM393, trimmer, two LEDs.",
      "Header left to right: VCC, GND, DO, AO (some boards print AO, DO, GND, VCC).",
    ],
    width: 160,
    height: 280,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function irObstacle() {
  const h = hdr(["OUT", "GND", "VCC"], 75, 34);
  const dome = (x, clear) =>
    g(
      circ(x, 244, 19, clear ? "#eceff1" : "#1a1a1a", "#607d8b", 1.5),
      circ(x, 244, 14, clear ? "#cfd8dc" : "#3e2723", clear ? "#90a4ae" : "#6d4c41", 1),
      circ(x, 244, 5, clear ? "#ffffff" : "#000000"),
    );
  const body = g(
    pcb(30, 14, 90, 236),
    h.svg,
    mount(40, 72, 5),
    soic(78, 100, "LM393", { w: 28, h: 18 }),
    trimmer(76, 148),
    smdLed(40, 176, "#ef5350"),
    smdLed(100, 176, "#66bb6a"),
    res(58, 176),
    res(82, 176),
    cap(104, 128),
    txt(75, 200, "FC-51", { fs: 8 }),
    dome(52, true),
    dome(98, false),
  );
  return make({
    id: "module.ir.obstacle",
    file: "modules/ir-obstacle.svg",
    caption: "IR obstacle avoidance module (OUT, GND, VCC)",
    title: "IR obstacle avoidance module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "FC-51 style: clear IR LED and dark receiver at the front, LM393, trimmer, power and output LEDs.",
      "Header left to right: OUT, GND, VCC.",
    ],
    width: 150,
    height: 272,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function rain() {
  const combs = [];
  for (let i = 0; i < 10; i++) {
    const y = 30 + i * 8;
    combs.push(i % 2 === 0 ? rect(34, y - 1.8, 112, 3.6, "#cfd8dc", { rx: 1 }) : rect(44, y - 1.8, 112, 3.6, "#cfd8dc", { rx: 1 }));
  }
  const wire = (x1, x2, c) => {
    const d = `M${x1} 112 C${x1} 170 ${x2} 160 ${x2} 222`;
    return g(
      `  <path d="${d}" fill="none" stroke="#78909c" stroke-width="6.5" stroke-linecap="round"/>`,
      `  <path d="${d}" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`,
    );
  };
  const h = hdr(["VCC", "GND", "DO", "AO"], 95, 346, { side: "above" });
  const body = g(
    // rain pad: black board with two interleaved silver combs
    rect(20, 14, 150, 108, "#1c1c1c", { stroke: "#424242", rx: 5, sw: 2 }),
    rect(30, 26, 8, 86, "#cfd8dc", { rx: 2 }),
    rect(152, 26, 8, 86, "#cfd8dc", { rx: 2 }),
    ...combs,
    circ(34, 112, 4, GOLD),
    circ(156, 112, 4, GOLD),
    wire(34, 70, "#e53935"),
    wire(156, 120, "#8d6e63"),
    // control board
    pcb(45, 206, 100, 156),
    circ(70, 222, 5, GOLD),
    circ(120, 222, 5, GOLD),
    soic(95, 262, "LM393", { w: 30, h: 18 }),
    trimmer(62, 296),
    smdLed(112, 286, "#ef5350"),
    smdLed(112, 302, "#66bb6a"),
    res(92, 288, false),
    cap(92, 300),
    h.svg,
  );
  return make({
    id: "module.rain.fc37",
    file: "modules/rain-fc37.svg",
    caption: "FC-37 rain sensor: comb pad and control board (VCC, GND, DO, AO)",
    title: "FC-37 rain sensor pad and control board (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified drawing for HelpmeSolder wiring diagrams.",
      "Black comb pad on two wires to a blue LM393 control board; the 4 pins are on the control board.",
      "Header left to right: VCC, GND, DO, AO (some boards print AO, DO, GND, VCC).",
    ],
    width: 190,
    height: 376,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: 1 },
  });
}

function waterLevel() {
  const h = hdr([["S", "S"], ["+", "VCC"], ["-", "GND"]], 65, 34);
  const stripes = [];
  for (let i = 0; i < 10; i++) {
    const x = 29.5 + i * 7.4;
    const power = i % 2 === 0;
    stripes.push(rect(x, 100, power ? 5 : 3.2, 232, power ? "#e6c978" : "#cfd8dc", { rx: 1 }));
  }
  const body = g(
    pcb(20, 14, 90, 332, "#2e7d32", "#1b5e20"),
    h.svg,
    res(30, 70),
    res(46, 70),
    res(62, 70),
    res(78, 70),
    res(94, 70),
    rect(26, 88, 78, 4, "#e6c978", { rx: 1 }),
    ...stripes,
    txt(65, 338, "WATER", { fs: 6 }),
  );
  return make({
    id: "module.water.level",
    file: "modules/water-level.svg",
    caption: "Water level sensor board (S, +, -)",
    title: "Water level sensor board top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Long board with ten bare parallel copper strips (alternating power and sense) and a 3-pin header.",
      "Header left to right: S (signal), + (VCC), - (GND). Some boards print - + S instead; check yours.",
    ],
    width: 130,
    height: 360,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function soil() {
  const h = hdr(["VCC", "GND", "DO", "AO"], 95, 34);
  const wire = (x, c) => {
    const d = `M${x} 164 C${x} 190 ${x} 205 ${x} 236`;
    return g(`  <path d="${d}" fill="none" stroke="#78909c" stroke-width="6.5" stroke-linecap="round"/>`, `  <path d="${d}" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>`);
  };
  const body = g(
    pcb(40, 14, 110, 160),
    h.svg,
    soic(66, 106, "LM393", { w: 30, h: 18 }),
    trimmer(122, 108),
    smdLed(58, 134, "#ef5350"),
    smdLed(100, 134, "#66bb6a"),
    res(82, 138),
    cap(124, 138),
    circ(72, 162, 5, GOLD),
    circ(118, 162, 5, GOLD),
    wire(72, "#e53935"),
    wire(118, "#8d6e63"),
    // fork probe: dark board with two tinned prongs
    rect(55, 226, 80, 70, "#263238", { stroke: "#455a64", rx: 3, sw: 1.5 }),
    circ(72, 238, 5, GOLD),
    circ(118, 238, 5, GOLD),
    `  <polygon points="55,296 90,296 90,404 72.5,428 55,404" fill="#cfd8dc" stroke="#78909c" stroke-width="1.5"/>`,
    `  <polygon points="100,296 135,296 135,404 117.5,428 100,404" fill="#cfd8dc" stroke="#78909c" stroke-width="1.5"/>`,
    rect(70, 238, 4, 58, "#b0bec5"),
    rect(116, 238, 4, 58, "#b0bec5"),
  );
  return make({
    id: "module.soil.resistive",
    file: "modules/soil-resistive.svg",
    caption: "Resistive soil moisture probe and control board (VCC, GND, DO, AO)",
    title: "Resistive soil moisture probe YL-69 with LM393 board (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified drawing for HelpmeSolder wiring diagrams.",
      "Two-prong fork probe on two wires to a blue LM393 control board; the 4 pins are on the control board.",
      "Header left to right: VCC, GND, DO, AO (some boards print AO, DO, GND, VCC).",
    ],
    width: 190,
    height: 440,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function mq135() {
  const h = hdr(["VCC", "GND", "DO", "AO"], 85, 34);
  const body = g(
    `  <defs><pattern id="mq135mesh" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#37474f"/><path d="M0 0 L4 4 M4 0 L0 4" stroke="#90a4ae" stroke-width="0.7"/></pattern></defs>`,
    pcb(20, 14, 130, 304),
    h.svg,
    mount(36, 300, 5),
    mount(134, 300, 5),
    soic(58, 104, "LM393", { w: 30, h: 18 }),
    trimmer(116, 106),
    smdLed(38, 136, "#ef5350"),
    smdLed(122, 136, "#66bb6a"),
    res(60, 136),
    res(80, 136),
    txt(85, 164, "MQ-135", { fs: 8 }),
    circ(85, 232, 60, "#78909c", "#455a64", 2),
    circ(85, 232, 53, "#b0bec5", "#607d8b", 1.5),
    circ(85, 232, 46, "url(#mq135mesh)", "#455a64", 1.5),
    circ(85, 232, 7, "#cfd8dc", "#607d8b", 1),
  );
  return make({
    id: "module.mq135",
    file: "modules/mq135.svg",
    caption: "MQ-135 air quality sensor module (VCC, GND, DO, AO)",
    title: "MQ-135 air quality sensor module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue board: round metal-mesh sensor cap, LM393, threshold trimmer, power and output LEDs.",
      "Header left to right: VCC, GND, DO, AO (many boards print AO, DO, GND, VCC; check yours). All MQ boards look alike.",
    ],
    width: 170,
    height: 332,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function max9814() {
  const h = hdr(["GND", "VDD", "GAIN", ["A/R", "AR"], "OUT"], 80, 34);
  const body = g(
    pcb(20, 14, 120, 186, "#c62828", "#8e0000"),
    h.svg,
    // electret microphone can
    circ(80, 118, 30, "#b0bec5", "#607d8b", 1.5),
    circ(80, 118, 24, "#cfd8dc", "#78909c", 1),
    circ(80, 118, 6, "#212121"),
    soic(42, 168, "9814", { w: 18, h: 12, n: 3, fs: 5 }),
    cap(66, 160),
    cap(66, 172),
    res(92, 164),
    res(104, 164),
    rect(118, 154, 8, 8, GOLD, { stroke: "#a07d1c" }),
    rect(118, 168, 8, 8, GOLD, { stroke: "#a07d1c" }),
    txt(80, 192, "MAX9814", { fs: 7 }),
  );
  return make({
    id: "module.max9814",
    file: "modules/max9814.svg",
    caption: "MAX9814 microphone amplifier (GND, VDD, GAIN, A/R, OUT)",
    title: "MAX9814 microphone amplifier board top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Small board: electret microphone can, MAX9814 AGC amplifier chip, gain jumper pads, 5-pin header.",
      "Header left to right: GND, VDD, GAIN, A/R, OUT. Board colour varies by seller.",
    ],
    width: 160,
    height: 214,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function adxl345() {
  const h = hdr(["GND", "VCC", "CS", "INT1", "INT2", "SDO", "SDA", "SCL"], 95, 34);
  const body = g(
    pcb(16, 14, 158, 130),
    h.svg,
    mount(30, 128, 4),
    mount(160, 128, 4),
    rect(40, 92, 30, 20, "#1a1a1a", { stroke: "#000", rx: 1.5 }),
    circ(45, 97, 1.3, "#777"),
    txt(55, 105, "ADXL345", { fs: 4.8 }),
    sot23(92, 100),
    cap(106, 96),
    cap(118, 96),
    res(106, 108),
    res(120, 108),
    txt(128, 126, "GY-291", { fs: 7, anchor: "middle" }),
  );
  return make({
    id: "module.adxl345",
    file: "modules/adxl345.svg",
    caption: "ADXL345 accelerometer board GY-291 (8 pins)",
    title: "ADXL345 accelerometer board top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "GY-291 board: tiny ADXL345 chip, 3.3 V regulator, 8-pin header.",
      "Header left to right: GND, VCC, CS, INT1, INT2, SDO, SDA, SCL.",
    ],
    width: 190,
    height: 160,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function qmc5883l() {
  const h = hdr(["VCC", "GND", "SCL", "SDA", "DRDY"], 70, 34);
  const body = g(
    pcb(15, 14, 110, 118),
    h.svg,
    rect(60, 92, 20, 20, "#1a1a1a", { stroke: "#000", rx: 1.5 }),
    circ(65, 97, 1.2, "#777"),
    txt(70, 105, "5883", { fs: 5.5 }),
    sot23(34, 98),
    cap(94, 90),
    cap(94, 100),
    res(100, 110),
    cap(26, 114),
    txt(70, 125, "GY-271", { fs: 6.5 }),
  );
  return make({
    id: "module.qmc5883l",
    file: "modules/qmc5883l.svg",
    caption: "QMC5883L / HMC5883L compass board GY-271 (5 pins)",
    title: "QMC5883L compass board GY-271 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "GY-271 board: tiny magnetometer chip, 3.3 V regulator, header.",
      "Header left to right: VCC, GND, SCL, SDA, DRDY (a 5-pin variant; some GY-271 boards have an extra pin or a different order).",
    ],
    width: 140,
    height: 146,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function vl53l0x() {
  const h = hdr(["VIN", "GND", "SCL", "SDA", "GPIO1", "XSHUT"], 75, 34);
  const body = g(
    pcb(15, 14, 120, 156, "#4a2a8c", "#2a1560"),
    h.svg,
    // time-of-flight module: emitter on the left, receiver on the right
    rect(55, 98, 40, 22, "#212121", { stroke: "#000", rx: 2 }),
    rect(59, 102, 10, 14, "#5c4b8a", { stroke: "#9575cd", rx: 1.5, sw: 0.6 }),
    rect(74, 102, 17, 14, "#37474f", { stroke: "#78909c", rx: 1.5, sw: 0.6 }),
    sot23(34, 112),
    cap(30, 128),
    cap(42, 128),
    res(108, 106),
    res(108, 118),
    cap(108, 130),
    txt(75, 158, "VL53L0X", { fs: 7 }),
  );
  return make({
    id: "module.vl53l0x",
    file: "modules/vl53l0x.svg",
    caption: "VL53L0X time-of-flight distance sensor board (6 pins)",
    title: "VL53L0X time-of-flight distance sensor top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Tiny board: the VL53L0X module with its emitter and receiver apertures, 3.3 V regulator, 6-pin header.",
      "Header left to right: VIN, GND, SCL, SDA, GPIO1, XSHUT.",
    ],
    width: 150,
    height: 184,
    body,
    terminals: h.t,
    pinExit: { dx: 0, dy: -1 },
  });
}

function ina219() {
  const st = screwTerminal(63, 12, 2, { pitch: 32, h: 34, color: "#2a7de1" });
  const h = hdr(["VCC", "GND", "SCL", "SDA"], 95, 196, { side: "above" });
  const body = g(
    pcb(20, 34, 150, 184),
    st.svg,
    txt(79, 64, "VIN+", { fs: 7 }),
    txt(111, 64, "VIN-", { fs: 7 }),
    // 0.1 ohm shunt between the terminal and the chip
    rect(80, 76, 30, 12, "#1a1a1a", { stroke: "#000", rx: 1.5 }),
    rect(76, 76, 5, 12, "#cfd8dc"),
    rect(109, 76, 5, 12, "#cfd8dc"),
    txt(95, 85, "R100", { fs: 5.5 }),
    soic(95, 116, "INA219", { w: 28, h: 16, fs: 5.5 }),
    rect(30, 104, 8, 8, GOLD, { stroke: "#a07d1c" }),
    rect(30, 116, 8, 8, GOLD, { stroke: "#a07d1c" }),
    txt(44, 111, "A0", { fs: 6, anchor: "start" }),
    txt(44, 123, "A1", { fs: 6, anchor: "start" }),
    cap(138, 100),
    cap(138, 112),
    res(138, 124),
    h.svg,
  );
  return make({
    id: "module.ina219",
    file: "modules/ina219.svg",
    caption: "INA219 current sensor (screw terminal VIN+/VIN-, 4-pin header)",
    title: "INA219 current and voltage sensor top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue board: 2-pole screw terminal VIN+ and VIN- (the circuit being measured), R100 shunt, INA219 chip, A0/A1 address pads.",
      "Header left to right: VCC, GND, SCL, SDA. Wire VIN+/VIN- in series with the load, not to the microcontroller.",
    ],
    width: 190,
    height: 232,
    body,
    terminals: { ...h.t, "VIN+": st.poles[0], "VIN-": st.poles[1] },
  });
}

function acs712() {
  const st = screwTerminal(24, 30, 2, { pitch: 36, h: 40, color: "#2a7de1", horizontal: false });
  const h = hdrY(["VCC", "OUT", "GND"], 214, 65);
  const pinTop = [112, 124, 136, 148].map((x) => rect(x, 38, 3, 6, "#cfd8dc"));
  const pinBot = [112, 124, 136, 148].map((x) => rect(x, 90, 3, 6, "#cfd8dc"));
  const body = g(
    pcb(20, 20, 217, 91),
    st.svg,
    txt(70, 51, "IP+", { fs: 7.5, anchor: "start" }),
    txt(70, 87, "IP-", { fs: 7.5, anchor: "start" }),
    ...pinTop,
    ...pinBot,
    rect(108, 44, 46, 46, "#1a1a1a", { stroke: "#000", rx: 2, sw: 0.8 }),
    circ(114, 50, 1.4, "#555"),
    txt(131, 64, "ACS712", { fs: 6.5 }),
    txt(131, 76, "05B", { fs: 6.5 }),
    smdLed(170, 30, "#ef5350"),
    res(166, 96),
    cap(180, 96),
    h.svg,
  );
  return make({
    id: "module.acs712",
    file: "modules/acs712.svg",
    caption: "ACS712 current sensor (screw terminal IP+/IP-, pins VCC, OUT, GND)",
    title: "ACS712 current sensor module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue board: 2-pole screw terminal IP+ and IP- (the load current passes through it), ACS712 chip, 3-pin header VCC, OUT, GND.",
      "The range (05B, 20A, 30A) is printed on the chip; the drawing shows 05B.",
    ],
    width: 260,
    height: 132,
    body,
    terminals: { ...h.t, "IP+": st.poles[0], "IP-": st.poles[1] },
  });
}

function fsr() {
  const pins = [
    [78, "1"],
    [102, "2"],
  ];
  const terminals = {};
  const out = [
    // thin flexible tail
    rect(65, 140, 50, 210, "#d7ccc8", { stroke: "#a1887f", rx: 3 }),
    rect(77, 140, 4, 200, "#b0bec5"),
    rect(99, 140, 4, 200, "#b0bec5"),
    // round pad
    circ(90, 84, 72, "#d7ccc8", "#a1887f", 1.5),
    circ(90, 84, 56, "#2b2b2b", "#000", 1.5),
    circ(90, 84, 40, "none", "#555", 1).replace("/>", ` stroke-dasharray="4 3"/>`),
    circ(90, 84, 6, "#555"),
  ];
  for (const [x, id] of pins) {
    out.push(rect(x - 4, 336, 8, 36, "#cfd8dc", { stroke: "#78909c", rx: 2 }));
    out.push(txt(x, 392, id, { fs: 10, fill: OFF }));
    terminals[id] = { x, y: 366 };
  }
  return make({
    id: "module.fsr",
    file: "modules/fsr.svg",
    caption: "Force sensitive resistor (round pad on a tail, 2 contacts)",
    title: "Force sensitive resistor FSR 402 style (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified drawing for HelpmeSolder wiring diagrams.",
      "Round pressure pad on a thin tail with two leads; no polarity. Wire it in a voltage divider with about 10 kohm.",
    ],
    width: 180,
    height: 400,
    body: g(...out),
    terminals,
    pinExit: { dx: 0, dy: 1 },
  });
}

const drawings = [
  ttp223,
  arcade,
  button12,
  bme280,
  bmp280,
  ds18b20,
  lm35,
  bh1750,
  tcs34725,
  a3144,
  reed,
  tcrt5000,
  irObstacle,
  rain,
  waterLevel,
  soil,
  mq135,
  max9814,
  adxl345,
  qmc5883l,
  vl53l0x,
  ina219,
  acs712,
  fsr,
];

export default drawings;
