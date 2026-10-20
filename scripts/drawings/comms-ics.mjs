// Communication modules and logic ICs: GPS, Bluetooth, nRF24, LoRa, NFC, RTC, shift register, I2C expanders, ADC, ESP-01.
import { holeClass, esc, r1 } from "./_lib.mjs";
import { rowHeader, chip, smd, led } from "./_helpers.mjs";

/** Text with an inline font size and fill (the shared CSS classes would override attributes). */
const tx = (x, y, s, fs = 7, { anchor = "middle", rot = 0, cls = "label", fill } = {}) =>
  `  <text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" style="font-size:${fs}px${fill ? `;fill:${fill}` : ""}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ""}>${esc(s)}</text>`;
/** Vertical pin label that runs down (below a pin) or up (above a pin) from (x, y). */
const vlab = (x, y, s, down = true, muted = false) =>
  `  <text class="pinlbl${muted ? " muted" : ""}" x="${x}" y="${y}" dy="3" text-anchor="start" style="font-size:7.5px" transform="rotate(${down ? 90 : -90} ${x} ${y})">${esc(s)}</text>`;
const hole = (x, y, label, r = 6) => `  <circle class="${holeClass(label)}" cx="${x}" cy="${y}" r="${r}"/>`;
const board = (x, y, w, h, fill, stroke, rx = 6) => `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const mount = (x, y, r = 4.5) => `  <circle cx="${x}" cy="${y}" r="${r}" fill="#f5f5f5" stroke="#c9a227" stroke-width="2.2"/>`;
const rect = (x, y, w, h, fill, extra = "") => `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const plastic = (x, y, w, h) => `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#1b1b1b"/>`;
const zigzag = (x0, x1, y0, y1, n, stroke = "#d7ccc8", sw = 2) => {
  const step = (y1 - y0) / n;
  let d = `M ${x0} ${y0}`;
  for (let i = 0; i < n; i++) {
    const y = y0 + step * (i + 0.5);
    d += ` L ${i % 2 === 0 ? x1 : x0} ${r1(y0 + step * i)} L ${i % 2 === 0 ? x1 : x0} ${r1(y + step * 0.5)}`;
  }
  return `  <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
};

/** A vertical (top view) DIP chip with terminals at the leg tips. left: top to bottom, right: top to bottom. */
function dipChip({ id, file, caption, title, comment, width, height, name, left, right, pitch, bodyW, tag }) {
  const cx = width / 2;
  const y0 = 40;
  const bx = cx - bodyW / 2;
  const bodyH = (left.length - 1) * pitch + 36;
  const out = [`  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="10" fill="#2b3a42"/>`];
  const terminals = {};
  const leg = (side, p, y) => {
    const tipX = side === "l" ? bx - 12 : bx + bodyW + 12;
    out.push(`  <rect x="${side === "l" ? bx - 14 : bx + bodyW - 1}" y="${y - 3}" width="15" height="6" rx="1" fill="#b0bec5" stroke="#607d8b" stroke-width="0.6"/>`);
    const lx = side === "l" ? tipX - 8 : tipX + 8;
    out.push(tx(lx, y + 2.6, p.label, 7.5, { anchor: side === "l" ? "end" : "start", cls: `pinlbl${p.nc ? " muted" : ""}` }));
    out.push(tx(side === "l" ? bx + 4 : bx + bodyW - 4, y + 2, String(p.n), 5.5, { anchor: side === "l" ? "start" : "end", fill: "#90a4ae" }));
    if (p.id) terminals[p.id] = { x: tipX, y };
  };
  out.push(`  <rect class="chip" x="${bx}" y="${y0 - 18}" width="${bodyW}" height="${bodyH}" rx="3"/>`);
  out.push(`  <path d="M ${cx - 7} ${y0 - 18} A 7 7 0 0 0 ${cx + 7} ${y0 - 18} Z" fill="#2b3a42"/>`);
  out.push(`  <circle cx="${bx + 8}" cy="${y0 - 8}" r="2" fill="#555"/>`);
  left.forEach((p, i) => leg("l", p, y0 + i * pitch));
  right.forEach((p, i) => leg("r", p, y0 + i * pitch));
  out.push(tx(cx - 4, y0 - 18 + bodyH / 2, name, 11, { rot: 90, fill: "#cfd8dc" }));
  out.push(tx(cx + 7, y0 - 18 + bodyH / 2, tag, 5.5, { rot: 90, fill: "#78909c" }));
  return { id, kind: "module", file, caption, title, comment, width, height, body: out.join("\n"), terminals };
}

function neo6m() {
  const width = 200;
  const height = 310;
  const hx = [73, 91, 109, 127];
  const pins = ["VCC", "RX", "TX", "GND"];
  const terminals = {};
  const body = [
    board(10, 10, 180, 290, "#1f4fa8", "#143c80"),
    mount(22, 22),
    mount(178, 22),
    mount(22, 288),
    mount(178, 288),
    plastic(62, 25, 76, 18),
    ...pins.map((p, i) => {
      terminals[p] = { x: hx[i], y: 34 };
      return hole(hx[i], 34, p) + "\n" + vlab(hx[i], 48, p);
    }),
    // u-blox chip, backup battery, EEPROM, status LED
    chip(83, 86, 34, 34, "u-blox 6", { fs: 6.5 }),
    `  <rect x="28" y="90" width="38" height="30" rx="8" fill="#2a2a2a" stroke="#000"/>`,
    tx(47, 108, "BAT", 7),
    `  <rect class="chip" x="132" y="88" width="26" height="14" rx="1.5"/>`,
    tx(145, 98.5, "24C32", 5),
    smd(130, 108, 6, 4),
    smd(140, 108, 6, 4),
    smd(72, 126, 6, 4),
    led(158, 124, "#ef5350", "PPS"),
    tx(100, 136, "GY-GPS6MV2", 7),
    // ceramic patch antenna
    `  <rect x="30" y="142" width="140" height="140" rx="3" fill="#e6d9a8" stroke="#a99455" stroke-width="1.5"/>`,
    `  <rect x="48" y="160" width="104" height="104" rx="2" fill="#f4ecc4" stroke="#c9b777" stroke-width="1"/>`,
    `  <circle cx="82" cy="196" r="3" fill="#8d6e3f"/>`,
  ].join("\n");
  return {
    id: "module.gps.neo6m",
    kind: "module",
    file: "modules/gps-neo6m.svg",
    caption: "GPS NEO-6M module (GY-GPS6MV2, 3-5 V)",
    title: "NEO-6M GPS module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue GY-GPS6MV2 style board: 4-pin header on the short edge, u-blox chip, backup battery, status LED, ceramic patch antenna.",
      "Header left to right: VCC, RX, TX, GND.",
    ],
    width,
    height,
    body,
    terminals,
    pinExit: { dx: 0, dy: -1 },
  };
}

/** HC-05 (6 pins, button) or HC-06 (4 pins + a lone STATE hole), ZS-040 style carrier. */
function hcBoard(variant) {
  const is05 = variant === "05";
  const width = 160;
  const height = 336;
  const slots = [35, 53, 71, 89, 107, 125];
  const terminals = {};
  const parts = [board(10, 10, 140, 316, "#1d7a46", "#0f5230"), mount(22, 22, 3.5), mount(138, 22, 3.5)];
  let pins;
  if (is05) {
    pins = [
      ["STATE", "STATE"],
      ["RXD", "RXD"],
      ["TXD", "TXD"],
      ["GND", "GND"],
      ["VCC", "VCC"],
      ["EN", "EN"],
    ];
    parts.push(plastic(24, 25, 112, 18));
    pins.forEach(([label, id], i) => {
      terminals[id] = { x: slots[i], y: 34 };
      parts.push(hole(slots[i], 34, label), vlab(slots[i], 48, label === "EN" ? "EN/KEY" : label));
    });
    parts.push(
      `  <rect class="btn" x="108" y="96" width="20" height="14" rx="2"/>`,
      `  <circle cx="118" cy="103" r="3.5" fill="#90a4ae"/>`,
      tx(118, 121, "KEY", 6),
    );
  } else {
    pins = [
      ["VCC", "VCC"],
      ["GND", "GND"],
      ["TXD", "TXD"],
      ["RXD", "RXD"],
    ];
    parts.push(plastic(42, 25, 76, 18));
    pins.forEach(([label, id], i) => {
      const x = slots[i + 1];
      terminals[id] = { x, y: 34 };
      parts.push(hole(x, 34, label), vlab(x, 48, label));
    });
    // STATE is an unpopulated hole on this version
    terminals.STATE = { x: slots[0], y: 34 };
    parts.push(hole(slots[0], 34, "STATE", 5), vlab(slots[0], 48, "STATE", true, true));
  }
  parts.push(
    // radio module on the carrier
    `  <rect x="24" y="130" width="112" height="190" rx="3" fill="#2f8f5c" stroke="#c9a227" stroke-width="1.5"/>`,
    ...Array.from({ length: 6 }, (_, i) => `  <rect x="21" y="${146 + i * 16}" width="6" height="8" fill="#d9b44a"/><rect x="133" y="${146 + i * 16}" width="6" height="8" fill="#d9b44a"/>`),
    `  <rect class="metal" x="40" y="146" width="80" height="92" rx="2"/>`,
    tx(80, 188, is05 ? "HC-05" : "HC-06", 13, { fill: "#37474f" }),
    tx(80, 204, "Bluetooth", 7, { fill: "#546e7a" }),
    zigzag(46, 114, 252, 306, 9),
    led(40, 245, "#e53935"),
    smd(100, 242, 6, 4),
    tx(80, 316, is05 ? "ZS-040" : "ZS-040", 5.5, { fill: "#a5d6a7" }),
  );
  return {
    id: is05 ? "module.hc05" : "module.hc06",
    kind: "module",
    file: is05 ? "modules/hc05-bluetooth.svg" : "modules/hc06-bluetooth.svg",
    caption: is05 ? "HC-05 Bluetooth serial module (6 pins, 3.3 V logic)" : "HC-06 Bluetooth serial module (4 pins, 3.3 V logic)",
    title: `HC-${variant} Bluetooth module top view (original simplified drawing, CC0)`,
    comment: is05
      ? [
          "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
          "ZS-040 carrier with the silver radio module, KEY button and status LED.",
          "Header left to right: STATE, RXD, TXD, GND, VCC, EN (KEY).",
        ]
      : [
          "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
          "Common 4-pin HC-06 carrier: VCC, GND, TXD, RXD. No button, no EN.",
          "STATE is a separate unpopulated hole on this version, drawn at the left of the header.",
        ],
    width,
    height,
    body: parts.join("\n"),
    terminals,
    pinExit: { dx: 0, dy: -1 },
  };
}

function nrf24() {
  const width = 140;
  const height = 276;
  const xs = [40, 60, 80, 100];
  const inner = ["VCC", "CSN", "MOSI", "IRQ"];
  const outer = ["GND", "CE", "SCK", "MISO"];
  const terminals = {};
  const parts = [
    board(10, 10, 120, 256, "#1b8a4b", "#0f5a30"),
    mount(22, 22, 3.5),
    mount(118, 22, 3.5),
    // PCB trace antenna with its copper-free keepout
    rect(18, 18, 104, 66, "#146b39", `rx="3"`),
    zigzag(30, 108, 26, 78, 9, "#e8d9a0", 2.4),
    // nRF24L01+ QFN chip, 16 MHz crystal and passives
    `  <rect class="chip" x="52" y="104" width="34" height="34" rx="2"/>`,
    `  <circle cx="58" cy="110" r="1.6" fill="#666"/>`,
    tx(69, 123, "nRF24", 6),
    tx(69, 131, "L01+", 6),
    `  <rect class="metal" x="96" y="108" width="16" height="9" rx="1"/>`,
    smd(98, 124, 6, 4),
    smd(106, 124, 6, 4),
    smd(26, 108, 6, 4),
    smd(26, 118, 6, 4),
    smd(36, 150, 6, 4),
    smd(98, 140, 6, 4),
    plastic(29, 187, 82, 44),
  ];
  xs.forEach((x, i) => {
    terminals[inner[i]] = { x, y: 198 };
    terminals[outer[i]] = { x, y: 220 };
    parts.push(hole(x, 198, inner[i]), hole(x, 220, outer[i]), vlab(x, 184, inner[i], false), vlab(x, 234, outer[i], true));
  });
  return {
    id: "module.nrf24l01",
    kind: "module",
    file: "modules/nrf24l01.svg",
    caption: "nRF24L01+ radio module (2.4 GHz, 3.3 V only)",
    title: "nRF24L01+ module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Antenna end up, 2 x 4 header at the bottom edge. Pairs across the header: GND/VCC, CE/CSN, SCK/MOSI, MISO/IRQ.",
      "Bottom (outer) row: GND CE SCK MISO. Inner row: VCC CSN MOSI IRQ.",
    ],
    width,
    height,
    body: parts.join("\n"),
    terminals,
    pinExit: { dx: 0, dy: 1 },
  };
}

function loraSx127x() {
  const width = 200;
  const height = 232;
  const left = [
    ["GND", "GND"],
    ["MISO", "MISO"],
    ["MOSI", "MOSI"],
    ["SCK", "SCK"],
    ["NSS", "NSS"],
    ["RESET", "RST"],
    ["DIO5"],
    ["GND"],
  ];
  const right = [["DIO2"], ["DIO1", "DIO1"], ["DIO0", "DIO0"], ["3.3V", "3V3"], ["DIO4"], ["DIO3"], ["GND"], ["ANT"]];
  const terminals = {};
  const parts = [board(10, 10, 180, 214, "#1f4fa8", "#143c80", 4)];
  const pad = (side, [label, id], i) => {
    const y = 34 + i * 24;
    const x = side === "l" ? 17 : 183;
    parts.push(
      `  <rect x="${side === "l" ? 8 : 174}" y="${y - 8}" width="18" height="16" rx="3" fill="#d9b44a" stroke="#a07d1c" stroke-width="0.8"/>`,
      `  <circle cx="${x}" cy="${y}" r="3.2" fill="#263238"/>`,
      tx(side === "l" ? 32 : 168, y + 3, label, 7.5, { anchor: side === "l" ? "start" : "end", cls: "pinlbl" }),
    );
    if (id) terminals[id] = { x, y };
  };
  left.forEach((p, i) => pad("l", p, i));
  right.forEach((p, i) => pad("r", p, i));
  parts.push(
    `  <rect class="metal" x="64" y="40" width="72" height="104" rx="2"/>`,
    `  <rect x="69" y="45" width="62" height="94" rx="1" fill="none" stroke="#78909c" stroke-width="0.8"/>`,
    tx(100, 86, "Ra-02", 12, { fill: "#37474f" }),
    tx(100, 100, "SX1278", 7, { fill: "#546e7a" }),
    tx(100, 110, "433 MHz", 6, { fill: "#546e7a" }),
    smd(72, 158, 6, 4),
    smd(84, 158, 6, 4),
    smd(96, 158, 6, 4),
    `  <rect class="chip" x="110" y="152" width="18" height="16" rx="1.5"/>`,
    tx(100, 196, "LoRa", 8),
    tx(100, 208, "Ai-Thinker Ra-02", 6, { fill: "#cfd8dc" }),
  );
  return {
    id: "module.lora.sx127x",
    kind: "module",
    file: "modules/lora-sx127x.svg",
    caption: "LoRa SX1278 module (Ra-02 style, 3.3 V only)",
    title: "LoRa SX127x Ra-02 module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Ra-02 style: 16 castellated pads, 8 per side at 2 mm pitch. Left top to bottom: GND MISO MOSI SCK NSS RESET DIO5 GND.",
      "Right top to bottom: DIO2 DIO1 DIO0 3.3V DIO4 DIO3 GND ANT. The antenna is the ANT pad (bottom right).",
      "Wires use the top-left GND pad; the other GND pads are the same net.",
    ],
    width,
    height,
    body: parts.join("\n"),
    terminals,
  };
}

function pn532() {
  const width = 320;
  const height = 300;
  const terminals = {};
  const parts = [board(10, 10, 300, 280, "#b71c1c", "#7f0000"), mount(24, 24), mount(296, 24), mount(24, 276), mount(296, 276)];
  const groups = [
    [52, ["VCC", "GND", "SDA", "SCL"]],
    [134, ["SCK", "MISO", "MOSI", "SS"]],
    [214, ["IRQ", "RSTO"]],
  ];
  for (const [x0, labels] of groups) {
    const h = rowHeader({ pins: labels.map((l) => ({ label: l, id: l })), x: x0, y: 32, pitch: 18, dir: "x", side: "below" });
    parts.push(h.svg);
    Object.assign(terminals, h.terminals);
  }
  parts.push(
    chip(64, 92, 40, 40, "PN532", { fs: 7 }),
    `  <rect class="metal" x="120" y="100" width="22" height="9" rx="1"/>`,
    smd(120, 116, 6, 4),
    smd(130, 116, 6, 4),
    smd(150, 100, 6, 4),
    smd(150, 110, 6, 4),
    // DIP mode switch and the printed mode table
    `  <rect x="196" y="92" width="42" height="24" rx="2" fill="#1565c0" stroke="#0d3c7a"/>`,
    `  <rect x="202" y="98" width="12" height="12" rx="1" fill="#eceff1"/><rect x="202" y="98" width="12" height="6" fill="#90a4ae"/>`,
    `  <rect x="220" y="98" width="12" height="12" rx="1" fill="#eceff1"/><rect x="220" y="104" width="12" height="6" fill="#90a4ae"/>`,
    tx(217, 88, "SEL  0   1", 5.5),
    tx(256, 100, "HSU 0 0", 6, { anchor: "start" }),
    tx(256, 109, "I2C 1 0", 6, { anchor: "start" }),
    tx(256, 118, "SPI 0 1", 6, { anchor: "start" }),
    tx(217, 132, "ON", 5.5),
  );
  // printed antenna loops
  for (let i = 0; i < 5; i++) {
    const d = i * 8;
    parts.push(`  <rect x="${30 + d}" y="${150 + d}" width="${260 - 2 * d}" height="${128 - 2 * d}" rx="${12 - i * 2}" fill="none" stroke="#ff9e9e" stroke-width="2.4"/>`);
  }
  parts.push(tx(160, 212, "PN532", 14, { fill: "#ffebee" }), tx(160, 228, "NFC / RFID MODULE V3", 8, { fill: "#ffcdd2" }));
  return {
    id: "module.pn532",
    kind: "module",
    file: "modules/pn532-nfc.svg",
    caption: "PN532 NFC reader (13.56 MHz, I2C / SPI / HSU)",
    title: "PN532 NFC module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Red V3 board: printed antenna loop, PN532 chip, two-switch mode selector. All headers on the top edge.",
      "Left to right: VCC GND SDA SCL | SCK MISO MOSI SS | IRQ RSTO. Mode switches: HSU 0 0, I2C 1 0, SPI 0 1 (as printed on the common board; check yours).",
    ],
    width,
    height,
    body: parts.join("\n"),
    terminals,
    pinExit: { dx: 0, dy: -1 },
  };
}

function ds3231() {
  const width = 294;
  const height = 180;
  const terminals = {};
  const parts = [board(10, 10, 274, 160, "#1f4fa8", "#143c80"), mount(24, 24, 3.5), mount(24, 156, 3.5)];
  const leftPins = ["32K", "SQW", "SCL", "SDA", "VCC", "GND"];
  parts.push(plastic(17, 36, 18, 108));
  leftPins.forEach((p, i) => {
    const y = 45 + i * 18;
    terminals[p] = { x: 26, y };
    parts.push(hole(26, y, p), tx(40, y + 3, p, 7.5, { anchor: "start", cls: "pinlbl" }));
  });
  // second (duplicate) header on the right edge, not wired
  parts.push(plastic(261, 54, 18, 72));
  ["SCL", "SDA", "VCC", "GND"].forEach((p, i) => {
    const y = 63 + i * 18;
    parts.push(hole(270, y, p), tx(256, y + 3, p, 7, { anchor: "end", cls: "pinlbl muted" }));
  });
  parts.push(
    chip(68, 48, 54, 38, "DS3231", { fs: 7 }),
    ...Array.from({ length: 8 }, (_, i) => `  <rect x="${71 + i * 6}" y="44" width="2.4" height="4" fill="#b0bec5"/><rect x="${71 + i * 6}" y="86" width="2.4" height="4" fill="#b0bec5"/>`),
    `  <rect class="chip" x="68" y="108" width="30" height="16" rx="1.5"/>`,
    tx(83, 119, "24C32", 5.5),
    smd(106, 108, 6, 4),
    smd(106, 116, 6, 4),
    smd(106, 124, 6, 4),
    led(120, 143, "#ef5350"),
    tx(70, 146, "ZS-042", 7),
    // CR2032 holder
    `  <circle cx="186" cy="90" r="52" fill="#cfd8dc" stroke="#607d8b" stroke-width="2"/>`,
    `  <circle cx="186" cy="90" r="43" fill="#b0bec5" stroke="#78909c" stroke-width="1"/>`,
    tx(186, 86, "CR2032", 10, { fill: "#37474f" }),
    tx(186, 100, "+ 3V", 8, { fill: "#37474f" }),
    `  <rect x="130" y="82" width="8" height="16" rx="1" fill="#90a4ae"/>`,
  );
  return {
    id: "module.ds3231",
    kind: "module",
    file: "modules/ds3231-rtc.svg",
    caption: "DS3231 RTC module (ZS-042, I2C 0x68)",
    title: "DS3231 RTC module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue ZS-042 board: DS3231 SOIC-16, AT24C32 EEPROM, CR2032 holder, power LED.",
      "Left header top to bottom: 32K SQW SCL SDA VCC GND (wired). The right header (SCL SDA VCC GND) carries the same signals and is drawn but not wired.",
    ],
    width,
    height,
    body: parts.join("\n"),
    terminals,
    pinExit: { dx: -1, dy: 0 },
  };
}

function hc595() {
  const left = [
    { label: "QB", id: "QB", n: 1 },
    { label: "QC", id: "QC", n: 2 },
    { label: "QD", id: "QD", n: 3 },
    { label: "QE", id: "QE", n: 4 },
    { label: "QF", id: "QF", n: 5 },
    { label: "QG", id: "QG", n: 6 },
    { label: "QH", id: "QH", n: 7 },
    { label: "GND", id: "GND", n: 8 },
  ];
  const right = [
    { label: "VCC", id: "VCC", n: 16 },
    { label: "QA", id: "QA", n: 15 },
    { label: "SER", id: "SER", n: 14 },
    { label: "OE", id: "OE", n: 13 },
    { label: "RCLK", id: "RCLK", n: 12 },
    { label: "SRCLK", id: "SRCLK", n: 11 },
    { label: "SRCLR", id: "SRCLR", n: 10 },
    { label: "QH'", id: "QH_", n: 9 },
  ];
  return dipChip({
    id: "module.74hc595",
    file: "modules/74hc595.svg",
    caption: "74HC595 shift register (DIP-16)",
    title: "74HC595 DIP-16 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "DIP-16, notch at the top. Pins 1-8 down the left side, 9-16 up the right side (pin 16 VCC top right).",
      "Terminals sit at the leg tips.",
    ],
    width: 260,
    height: 218,
    name: "74HC595",
    tag: "8-BIT SHIFT REGISTER",
    left,
    right,
    pitch: 20,
    bodyW: 56,
  });
}

function pcf8574() {
  const width = 200;
  const height = 270;
  const terminals = {};
  const parts = [board(10, 10, 180, 250, "#1e56b4", "#143c80"), mount(22, 22, 3.5), mount(178, 22, 3.5)];
  const top = ["GND", "VCC", "SDA", "SCL", "INT"];
  parts.push(plastic(35, 23, 92, 18));
  top.forEach((p, i) => {
    const x = 46 + i * 18;
    terminals[p] = { x, y: 32 };
    parts.push(hole(x, 32, p), vlab(x, 46, p));
  });
  parts.push(plastic(163, 41, 18, 144));
  for (let i = 0; i < 8; i++) {
    const y = 50 + i * 18;
    terminals[`P${i}`] = { x: 172, y };
    parts.push(hole(172, y, `P${i}`), tx(158, y + 3, `P${i}`, 7.5, { anchor: "end", cls: "pinlbl" }));
  }
  parts.push(
    // SOIC-16 chip
    `  <rect class="chip" x="52" y="108" width="72" height="30" rx="2"/>`,
    `  <circle cx="58" cy="114" r="1.5" fill="#666"/>`,
    ...Array.from({ length: 8 }, (_, i) => `  <rect x="${57 + i * 8.5}" y="104" width="2.6" height="4" fill="#b0bec5"/><rect x="${57 + i * 8.5}" y="138" width="2.6" height="4" fill="#b0bec5"/>`),
    tx(88, 126, "PCF8574", 7),
    led(60, 164, "#ef5350", "PWR"),
    smd(100, 160, 8, 4),
    smd(114, 160, 8, 4),
    smd(100, 168, 8, 4),
    smd(114, 168, 8, 4),
    tx(30, 192, "ADDR", 6, { anchor: "start" }),
  );
  ["A0", "A1", "A2"].forEach((a, i) => {
    const x = 42 + i * 46;
    terminals[a] = { x, y: 210 };
    parts.push(
      tx(x, 202, a, 7.5),
      `  <rect x="${x - 8}" y="205" width="16" height="10" rx="2" fill="#d9b44a" stroke="#a07d1c" stroke-width="0.6"/>`,
      `  <rect x="${x - 8}" y="219" width="16" height="10" rx="2" fill="#d9b44a" stroke="#a07d1c" stroke-width="0.6"/>`,
      smd(x + 12, 208, 5, 3),
    );
  });
  parts.push(tx(100, 246, "I2C EXPANDER", 7, { fill: "#cfd8dc" }));
  return {
    id: "module.pcf8574",
    kind: "module",
    file: "modules/pcf8574.svg",
    caption: "PCF8574 I2C expander module (8 I/O, address 0x20-0x27)",
    title: "PCF8574 I2C expander module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue board: SOIC-16 chip, top header GND VCC SDA SCL INT, P0-P7 down the right edge, three address jumpers A0 A1 A2 at the bottom.",
      "Each jumper has two pads (the upper one is the address line, the lower one ground); layouts vary between sellers.",
    ],
    width,
    height,
    body: parts.join("\n"),
    terminals,
  };
}

function mcp23017() {
  const L = [
    ["GPB0", 1],
    ["GPB1", 2],
    ["GPB2", 3],
    ["GPB3", 4],
    ["GPB4", 5],
    ["GPB5", 6],
    ["GPB6", 7],
    ["GPB7", 8],
    ["VDD", 9],
    ["VSS", 10],
    ["NC", 11],
    ["SCL", 12],
    ["SDA", 13],
    ["NC", 14],
  ];
  const R = [
    ["GPA7", 28],
    ["GPA6", 27],
    ["GPA5", 26],
    ["GPA4", 25],
    ["GPA3", 24],
    ["GPA2", 23],
    ["GPA1", 22],
    ["GPA0", 21],
    ["INTA", 20],
    ["INTB", 19],
    ["RESET", 18],
    ["A2", 17],
    ["A1", 16],
    ["A0", 15],
  ];
  const mk = ([label, n]) => (label === "NC" ? { label: "NC", n, nc: true } : { label, id: label, n });
  return dipChip({
    id: "module.mcp23017",
    file: "modules/mcp23017.svg",
    caption: "MCP23017 I2C expander (DIP-28, 16 I/O)",
    title: "MCP23017 DIP-28 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Narrow DIP-28, notch at the top. Pins 1-14 down the left (GPB0-7, VDD, VSS, NC, SCL, SDA, NC), 15-28 up the right (A0-A2, RESET, INTB, INTA, GPA0-7).",
      "Terminals sit at the leg tips; NC pins are drawn but not wired.",
    ],
    width: 260,
    height: 266,
    name: "MCP23017",
    tag: "I2C 16-BIT I/O EXPANDER",
    left: L.map(mk),
    right: R.map(mk),
    pitch: 14,
    bodyW: 44,
  });
}

function ads1115() {
  const width = 170;
  const height = 220;
  const terminals = {};
  const parts = [board(10, 10, 150, 200, "#1b57b5", "#133e80"), mount(86, 22, 3.5), mount(86, 198, 3.5)];
  const leftPins = ["VDD", "GND", "SCL", "SDA", "ADDR", "ALRT"];
  const rightPins = ["A0", "A1", "A2", "A3"];
  parts.push(plastic(15, 31, 18, 108), plastic(137, 31, 18, 72));
  leftPins.forEach((p, i) => {
    const y = 40 + i * 18;
    terminals[p] = { x: 24, y };
    parts.push(hole(24, y, p), tx(37, y + 3, p, 7.5, { anchor: "start", cls: "pinlbl" }));
  });
  rightPins.forEach((p, i) => {
    const y = 40 + i * 18;
    terminals[p] = { x: 146, y };
    parts.push(hole(146, y, p), tx(133, y + 3, p, 7.5, { anchor: "end", cls: "pinlbl" }));
  });
  parts.push(
    // tiny VSSOP-10 chip with its marking
    `  <rect class="chip" x="76" y="142" width="26" height="12" rx="1.5"/>`,
    `  <circle cx="80" cy="146" r="1.2" fill="#666"/>`,
    tx(89, 151.5, "ADS1115", 4.6),
    smd(66, 160, 6, 4),
    smd(76, 160, 6, 4),
    smd(98, 160, 6, 4),
    smd(108, 160, 6, 4),
    smd(66, 134, 6, 4),
    smd(110, 134, 6, 4),
    led(112, 180, "#ef5350"),
    tx(78, 184, "ADS1115", 8),
    tx(78, 194, "16-BIT ADC", 6, { fill: "#cfd8dc" }),
  );
  return {
    id: "module.ads1115",
    kind: "module",
    file: "modules/ads1115.svg",
    caption: "ADS1115 16-bit ADC module (4 analog inputs, I2C)",
    title: "ADS1115 ADC module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue board with the tiny VSSOP-10 chip. Left edge top to bottom: VDD GND SCL SDA ADDR ALRT. Right edge: A0 A1 A2 A3.",
    ],
    width,
    height,
    body: parts.join("\n"),
    terminals,
  };
}

function esp01() {
  const width = 144;
  const height = 276;
  const xs = [39, 61, 83, 105];
  const inner = ["TX", "CH_PD", "RST", "VCC"];
  const outer = ["GND", "GPIO2", "GPIO0", "RX"];
  const innerLabel = ["TX", "CH_PD", "RST", "VCC"];
  const outerLabel = ["GND", "GPIO2", "GPIO0", "RX"];
  const terminals = {};
  const parts = [
    `  <rect x="8" y="8" width="128" height="260" rx="5" fill="#1c1c1c" stroke="#555" stroke-width="2"/>`,
    mount(20, 20, 3),
    mount(124, 20, 3),
    // meandered PCB antenna and keepout
    zigzag(24, 120, 22, 66, 8, "#c9a227", 2.4),
    // ESP8266 shield, flash chip, LEDs
    `  <rect class="metal" x="20" y="76" width="84" height="64" rx="2"/>`,
    `  <rect x="25" y="81" width="74" height="54" rx="1" fill="none" stroke="#78909c" stroke-width="0.8"/>`,
    tx(62, 106, "ESP-01", 11, { fill: "#37474f" }),
    tx(62, 120, "ESP8266", 6.5, { fill: "#546e7a" }),
    `  <rect class="chip" x="110" y="118" width="20" height="20" rx="1.5"/>`,
    tx(120, 130, "FLASH", 4.5),
    led(118, 88, "#e53935"),
    led(118, 102, "#42a5f5"),
    tx(129, 90, "PWR", 4.5, { anchor: "end" }),
    plastic(28, 189, 88, 44),
  ];
  xs.forEach((x, i) => {
    terminals[inner[i]] = { x, y: 200 };
    terminals[outer[i]] = { x, y: 222 };
    parts.push(hole(x, 200, innerLabel[i]), hole(x, 222, outerLabel[i]), vlab(x, 186, innerLabel[i], false), vlab(x, 236, outerLabel[i], true));
  });
  return {
    id: "module.esp01",
    kind: "module",
    file: "modules/esp-01.svg",
    caption: "ESP-01 Wi-Fi module (ESP8266, 3.3 V only)",
    title: "ESP-01 ESP8266 module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Black AI-Thinker style board: PCB antenna at the top, silver ESP8266 shield, two LEDs, 2 x 4 header at the bottom edge.",
      "Header rows left to right: bottom (outer) row GND GPIO2 GPIO0 RX; inner row TX CH_PD RST VCC. Which row is outer varies by how the module is held, double check against your board.",
    ],
    width,
    height,
    body: parts.join("\n"),
    terminals,
    pinExit: { dx: 0, dy: 1 },
  };
}

const drawings = [neo6m, () => hcBoard("05"), () => hcBoard("06"), nrf24, loraSx127x, pn532, ds3231, hc595, pcf8574, mcp23017, ads1115, esp01];

export default drawings;
