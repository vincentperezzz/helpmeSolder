// Display modules: OLEDs, TFTs, e-paper, LED digit/matrix modules and the ST7920 graphic LCD.
import { holeMount, esc, r1 } from "./_lib.mjs";
import { rowHeader } from "./_helpers.mjs";

const pcb = (x, y, w, h, fill, stroke, rx = 6) =>
  `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;

/** Faint diagonal reflection laid over dark glass. */
const shine = (x, y, w, h) =>
  [
    `  <polygon points="${r1(x)},${r1(y + h)} ${r1(x + w * 0.5)},${r1(y)} ${r1(x + w * 0.72)},${r1(y)} ${r1(x + w * 0.22)},${r1(y + h)}" fill="#fff" opacity="0.07"/>`,
    `  <polygon points="${r1(x + w * 0.3)},${r1(y + h)} ${r1(x + w * 0.75)},${r1(y)} ${r1(x + w * 0.82)},${r1(y)} ${r1(x + w * 0.37)},${r1(y + h)}" fill="#fff" opacity="0.05"/>`,
  ].join("\n");

const text = (x, y, s, { size = 7, fill = "#eceff1", anchor = "middle", opacity = 1, extra = "" } = {}) =>
  `  <text class="label" x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" style="fill:${fill}" opacity="${opacity}"${extra}>${esc(s)}</text>`;

const smdPart = (x, y, w = 8, h = 5) => `  <rect class="smd" x="${x}" y="${y}" width="${w}" height="${h}" rx="0.8"/>`;

const SEG = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg" };

/** One 7-segment digit; `digit` null leaves every segment unlit. */
function sevenSeg(x, y, w, h, t, digit, on = "#ff4d3d", off = "#3a1313") {
  const g = 1;
  const lit = digit == null ? "" : SEG[digit];
  const hz = (x0, x1, yc) =>
    `${r1(x0)},${r1(yc)} ${r1(x0 + t / 2)},${r1(yc - t / 2)} ${r1(x1 - t / 2)},${r1(yc - t / 2)} ${r1(x1)},${r1(yc)} ${r1(x1 - t / 2)},${r1(yc + t / 2)} ${r1(x0 + t / 2)},${r1(yc + t / 2)}`;
  const vt = (y0, y1, xc) =>
    `${r1(xc)},${r1(y0)} ${r1(xc + t / 2)},${r1(y0 + t / 2)} ${r1(xc + t / 2)},${r1(y1 - t / 2)} ${r1(xc)},${r1(y1)} ${r1(xc - t / 2)},${r1(y1 - t / 2)} ${r1(xc - t / 2)},${r1(y0 + t / 2)}`;
  const x0 = x + t / 2 + g;
  const x1 = x + w - t / 2 - g;
  const ym = y + h / 2;
  const segs = {
    a: hz(x0, x1, y + t / 2),
    g: hz(x0, x1, ym),
    d: hz(x0, x1, y + h - t / 2),
    f: vt(y + t / 2 + g, ym - g, x + t / 2),
    e: vt(ym + g, y + h - t / 2 - g, x + t / 2),
    b: vt(y + t / 2 + g, ym - g, x + w - t / 2),
    c: vt(ym + g, y + h - t / 2 - g, x + w - t / 2),
  };
  return Object.entries(segs)
    .map(([k, pts]) => `  <polygon points="${pts}" fill="${lit.includes(k) ? on : off}"/>`)
    .join("\n");
}

