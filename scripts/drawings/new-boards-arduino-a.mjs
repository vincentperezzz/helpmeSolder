// New boards, group arduino-a: Arduino UNO R4 Minima, UNO R4 WiFi, Arduino Due.
import { holeMount, esc, r1 } from "./_lib.mjs";

const GOLD = "#d9b44a";
const GOLD_D = "#a07d1c";
const mono = `font-family="ui-monospace, monospace"`;
const TEAL = "#00838f";
const TEAL_D = "#005b64";

const kindOf = (l) =>
  /^(GND|G|AGND)$/i.test(l) ? "gnd" : /^(5V|VBUS|VIN|VSYS|VUSB|RAW|VCC)$/i.test(l) ? "pwr" : /^(3V3|3\.3|3V|3\.3V)$/i.test(l) ? "v3" : "";
const holeCls = (l) => `hole${kindOf(l) ? " " + kindOf(l) : ""}`;

const T = (x, y, s, { fs = 7, fill = "#eceff1", anchor = "middle", rot = 0, bold = false } = {}) =>
  `  <text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" ${mono} font-size="${fs}" fill="${fill}"${bold ? ` font-weight="bold"` : ""}${rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : ""}>${esc(s)}</text>`;

function mk() {
  const out = [];
  const terminals = {};
  const pin = (x, y, label, id, o = {}) => {
    const { r = 4.3, lbl = "right", gap = 11, fs = 7, muted = false } = o;
    out.push(`  <circle class="${holeCls(label)}" cx="${r1(x)}" cy="${r1(y)}" r="${r}"/>`);
    const f = muted ? "#90a4ae" : "#eceff1";
    if (lbl === "right") out.push(T(x + gap, y + fs * 0.4, label, { fs, anchor: "start", fill: f }));
    else if (lbl === "left") out.push(T(x - gap, y + fs * 0.4, label, { fs, anchor: "end", fill: f }));
    else if (lbl === "down") out.push(`  <text x="${r1(x)}" y="${r1(y + gap)}" transform="rotate(90 ${r1(x)} ${r1(y + gap)})" dy="${r1(fs * 0.4)}" ${mono} font-size="${fs}" fill="${f}">${esc(label)}</text>`);
    else if (lbl === "up") out.push(`  <text x="${r1(x)}" y="${r1(y - gap)}" transform="rotate(-90 ${r1(x)} ${r1(y - gap)})" dy="${r1(fs * 0.4)}" ${mono} font-size="${fs}" fill="${f}">${esc(label)}</text>`);
    else if (lbl === "above") out.push(T(x, y - gap, label, { fs, fill: f }));
    else if (lbl === "below") out.push(T(x, y + gap, label, { fs, fill: f }));
    for (const i of [].concat(id ?? [])) terminals[i] = { x: r1(x), y: r1(y) };
  };
  return { out, terminals, pin };
}

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

const crystal = (cx, cy, w, h, label) =>
  [
    `  <rect x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${w}" height="${h}" rx="${r1(Math.min(w, h) / 2.4)}" fill="#cfd8dc" stroke="#78909c" stroke-width="1"/>`,
    `  <rect x="${r1(cx - w / 2 + 3)}" y="${r1(cy - h / 2 + 3)}" width="${r1(w - 6)}" height="${r1(h - 6)}" rx="1.5" fill="#b0bec5"/>`,
    label ? T(cx, cy + 2, label, { fs: 5.5, fill: "#263238" }) : "",
  ].join("\n");

/** Header plastic + dots with no label/terminal. */
function dotRow(x, y, n, pitch, dir = "x", { r = 3.6 } = {}) {
  const out = [];
  if (dir === "x") out.push(rect(x - 9, y - 9, pitch * (n - 1) + 18, 18, "#1b1b1b", { rx: 2 }));
  else out.push(rect(x - 9, y - 9, 18, pitch * (n - 1) + 18, "#1b1b1b", { rx: 2 }));
  for (let i = 0; i < n; i++) {
    const px = dir === "x" ? x + i * pitch : x;
    const py = dir === "x" ? y : y + i * pitch;
    out.push(`  <circle cx="${r1(px)}" cy="${r1(py)}" r="${r}" fill="${GOLD}"/>`);
  }
  return out.join("\n");
}

/** Micro-USB shell, mouth facing `dir`, centred on the edge point (cx, cy). */
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