function oledSmall({ id, file, title, caption, comment, bw, bh, boardFill, boardStroke, glass, active, label, sub, holes }) {
  const bx = 8;
  const by = 8;
  const width = bw + 16;
  const height = bh + 16;
  const hdr = rowHeader({
    pins: [
      { label: "GND", id: "GND" },
      { label: "VCC", id: "VCC" },
      { label: "SCL", id: "SCL" },
      { label: "SDA", id: "SDA" },
    ],
    x: bx + 14,
    y: by + bh / 2 - 27,
    pitch: 18,
    dir: "y",
    side: "right",
  });
  const body = [
    pcb(bx, by, bw, bh, boardFill, boardStroke),
    ...(holes ?? []).map(([x, y]) => holeMount(x, y, 3.5)),
    hdr.svg,
    `  <rect x="${glass.x}" y="${glass.y}" width="${glass.w}" height="${glass.h}" rx="2" fill="#15171c" stroke="#05060a" stroke-width="1.5"/>`,
    `  <rect x="${active.x}" y="${active.y}" width="${active.w}" height="${active.h}" fill="#05060a" stroke="#242833" stroke-width="0.8"/>`,
    text(active.x + active.w / 2, active.y + active.h / 2 - (sub ? 2 : -5), label, { size: sub ? 14 : 15, fill: "#d6ecff", opacity: 0.92 }),
    sub ? text(active.x + active.w / 2, active.y + active.h / 2 + 16, sub, { size: 9, fill: "#d6ecff", opacity: 0.8 }) : "",
    shine(glass.x, glass.y, glass.w, glass.h),
  ].join("\n");
  return {
    id,
    kind: "module",
    file,
    caption,
    title,
    comment,
    width,
    height,
    body,
    terminals: hdr.terminals,
    pinExit: { dx: -1, dy: 0 },
  };
}

function ssd1306() {
  return oledSmall({
    id: "module.oled.ssd1306.128x32",
    file: "modules/oled-ssd1306-128x32.svg",
    title: "OLED SSD1306 128x32 (I2C), top view",
    caption: "Wide, short 128x32 OLED board with a 4-pin I2C header on the left edge",
    comment: [
      "0.91 inch SSD1306 OLED breakout, 38 x 12 mm blue board, about 8 units per mm.",
      "4-pin header on the left short edge, top to bottom GND, VCC, SCL, SDA (the usual silkscreen order).",
      "Some boards use a black PCB or the SSD1315 chip; layout is the same.",
    ],
    bw: 308,
    bh: 100,
    boardFill: "#0d47a1",
    boardStroke: "#082f6b",
    glass: { x: 72, y: 14, w: 234, h: 88 },
    active: { x: 92, y: 36, w: 180, h: 45 },
    label: "0.91 OLED",
  });
}

function sh1106() {
  // Square 1.3 inch board: header across the top, glass underneath. Rotated layout of the usual breakout.
  const bx = 8;
  const by = 8;
  const bw = 248;
  const bh = 250;
  const hdr = rowHeader({
    pins: [
      { label: "GND", id: "GND" },
      { label: "VCC", id: "VCC" },
      { label: "SCL", id: "SCL" },
      { label: "SDA", id: "SDA" },
    ],
    x: 132 - 27,
    y: 30,
    pitch: 18,
    dir: "x",
    side: "below",
  });
  const body = [
    pcb(bx, by, bw, bh, "#1b1e24", "#0a0b0e"),
    holeMount(22, 22, 3.5),
    holeMount(242, 22, 3.5),
    holeMount(22, 244, 3.5),
    holeMount(242, 244, 3.5),
    hdr.svg,
    `  <rect x="24" y="80" width="216" height="150" rx="2" fill="#15171c" stroke="#05060a" stroke-width="1.5"/>`,
    `  <rect x="36" y="112" width="192" height="92" fill="#05060a" stroke="#242833" stroke-width="0.8"/>`,
    text(132, 156, "1.3 OLED", { size: 18, fill: "#e8f4ff", opacity: 0.92 }),
    text(132, 176, "SH1106 128x64", { size: 9, fill: "#e8f4ff", opacity: 0.8 }),
    shine(24, 80, 216, 150),
  ].join("\n");
  return {
    id: "module.oled.sh1106.1in3",
    kind: "module",
    file: "modules/oled-sh1106-1in3.svg",
    caption: "1.3 inch 128x64 OLED board with a 4-pin I2C header along the top",
    title: "OLED SH1106 1.3 inch (I2C), top view",
    comment: [
      "1.3 inch SH1106 OLED breakout, about 35 x 35 mm black board, about 7 units per mm.",
      "4-pin header along the top edge, left to right GND, VCC, SCL, SDA. Boards exist with the header on a side edge or in other colours; this is the common one.",
    ],
    width: 264,
    height: 266,
    body,
    terminals: hdr.terminals,
    pinExit: { dx: 0, dy: -1 },
  };
}

function st7735() {
  const pins = ["VCC", "GND", "CS", "RST", "DC", "SDA", "SCK", "LED"].map((p) => ({ label: p === "RST" ? "RESET" : p === "DC" ? "A0" : p, id: p }));
  const pitch = 15;
  const hdr = rowHeader({ pins, x: 110 - (pitch * 7) / 2, y: 32, pitch, dir: "x", side: "below", r: 5 });
  const body = [
    pcb(8, 8, 204, 336, "#b71c1c", "#7f0000"),
    holeMount(20, 20, 3.5),
    holeMount(200, 20, 3.5),
    hdr.svg,
    `  <rect x="14" y="82" width="192" height="254" rx="3" fill="#0d0d10" stroke="#000" stroke-width="1.5"/>`,
    `  <rect x="28" y="104" width="164" height="206" fill="#0a1626" stroke="#1d2a3d" stroke-width="1"/>`,
    shine(28, 104, 164, 206),
    text(110, 332, "1.8 TFT 128x160", { size: 7, fill: "#9aa3b2" }),
  ].join("\n");
  return {
    id: "module.tft.st7735.1in8",
    kind: "module",
    file: "modules/tft-st7735-1in8.svg",
    caption: "1.8 inch colour TFT board with an 8-pin header along the top edge",
    title: "TFT ST7735 1.8 inch (SPI), front view",
    comment: [
      "1.8 inch ST7735 TFT breakout on a red board, front view, about 6 units per mm. The microSD slot is on the back and not drawn.",
      "8-pin header on one short edge. The printed order varies by seller; drawn here left to right VCC, GND, CS, RESET, A0 (DC), SDA (MOSI), SCK, LED (backlight), matching the catalog order. Check your own silkscreen.",
    ],
    width: 220,
    height: 352,
    body,
    terminals: hdr.terminals,
    pinExit: { dx: 0, dy: -1 },
  };
}

function st7789() {
  // 1.3 inch 240x240 on a black board; the 8th pad (CS) is the optional one found on some boards.
  const pitch = 15;
  const x0 = 95 - (pitch * 6) / 2 - 8;
  const hdr = rowHeader({
    pins: [
      { label: "GND", id: "GND" },
      { label: "VCC", id: "VCC" },
      { label: "SCL", id: "SCL" },
      { label: "SDA", id: "SDA" },
      { label: "RES", id: "RES" },
      { label: "DC", id: "DC" },
      { label: "BLK", id: "BLK" },
    ],
    x: x0,
    y: 30,
    pitch,
    dir: "x",
    side: "below",
    r: 5,
  });
  const csX = r1(x0 + pitch * 7);
  const body = [
    pcb(8, 8, 190, 262, "#1b1e24", "#0a0b0e"),
    holeMount(20, 20, 3.5),
    holeMount(186, 20, 3.5),
    hdr.svg,
    `  <rect x="${csX - 6}" y="24" width="12" height="12" rx="2" fill="#d9b44a" stroke="#a07d1c" stroke-width="0.8"/>`,
    `  <circle class="hole" cx="${csX}" cy="30" r="3"/>`,
    `  <text class="pinlbl muted" x="${csX}" y="44" transform="rotate(90 ${csX} 44)" dy="3" font-size="7.5">CS</text>`,
    `  <rect x="16" y="78" width="166" height="184" rx="3" fill="#0d0d10" stroke="#000" stroke-width="1.5"/>`,
    `  <rect x="29" y="92" width="140" height="140" fill="#0a1626" stroke="#1d2a3d" stroke-width="1"/>`,
    shine(29, 92, 140, 140),
    text(99, 250, "1.3 IPS 240x240", { size: 7, fill: "#9aa3b2" }),
  ].join("\n");
  return {
    id: "module.tft.st7789.240x240",
    kind: "module",
    file: "modules/tft-st7789-240x240.svg",
    caption: "Small square 240x240 colour TFT board with a 7-pin header",
    title: "TFT ST7789 240x240 (SPI), front view",
    comment: [
      "1.3 inch ST7789 IPS breakout, about 27 x 33 mm black board, about 7 units per mm.",
      "7-pin header along the top: GND, VCC, SCL, SDA, RES, DC, BLK. The CS pad exists only on some boards; it is drawn as an extra solder pad after BLK.",
    ],
    width: 206,
    height: 278,
    body,
    terminals: { ...hdr.terminals, CS: { x: csX, y: 30 } },
    pinExit: { dx: 0, dy: -1 },
  };
}