/** USB-C receptacle on the left edge of a board (mouth faces left), centred at (edgeX, cy). */
function usbCLeft(edgeX, cy) {
  return [
    `  <rect x="${edgeX - 9}" y="${cy - 19}" width="40" height="38" rx="3" fill="#cfd8dc" stroke="#607d8b" stroke-width="1.2"/>`,
    `  <rect x="${edgeX - 7}" y="${cy - 8}" width="24" height="16" rx="8" fill="#263238"/>`,
    `  <rect x="${edgeX - 3}" y="${cy - 1.5}" width="16" height="3" rx="1.5" fill="#78909c"/>`,
    `  <rect x="${edgeX + 20}" y="${cy - 14}" width="9" height="28" rx="1" fill="#b0bec5"/>`,
  ].join("\n");
}

const doc = (d) => ({ kind: "board", ...d });

// ============================================================ Uno-shaped R4 boards

function unoR4({ wifi }) {
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
    rows.push(rect(x - 9, y - 9, 12.7 * (pins.length - 1) + 18, 18, "#1b1b1b", { rx: 2 }));
    pins.forEach(([label, id], i) => m.pin(x + i * 12.7, y, label, id, { lbl: side === "top" ? "down" : "up" }));
  };
  const topA = [["SCL", "SCL"], ["SDA", "SDA"], ["AREF"], ["GND", "GND.3"], ["D13", "D13"], ["D12", "D12"], ["D11", "D11"], ["D10", "D10"], ["D9", "D9"], ["D8", "D8"]];
  const topB = [["D7", "D7"], ["D6", "D6"], ["D5", "D5"], ["D4", "D4"], ["D3", "D3"], ["D2", "D2"], ["D1", "D1"], ["D0", "D0"]];
  const botP = [["NC"], ["IOREF"], ["RESET"], ["3V3", "3V3"], ["5V", "5V"], ["GND", "GND.1"], ["GND", "GND.2"], ["VIN", "VIN"]];
  const botA = [["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]];
  rh(topA, hx(0.7), topY, "top");
  rh(topB, hx(1.8), topY, "top");
  rh(botP, hx(1.0), botY, "bot");
  rh(botA, hx(1.9), botY, "bot");

  const decor = [
    rect(bx, by, bw, bh, TEAL, { rx: 8, stroke: TEAL_D, sw: 2 }),
    holeMount(bx + 76, by + 13, 6),
    holeMount(bx + 316, by + 89, 6),
    holeMount(bx + 316, by + 229, 6),
    holeMount(bx + 70, by + bh - 12, 6),
    ...rows,
    usbCLeft(bx, 104),
    T(bx + 28, 144, "USB-C", { fs: 5.5, fill: "#cfd8dc" }),
    tact(62, 50),
    T(62, 68, "RESET", { fs: 6 }),
    // DC jack
    rect(bx - 10, by + bh - 86, 76, 46, "#212121", { rx: 3, stroke: "#000" }),
    rect(bx - 6, by + bh - 82, 30, 38, "#37474f", { rx: 2 }),
    `  <circle cx="${bx + 40}" cy="${by + bh - 63}" r="9" fill="#111" stroke="#455a64"/>`,
    `  <circle cx="${bx + 40}" cy="${by + bh - 63}" r="3" fill="#78909c"/>`,
    T(bx + 55, by + bh - 76, "DC", { fs: 6, fill: "#90a4ae" }),
    // regulator and caps
    `  <rect class="chip" x="92" y="148" width="20" height="14" rx="1.5"/>`,
    rect(112, 151, 6, 8, "#1a1a1a"),
    smdc(92, 168, 8, 5),
    smdc(104, 168, 8, 5),
    smdc(92, 176, 8, 5),
  ];

  if (!wifi) {
    decor.push(
      crystal(132, 150, 18, 40, "16.000"),
      qfp(200, 150, 62, "RA4M1", { n: 12, fs: 7, sub: "R7FA4M1AB3CFM" }),
      // ICSP 2x3 and SWD pads
      dotRow(322, 130, 3, 13, "y"),
      dotRow(335, 130, 3, 13, "y"),
      T(329, 123, "ICSP", { fs: 6, fill: "#b0bec5" }),
      ledS(262, 100, "#ffb74d"),
      ledS(262, 112, "#ffb74d"),
      ledS(262, 124, "#ffb74d"),
      T(273, 102, "TX", { fs: 5.5, anchor: "start" }),
      T(273, 114, "RX", { fs: 5.5, anchor: "start" }),
      T(273, 126, "L", { fs: 5.5, anchor: "start" }),
      ledS(262, 205, "#66bb6a"),
      T(273, 207, "ON", { fs: 5.5, anchor: "start" }),
      T(200, 214, "UNO R4", { fs: 13, bold: true }),
      T(200, 226, "MINIMA", { fs: 8, fill: "#b2ebf2" }),
    );
  } else {
    // 12 x 8 red LED matrix
    const mx = 120;
    const my = 82;
    const pitch = 8;
    decor.push(rect(mx - 6, my - 6, pitch * 11 + 12, pitch * 7 + 12, "#0b2c30", { rx: 3, stroke: "#003f46" }));
    for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
      decor.push(`  <circle cx="${mx + c * pitch}" cy="${my + r * pitch}" r="2.4" fill="${(r + c) % 5 === 0 ? "#ff5252" : "#b71c1c"}"/>`);
    }
    decor.push(
      crystal(118, 190, 38, 14, "16.000"),
      qfp(170, 195, 56, "RA4M1", { n: 12, fs: 7 }),
      // ESP32-S3-MINI-1 module: shield can plus antenna area
      rect(230, 120, 78, 26, "#2e7d32", { rx: 2, stroke: "#1b5e20" }),
      `  <path d="M238 140H250V128H262V140H274V128H286V140H298" fill="none" stroke="${GOLD}" stroke-width="2"/>`,
      rect(230, 146, 78, 78, "#cfd8dc", { rx: 2, stroke: "#78909c", sw: 1.2 }),
      rect(236, 152, 66, 66, "#b0bec5", { rx: 1.5 }),
      T(269, 182, "ESP32-S3", { fs: 8, fill: "#263238", bold: true }),
      T(269, 193, "MINI-1", { fs: 7, fill: "#263238" }),
      T(269, 134, "", { fs: 5 }),
      // ICSP, Qwiic
      dotRow(322, 130, 3, 13, "y"),
      dotRow(335, 130, 3, 13, "y"),
      T(329, 123, "ICSP", { fs: 6, fill: "#b0bec5" }),
      rect(bx + bw - 22, 172, 26, 34, "#f5f5f5", { rx: 2, stroke: "#9e9e9e" }),
      ...[0, 1, 2, 3].map((i) => `  <rect x="${bx + bw - 14}" y="${178 + i * 7}" width="12" height="3.4" fill="#b0bec5"/>`),
      T(bx + bw - 30, 190, "QWIIC", { fs: 5.5, anchor: "end", fill: "#cfd8dc" }),
      // LEDs
      ledS(232, 90, "#ffb74d"),
      ledS(232, 101, "#ffb74d"),
      ledS(232, 112, "#ffb74d"),
      T(242, 92, "TX", { fs: 5.5, anchor: "start" }),
      T(242, 103, "RX", { fs: 5.5, anchor: "start" }),
      T(242, 114, "L", { fs: 5.5, anchor: "start" }),
      ledS(96, 226, "#66bb6a"),
      T(106, 228, "ON", { fs: 5.5, anchor: "start" }),
      T(170, 157, "UNO R4 WiFi", { fs: 9, bold: true }),
    );
  }
  return doc({
    id: wifi ? "board.arduino.uno.r4.wifi" : "board.arduino.uno.r4.minima",
    file: wifi ? "boards/arduino-uno-r4-wifi.svg" : "boards/arduino-uno-r4-minima.svg",
    caption: wifi ? "Arduino UNO R4 WiFi" : "Arduino UNO R4 Minima",
    title: `${wifi ? "Arduino UNO R4 WiFi" : "Arduino UNO R4 Minima"} top view (original simplified drawing, CC0)`,
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Uno-shaped teal board: USB-C and DC jack on the left edge, digital header (SCL SDA AREF GND D13..D8 / D7..D0) along the top,",
      "power header (NC IOREF RESET 3V3 5V GND GND VIN) and analog header A0-A5 along the bottom, Renesas RA4M1 in the middle.",
      "The SCL/SDA holes next to AREF are separate catalog pins (same nets as A5/A4).",
      ...(wifi
        ? [
            "R4 WiFi: 12x8 red LED matrix, ESP32-S3-MINI-1 module with antenna strip and the white Qwiic connector.",
            "Exact placement of the ESP32 module and Qwiic connector is approximate; check against the board.",
          ]
        : []),
    ],
    width,
    height,
    body: decor.join("\n") + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

// ============================================================ Arduino Due (drawn standing up, USB at the top)

function due() {
  const width = 300;
  const height = 552;
  const bx = 16;
  const by = 28;
  const bw = 267;
  const bh = 508;
  const m = mk();
  const U = (inch) => by + inch * 127;
  const rightX = bx + bw - 13; // original top edge
  const leftX = bx + 13; // original bottom edge
  const rows = [];
  const col = (pins, x, u0, side) => {
    rows.push(rect(x - 9, U(u0) - 9, 18, 12.7 * (pins.length - 1) + 18, "#1b1b1b", { rx: 2 }));
    pins.forEach(([label, id], i) => m.pin(x, U(u0) + i * 12.7, label, id, { lbl: side === "right" ? "left" : "right" }));
  };
  // right edge (original top): SCL1 SDA1 AREF GND D13..D8 | D7..D0 | D14(TX3)..D21
  col([["SCL1", "SCL1"], ["SDA1", "SDA1"], ["AREF"], ["GND", "GND.3"], ["13", "D13"], ["12", "D12"], ["11", "D11"], ["10", "D10"], ["9", "D9"], ["8", "D8"]], rightX, 0.7, "right");
  col([["7", "D7"], ["6", "D6"], ["5", "D5"], ["4", "D4"], ["3", "D3"], ["2", "D2"], ["1 TX0", "D1"], ["0 RX0", "D0"]], rightX, 1.8, "right");
  col([["14 TX3", "D14"], ["15 RX3", "D15"], ["16 TX2", "D16"], ["17 RX2", "D17"], ["18 TX1", "D18"], ["19 RX1", "D19"], ["20 SDA", "D20"], ["21 SCL", "D21"]], rightX, 2.7, "right");
  // left edge (original bottom): power, A0-A7, A8-A11 DAC0 DAC1 CANRX CANTX
  col([["NC"], ["IOREF"], ["RESET"], ["3V3", "3V3"], ["5V", "5V"], ["GND", "GND.1"], ["GND", "GND.2"], ["VIN", "VIN"]], leftX, 1.0, "left");
  col([["A0", "A0"], ["A1", "A1"], ["A2", "A2"], ["A3", "A3"], ["A4", "A4"], ["A5", "A5"], ["A6", "A6"], ["A7", "A7"]], leftX, 1.9, "left");
  col([["A8", "A8"], ["A9", "A9"], ["A10", "A10"], ["A11", "A11"], ["DAC0", "DAC0"], ["DAC1", "DAC1"], ["CANRX", "CANRX"], ["CANTX", "CANTX"]], leftX, 2.8, "left");

  // 2 x 18 block at the far end: inner row even pins, outer row odd pins; 5V at the right end, GND at the left end
  const rowIn = U(3.72);
  const rowOut = U(3.82);
  const xs = (i) => rightX - 12.7 * 0.0 - i * 12.7 - 12.7 * 0; // i = 0 (5V) at the right
  const blockLeft = xs(17) - 9;
  rows.push(rect(blockLeft, rowIn - 9, rightX - blockLeft + 9, rowOut - rowIn + 18, "#1b1b1b", { rx: 2 }));
  for (let i = 0; i < 18; i++) {
    const x = xs(i);
    const evenLbl = i === 0 ? "5V" : i === 17 ? "GND" : String(22 + (i - 1) * 2);
    const oddLbl = i === 0 ? "5V" : i === 17 ? "GND" : String(23 + (i - 1) * 2);
    const evenId = i === 17 ? "GND.4" : i > 0 ? `D${22 + (i - 1) * 2}` : undefined;
    const oddId = i > 0 && i < 17 ? `D${23 + (i - 1) * 2}` : undefined;
    m.pin(x, rowIn, evenLbl, evenId, { r: 3.9, lbl: "above", gap: 7, fs: 5.5 });
    m.pin(x, rowOut, oddLbl, oddId, { r: 3.9, lbl: "below", gap: 11, fs: 5.5 });
  }

  const px = bx;
  const deco = [
    rect(bx, by, bw, bh, "#006f7a", { rx: 8, stroke: "#004a52", sw: 2 }),
    holeMount(bx + 235, by + 30, 6),
    holeMount(bx + 133, by + 440, 6),
    holeMount(bx + 178, by + 70, 5),
    ...rows,
    // DC jack (top-left), then the Programming and Native micro-USB ports
    rect(px + 12, by - 12, 50, 78, "#212121", { rx: 3, stroke: "#000" }),
    rect(px + 16, by - 8, 42, 30, "#37474f", { rx: 2 }),
    `  <circle cx="${px + 37}" cy="${by + 42}" r="9" fill="#111" stroke="#455a64"/>`,
    `  <circle cx="${px + 37}" cy="${by + 42}" r="3" fill="#78909c"/>`,
    T(px + 37, by + 82, "DC IN", { fs: 5.5, fill: "#cfd8dc" }),
    microUsb(px + 112, by + 2, "up", { w: 40, out: 10, inn: 26 }),
    microUsb(px + 188, by + 2, "up", { w: 40, out: 10, inn: 26 }),
    T(px + 112, by + 40, "PROGRAMMING", { fs: 5.2, fill: "#cfd8dc" }),
    T(px + 188, by + 40, "NATIVE", { fs: 5.2, fill: "#cfd8dc" }),
    // buttons
    tact(px + 112, by + 66, 14, 12),
    T(px + 112, by + 82, "ERASE", { fs: 5 }),
    tact(px + 150, by + 66, 14, 12),
    T(px + 150, by + 82, "RESET", { fs: 5 }),
    // regulators and caps near the jack
    `  <rect class="chip" x="${px + 24}" y="${by + 104}" width="18" height="14" rx="1.5"/>`,
    `  <rect class="chip" x="${px + 24}" y="${by + 128}" width="18" height="14" rx="1.5"/>`,
    smdc(px + 50, by + 108, 8, 5),
    smdc(px + 50, by + 132, 8, 5),
    // ATmega16U2 USB-serial bridge and its crystal
    qfp(px + 120, by + 125, 30, "16U2", { n: 6, fs: 5.5 }),
    crystal(px + 160, by + 125, 14, 22, "16.00"),
    dotRow(px + 90, by + 168, 3, 11, "x", { r: 3 }),
    dotRow(px + 90, by + 180, 3, 11, "x", { r: 3 }),
    T(px + 101, by + 160, "ICSP", { fs: 5, fill: "#b0bec5" }),
    // status LEDs
    ledS(px + 200, by + 112, "#ffb74d", 7, 4),
    ledS(px + 200, by + 122, "#ffb74d", 7, 4),
    ledS(px + 200, by + 132, "#ffb74d", 7, 4),
    ledS(px + 200, by + 142, "#66bb6a", 7, 4),
    T(px + 208, by + 114, "L", { fs: 4.5, anchor: "start" }),
    T(px + 208, by + 124, "TX", { fs: 4.5, anchor: "start" }),
    T(px + 208, by + 134, "RX", { fs: 4.5, anchor: "start" }),
    T(px + 208, by + 144, "ON", { fs: 4.5, anchor: "start" }),
    // SAM3X8E and its crystals
    qfp(px + 130, by + 270, 100, "SAM3X8E", { n: 24, fs: 9, sub: "ATSAM3X8E-AU" }),
    crystal(px + 130, by + 350, 30, 12, "12.000"),
    crystal(px + 64, by + 250, 10, 22, ""),
    // JTAG and SPI headers
    dotRow(px + 100, by + 388, 5, 8, "x", { r: 2.6 }),
    dotRow(px + 100, by + 398, 5, 8, "x", { r: 2.6 }),
    T(px + 116, by + 380, "JTAG", { fs: 5, fill: "#b0bec5" }),
    dotRow(px + 170, by + 388, 3, 11, "x", { r: 3 }),
    dotRow(px + 170, by + 398, 3, 11, "x", { r: 3 }),
    T(px + 181, by + 380, "SPI", { fs: 5, fill: "#b0bec5" }),
    T(px + 135, by + 420, "DUE", { fs: 20, bold: true }),
    T(px + 135, by + 435, "ARDUINO", { fs: 8, fill: "#b2ebf2" }),
  ].join("\n");
  return doc({
    id: "board.arduino.due",
    file: "boards/arduino-due.svg",
    caption: "Arduino Due",
    title: "Arduino Due top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Mega-shaped teal board drawn standing up (turned 90 degrees clockwise from the usual view): DC jack and the two micro-USB ports",
      "(PROGRAMMING nearest the jack, NATIVE) at the top. Right edge: SCL1 SDA1 AREF GND 13..8, 7..0, 14..21. Left edge: power header,",
      "A0-A7, A8-A11 DAC0 DAC1 CANRX CANTX. The 2 x 18 block of pins 22-53 (5V at one end, GND at the other) runs along the bottom;",
      "evens on the upper row, odds on the lower row (silkscreen order of the real board may differ slightly).",
      "Only one GND (the left end of the block) is wired for that block; the other end pins are drawn without a wire target.",
    ],
    width,
    height,
    body: deco + "\n" + m.out.join("\n"),
    terminals: m.terminals,
  });
}

const drawings = [() => unoR4({ wifi: false }), () => unoR4({ wifi: true }), due];

export default drawings;