/** E-paper panel (portrait) with its flexible tail folded to a small adapter board. */
function epaper({ id, slug, inch, res, s, outW, outH, actW, actH, offX, offY }) {
  const m = 10;
  const pw = Math.round(outW * s);
  const ph = Math.round(outH * s);
  const aw = Math.round(actW * s);
  const ah = Math.round(actH * s);
  const ax = m + Math.round(offX * s);
  const ay = m + Math.round(offY * s);
  const tw = Math.round(pw * 0.6);
  const tx = m + Math.round((pw - tw) / 2);
  const bw = pw;
  const bh = 104;
  const by = m + ph + 16;
  const width = pw + 2 * m;
  const height = by + bh + m;
  const pins = ["VCC", "GND", "DIN", "CLK", "CS", "DC", "RST", "BUSY"].map((p) => ({ label: p, id: p }));
  const pitch = 14;
  const hdr = rowHeader({
    pins,
    x: m + bw / 2 - (pitch * 7) / 2,
    y: by + bh - 15,
    pitch,
    dir: "x",
    side: "above",
    r: 5,
  });
  const cx = m + bw / 2;
  const bars = [0.22, 0.4, 0.58]
    .map((f, i) => `  <rect x="${ax + 14}" y="${r1(ay + ah * f)}" width="${r1((aw - 28) * (i === 1 ? 0.62 : 0.85))}" height="${Math.max(5, r1(ah * 0.045))}" fill="#6d6d68" opacity="0.55"/>`)
    .join("\n");
  const body = [
    // flexible tail runs from under the panel edge to the connector on the adapter board
    `  <rect x="${tx}" y="${m + ph - 10}" width="${tw}" height="${by + 22 - (m + ph - 10)}" fill="#d9962b" stroke="#a86d12" stroke-width="1"/>`,
    ...Array.from({ length: 8 }, (_, i) => `  <rect x="${r1(tx + 6 + i * ((tw - 12) / 8))}" y="${by - 2}" width="${r1(((tw - 12) / 8) * 0.55)}" height="16" fill="#f2c75c"/>`),
    // panel
    `  <rect x="${m}" y="${m}" width="${pw}" height="${ph}" rx="3" fill="#e9e7df" stroke="#a7a498" stroke-width="1.5"/>`,
    `  <rect x="${ax - 3}" y="${ay - 3}" width="${aw + 6}" height="${ah + 6}" fill="#cfccc2"/>`,
    `  <rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" fill="#f4f3ee" stroke="#3a3a37" stroke-width="1"/>`,
    bars,
    `  <circle cx="${ax + aw - 26}" cy="${ay + 24}" r="9" fill="#2a2a28" opacity="0.7"/>`,
    text(cx, m + ph - 8, `${inch} inch e-Paper`, { size: 6.5, fill: "#6e6b60" }),
    // adapter board
    pcb(m, by, bw, bh, "#1565c0", "#0b3d82", 4),
    holeMount(m + 11, by + 12, 3),
    holeMount(m + bw - 11, by + 12, 3),
    `  <rect x="${tx - 4}" y="${by + 8}" width="${tw + 8}" height="13" rx="1.5" fill="#1b1b1b" stroke="#000"/>`,
    `  <rect x="${tx - 1}" y="${by + 8}" width="${tw + 2}" height="5" fill="#e7e2d3"/>`,
    smdPart(m + 20, by + 30), smdPart(m + 32, by + 30), smdPart(m + 44, by + 30),
    `  <rect x="${m + bw - 54}" y="${by + 27}" width="16" height="14" rx="1.5" fill="#222" stroke="#000"/>`,
    smdPart(m + bw - 32, by + 30), smdPart(m + bw - 22, by + 30, 5, 8),
    `  <rect x="${cx - 12}" y="${by + 28}" width="7" height="7" rx="1" fill="#444"/>`,
    hdr.svg,
  ].join("\n");
  return {
    id,
    kind: "module",
    file: `modules/${slug}.svg`,
    caption: `${inch} inch e-paper panel with a flat ribbon tail and a small SPI breakout board`,
    title: `E-paper ${inch} inch ${res} (SPI), front view`,
    comment: [
      `${inch} inch e-paper panel (${res}) drawn portrait, with the amber flexible tail running to a small adapter board.`,
      "Adapter board: FPC connector, DC/DC inductor and passives, 8-pin header along the bottom edge in the usual order VCC, GND, DIN, CLK, CS, DC, RST, BUSY.",
      "On the real module the tail folds the board behind the panel; it is shown below it so the header is visible.",
    ],
    width,
    height,
    body,
    terminals: hdr.terminals,
    pinExit: { dx: 0, dy: 1 },
  };
}

function tm1637() {
  const bx = 8;
  const by = 8;
  const bw = 298;
  const bh = 168;
  const hdr = rowHeader({
    pins: [
      { label: "CLK", id: "CLK" },
      { label: "DIO", id: "DIO" },
      { label: "VCC", id: "VCC" },
      { label: "GND", id: "GND" },
    ],
    x: bx + 14,
    y: by + bh / 2 - 27,
    pitch: 18,
    dir: "y",
    side: "right",
  });
  const cy = by + bh / 2;
  const dx = [82, 130, 194, 242];
  const vals = [1, 2, 3, 4];
  const digits = dx.map((x, i) => sevenSeg(x, cy - 44, 40, 88, 8, vals[i])).join("\n");
  const body = [
    pcb(bx, by, bw, bh, "#1a1d21", "#08090b"),
    holeMount(bx + 12, by + 12, 3.5),
    holeMount(bx + bw - 12, by + 12, 3.5),
    holeMount(bx + 12, by + bh - 12, 3.5),
    holeMount(bx + bw - 12, by + bh - 12, 3.5),
    hdr.svg,
    `  <rect x="70" y="${cy - 56}" width="222" height="112" rx="3" fill="#0e0707" stroke="#000" stroke-width="1.5"/>`,
    digits,
    `  <circle cx="181" cy="${cy - 16}" r="3.6" fill="#ff4d3d"/>`,
    `  <circle cx="181" cy="${cy + 16}" r="3.6" fill="#ff4d3d"/>`,
  ].join("\n");
  return {
    id: "module.tm1637.4digit",
    kind: "module",
    file: "modules/tm1637-4digit.svg",
    caption: "4-digit red 7-segment board with a 4-pin header",
    title: "TM1637 4-digit 7-segment display, front view",
    comment: [
      "TM1637 4-digit display with colon (clock version), about 42 x 24 mm black board, about 7 units per mm. The TM1637 chip is on the back.",
      "4-pin header on the left edge, top to bottom CLK, DIO, VCC (printed 5V on many boards), GND.",
    ],
    width: 314,
    height: 184,
    body,
    terminals: hdr.terminals,
    pinExit: { dx: -1, dy: 0 },
  };
}

function max7219Matrix() {
  const bx = 8;
  const by = 8;
  const bw = 316;
  const bh = 204;
  const cy = by + bh / 2;
  const left = rowHeader({
    pins: [
      { label: "VCC", id: "VCC" },
      { label: "GND", id: "GND" },
      { label: "DIN", id: "DIN" },
      { label: "CS", id: "CS" },
      { label: "CLK", id: "CLK" },
    ],
    x: bx + 16,
    y: cy - 36,
    pitch: 18,
    dir: "y",
    side: "right",
  });
  const right = rowHeader({
    pins: [
      { label: "VCC" },
      { label: "GND" },
      { label: "DOUT", id: "DOUT" },
      { label: "CS" },
      { label: "CLK" },
    ],
    x: bx + bw - 16,
    y: cy - 36,
    pitch: 18,
    dir: "y",
    side: "left",
  });
  const mx = 72;
  const my = by + 7;
  const ms = 190;
  const pat = ["00111100", "01000010", "10100101", "10000001", "10100101", "10011001", "01000010", "00111100"];
  const dots = [];
  const p = ms / 8;
  pat.forEach((row, r) =>
    [...row].forEach((c, k) => {
      dots.push(`  <circle cx="${r1(mx + p * (k + 0.5))}" cy="${r1(my + p * (r + 0.5))}" r="7.5" fill="${c === "1" ? "#ff3b30" : "#3a1414"}"/>`);
    }),
  );
  const body = [
    pcb(bx, by, bw, bh, "#1b5e20", "#0d3b12"),
    holeMount(bx + 16, by + 14, 3.5),
    holeMount(bx + 16, by + bh - 14, 3.5),
    holeMount(bx + bw - 16, by + 14, 3.5),
    holeMount(bx + bw - 16, by + bh - 14, 3.5),
    left.svg,
    right.svg,
    text(bx + 16, by + 14 + 14, "IN", { size: 7 }),
    text(bx + bw - 16, by + bh - 14 - 8, "OUT", { size: 7 }),
    `  <rect x="${mx}" y="${my}" width="${ms}" height="${ms}" rx="2" fill="#0b0707" stroke="#000" stroke-width="1.5"/>`,
    dots.join("\n"),
  ].join("\n");
  return {
    id: "module.max7219.matrix8x8",
    kind: "module",
    file: "modules/max7219-matrix8x8.svg",
    caption: "8x8 red LED matrix on a green board with a 5-pin header on each side",
    title: "MAX7219 8x8 LED matrix module, front view",
    comment: [
      "Single MAX7219 8x8 module, 32 mm matrix on a green board; the MAX7219 chip and resistor are on the back.",
      "Input header (left): VCC, GND, DIN, CS, CLK. Output header (right): VCC, GND, DOUT, CS, CLK for chaining; only DOUT is a catalog pin. Boards are also sold in blue.",
    ],
    width: 332,
    height: 220,
    body,
    terminals: { ...left.terminals, ...right.terminals },
  };
}

function max7219Seg8() {
  const bx = 8;
  const by = 8;
  const bw = 344;
  const bh = 90;
  const cy = by + bh / 2;
  const left = rowHeader({
    pins: [
      { label: "VCC", id: "VCC" },
      { label: "GND", id: "GND" },
      { label: "DIN", id: "DIN" },
      { label: "CS", id: "CS" },
      { label: "CLK", id: "CLK" },
    ],
    x: bx + 12,
    y: cy - 24,
    pitch: 12,
    dir: "y",
    side: "right",
    r: 4.5,
  });
  const right = rowHeader({
    pins: [
      { label: "VCC" },
      { label: "GND" },
      { label: "DOUT", id: "DOUT" },
      { label: "CS" },
      { label: "CLK" },
    ],
    x: bx + bw - 12,
    y: cy - 24,
    pitch: 12,
    dir: "y",
    side: "left",
    r: 4.5,
  });
  const digits = [];
  const vals = [1, 2, 3, 4, 5, 6, 7, 8];
  [60, 184].forEach((bx0, blk) => {
    for (let i = 0; i < 4; i++) digits.push(sevenSeg(bx0 + 7 + i * 27, cy - 28, 21, 56, 5.5, vals[blk * 4 + i]));
  });
  const body = [
    pcb(bx, by, bw, bh, "#0d47a1", "#082f6b", 5),
    left.svg,
    right.svg,
    `  <rect x="60" y="${cy - 33}" width="116" height="66" rx="2" fill="#0e0707" stroke="#000" stroke-width="1.2"/>`,
    `  <rect x="184" y="${cy - 33}" width="116" height="66" rx="2" fill="#0e0707" stroke="#000" stroke-width="1.2"/>`,
    digits.join("\n"),
  ].join("\n");
  return {
    id: "module.max7219.7segment8",
    kind: "module",
    file: "modules/max7219-7segment8.svg",
    caption: "Long board with eight red 7-segment digits and a 5-pin header",
    title: "MAX7219 8-digit 7-segment display, front view",
    comment: [
      "8-digit MAX7219 module as two 4-digit blocks on a blue board; the MAX7219 chip is on the back. Header proportions are stretched a little so the labels fit.",
      "Input header on the left end: VCC, GND, DIN, CS, CLK. Output header on the right end: VCC, GND, DOUT, CS, CLK. Some sellers put the input on a long edge instead; check yours.",
    ],
    width: 360,
    height: 106,
    body,
    terminals: { ...left.terminals, ...right.terminals },
  };
}

function st7920() {
  const pins = [
    "GND", "VCC", "V0", "RS", "RW", "E", "DB0", "DB1", "DB2", "DB3", "DB4", "DB5", "DB6", "DB7", "PSB", "NC", "RST", "VOUT", "BLA", "BLK",
  ];
  const ids = { GND: "GND", VCC: "VCC", V0: "V0", RS: "RS", RW: "RW", E: "E", PSB: "PSB", RST: "RST", BLA: "BLA", BLK: "BLK" };
  const pitch = 9.2;
  const hdr = rowHeader({
    pins: pins.map((p) => ({ label: p, id: ids[p], muted: !ids[p] })),
    x: 175 - (pitch * 19) / 2,
    y: 24,
    pitch,
    dir: "x",
    side: "below",
    r: 3.4,
  });
  const body = [
    pcb(8, 8, 335, 252, "#2e7d32", "#1b5e20", 4),
    holeMount(20, 20, 3.5),
    holeMount(331, 20, 3.5),
    holeMount(20, 248, 3.5),
    holeMount(331, 248, 3.5),
    hdr.svg,
    // contrast trimmer next to the header
    `  <rect x="296" y="34" width="20" height="14" rx="1.5" fill="#1565c0" stroke="#0b3d82"/>`,
    `  <circle cx="306" cy="41" r="4" fill="#cfd8dc" stroke="#546e7a"/>`,
    text(306, 58, "V0", { size: 6.5 }),
    // metal bezel, glass and lit area
    `  <rect x="40" y="76" width="271" height="170" rx="2" fill="#9aa0a6" stroke="#5f6368" stroke-width="1.2"/>`,
    `  <rect x="52" y="86" width="247" height="150" fill="#2b2f21" stroke="#15170f"/>`,
    `  <rect x="68" y="100" width="215" height="108" fill="#c3d14a" stroke="#6f7a1c" stroke-width="1"/>`,
    `  <text x="175" y="146" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="20" fill="#2a3008" opacity="0.85">128 x 64</text>`,
    `  <text x="175" y="170" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" fill="#2a3008" opacity="0.7">ST7920</text>`,
    shine(68, 100, 215, 108),
  ].join("\n");
  return {
    id: "module.lcd.st7920.12864",
    kind: "module",
    file: "modules/lcd-st7920-12864.svg",
    caption: "128x64 graphic LCD board with a 20-pin header along the top",
    title: "Graphic LCD 128x64 ST7920, front view",
    comment: [
      "12864 ST7920 LCD, about 93 x 70 mm green board with yellow-green glass, about 3.6 units per mm.",
      "20-pin header along the top, pin 1 at the left: GND, VCC, V0, RS, R/W, E, DB0-DB7, PSB, NC, RST, VOUT, BLA, BLK. DB0-DB7, NC and VOUT are drawn but not wired in serial mode. Blue-backlit versions use a blue board.",
    ],
    width: 351,
    height: 268,
    body,
    terminals: hdr.terminals,
    pinExit: { dx: 0, dy: -1 },
  };
}

const ep = (o) => () => epaper(o);

const drawings = [
  ssd1306,
  sh1106,
  st7735,
  st7789,
  ep({ id: "module.epaper.1in54", slug: "epaper-1in54", inch: "1.54", res: "200x200", s: 5.5, outW: 31.8, outH: 37.3, actW: 27.6, actH: 27.6, offX: 2.1, offY: 2.4 }),
  ep({ id: "module.epaper.2in13", slug: "epaper-2in13", inch: "2.13", res: "250x122", s: 5, outW: 29.2, outH: 59.2, actW: 23.8, actH: 48.55, offX: 2.7, offY: 2.5 }),
  ep({ id: "module.epaper.2in9", slug: "epaper-2in9", inch: "2.9", res: "296x128", s: 4.5, outW: 36.7, outH: 79, actW: 29.1, actH: 66.9, offX: 3.8, offY: 2.5 }),
  ep({ id: "module.epaper.4in2", slug: "epaper-4in2", inch: "4.2", res: "400x300", s: 3.8, outW: 77, outH: 91, actW: 63.6, actH: 84.8, offX: 6.7, offY: 3 }),
  tm1637,
  max7219Matrix,
  max7219Seg8,
  st7920,
];

export default drawings;
