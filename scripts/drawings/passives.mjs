// Passive parts, discrete semiconductors, switches and small power modules.
// Two-lead / three-lead parts are drawn in breadboard orientation with the leads pointing down.
import { esc, r1 } from "./_lib.mjs";
import { screwTerminal } from "./_helpers.mjs";

const FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";
const txt = (x, y, s, { fs = 9, fill = "#eceff1", anchor = "middle", rot = 0, bold = false } = {}) =>
  `  <text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${fs}" fill="${fill}"${bold ? ' font-weight="bold"' : ""}${
    rot ? ` transform="rotate(${rot} ${x} ${y})"` : ""
  }>${esc(s)}</text>`;
/** Dark pill with a short label, readable on any background. */
const pill = (x, y, s, fs = 9) => {
  const w = s.length * fs * 0.62 + 8;
  return `  <rect x="${r1(x - w / 2)}" y="${y - 8}" width="${r1(w)}" height="14" rx="7" fill="#263238" opacity="0.92"/>\n${txt(x, y + 3, s, { fs })}`;
};
/** A metal lead from (x1,y1) to (x2,y2). */
const lead = (x1, y1, x2, y2, w = 4) =>
  `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#607d8b" stroke-width="${w + 2}" stroke-linecap="round"/>\n  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cfd8dc" stroke-width="${w}" stroke-linecap="round"/>`;
const pad = (x, y, r = 9) =>
  `  <circle cx="${x}" cy="${y}" r="${r}" fill="#d9b44a" stroke="#a07d1c" stroke-width="1"/>\n  <circle class="hole" cx="${x}" cy="${y}" r="${r * 0.5}"/>`;
const board = (x, y, w, h, fill, stroke, rx = 6) =>
  `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const rect = (x, y, w, h, fill, extra = "") => `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const tan = (x, y, w = 14, h = 8) => rect(x, y, w, h, "#d7ccc8", 'stroke="#6d4c41"');
const base = (id, file, caption, name, comment, width, height, body, terminals, pinExit) => ({
  id,
  kind: "module",
  file,
  caption,
  title: `${name} (original simplified drawing, CC0)`,
  comment: ["Original CC0 simplified drawing for HelpmeSolder wiring diagrams.", ...comment],
  width,
  height,
  body,
  terminals,
  ...(pinExit ? { pinExit } : {}),
});
const DOWN = { dx: 0, dy: 1 };

// ---------- capacitors ----------

function ceramic() {
  const body = [
    lead(58, 118, 46, 218),
    lead(102, 118, 114, 218),
    `  <path d="M80 18 C122 18 140 46 140 78 C140 112 116 128 80 128 C44 128 20 112 20 78 C20 46 38 18 80 18 Z" fill="#d9a441" stroke="#8a5a14" stroke-width="2.5"/>`,
    `  <path d="M40 46 C50 30 66 26 80 26" fill="none" stroke="#f2cf82" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`,
    txt(80, 82, "104", { fs: 28, fill: "#4e342e", bold: true }),
    txt(80, 108, "50V", { fs: 13, fill: "#4e342e" }),
  ].join("\n");
  return base("passive.capacitor.ceramic.100nf", "modules/ceramic-capacitor-100nf.svg", "Ceramic capacitor 100 nF (104)", "Ceramic capacitor 100 nF",
    ["Tan/yellow disc marked 104 (10 x 10^4 pF = 100 nF), no polarity, two thin legs pointing down."],
    160, 230, body, { 1: { x: 46, y: 218 }, 2: { x: 114, y: 218 } }, DOWN);
}

function electrolytic(id, slug, value, volts, sleeve, cw, ch, sp, leadLen) {
  const W = 200, top = 14, cx = 100;
  const by = top + ch;
  const H = by + leadLen;
  const x0 = cx - cw / 2;
  const stripeW = cw * 0.24;
  const fs = Math.max(10, cw * 0.17);
  const tipP = H - 6; // the + lead is the long one
  const tipM = H - 22;
  const minus = [];
  for (let y = top + 16; y < by - 14; y += 18) minus.push(txt(x0 + 2 + stripeW / 2, y + 4, "−", { fs: 13, fill: "#263238", bold: true }));
  const body = [
    lead(cx - sp, by - 4, cx - sp, tipM),
    lead(cx + sp, by - 4, cx + sp, tipP),
    `  <path d="M${x0} ${by} V${top + 10} Q${x0} ${top} ${x0 + 10} ${top} H${x0 + cw - 10} Q${x0 + cw} ${top} ${x0 + cw} ${top + 10} V${by} Z" fill="${sleeve}" stroke="#000" stroke-opacity="0.5" stroke-width="2"/>`,
    `  <rect x="${x0}" y="${top + 5}" width="${cw}" height="3" fill="#000" opacity="0.25"/>`,
    `  <rect x="${x0}" y="${by - 8}" width="${cw}" height="8" fill="#111"/>`,
    `  <rect x="${x0 + 2}" y="${top + 9}" width="${stripeW}" height="${ch - 17}" fill="#eceff1" opacity="0.92"/>`,
    ...minus,
    txt(x0 + stripeW + (cw - stripeW) * 0.4, top + ch / 2, value, { fs, rot: -90, bold: true }),
    txt(x0 + stripeW + (cw - stripeW) * 0.4 + fs * 1.1, top + ch / 2, volts, { fs: Math.max(8, cw * 0.11), rot: -90 }),
    pill(cx - sp, by + 26, "−"),
    pill(cx + sp, by + 26, "+"),
  ].join("\n");
  return base(id, `modules/${slug}.svg`, `Electrolytic capacitor ${value}`, `Electrolytic capacitor ${value}`,
    ["Radial electrolytic can: the white stripe with minus signs marks the negative leg; the + leg is longer.",
     "Leg 1 = + (long leg, right), leg 2 = - (stripe side, left). Value and voltage printed on the can."],
    W, H, body, { 1: { x: cx + sp, y: tipP }, 2: { x: cx - sp, y: tipM } }, DOWN);
}

// ---------- diodes ----------

function axialDiode({ id, slug, name, bw, bh, fill, bandFill, bandW = 14, print, printFill, printFs, glass, comment }) {
  const W = 240, H = 230, cy = 70;
  const x0 = 120 - bw / 2;
  const la = x0 - 26, lb = x0 + bw + 26, tip = 214;
  const wire = (xe, xl) => {
    const d = `M${xe} ${cy} H${xl} V${tip}`;
    return `  <path d="${d}" fill="none" stroke="#607d8b" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>\n  <path d="${d}" fill="none" stroke="#cfd8dc" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
  };
  const body = [
    wire(x0 + 2, la),
    wire(x0 + bw - 2, lb),
    `  <rect x="${x0}" y="${cy - bh / 2}" width="${bw}" height="${bh}" rx="${glass ? bh / 2.2 : 5}" fill="${fill}" stroke="#000" stroke-opacity="0.6" stroke-width="2"/>`,
    glass ? `  <rect x="${x0 + 8}" y="${cy - bh * 0.22}" width="${bw - bandW - 16}" height="${bh * 0.44}" fill="#6d6d6d" opacity="0.4"/>` : "",
    `  <rect x="${x0 + bw - bandW - 8}" y="${cy - bh / 2 + 1}" width="${bandW}" height="${bh - 2}" fill="${bandFill}"/>`,
    `  <rect x="${x0 + 7}" y="${cy - bh / 2 + 4}" width="${bw - 14}" height="3" rx="1.5" fill="#fff" opacity="0.16"/>`,
    txt(x0 + (bw - bandW - 8) / 2 + 3, cy + printFs * 0.35, print, { fs: printFs, fill: printFill, bold: true }),
    pill(la, 190, "A"),
    pill(lb, 190, "C"),
    txt(lb, 150, "band", { fs: 8, fill: "#607d8b" }),
  ].join("\n");
  return base(id, `modules/${slug}.svg`, name, name, comment, W, H, body, { A: { x: la, y: tip }, C: { x: lb, y: tip } }, DOWN);
}

// ---------- transistors ----------

function to92({ id, slug, name, mark, pins, comment }) {
  const W = 170, H = 250, cx = 85, y0 = 16, tip = 238;
  const xs = [cx - 34, cx, cx + 34];
  const body = [
    ...xs.map((x) => lead(x, y0 + 118, x, tip)),
    `  <path d="M${cx - 52} ${y0 + 118} V${y0 + 52} A52 52 0 0 1 ${cx + 52} ${y0 + 52} V${y0 + 118} Z" fill="#1d1d1d" stroke="#000" stroke-width="2"/>`,
    `  <path d="M${cx - 44} ${y0 + 110} V${y0 + 54} A44 44 0 0 1 ${cx - 10} ${y0 + 12}" fill="none" stroke="#fff" stroke-width="3" opacity="0.14" stroke-linecap="round"/>`,
    txt(cx, y0 + 66, mark[0], { fs: 15, bold: true }),
    txt(cx, y0 + 86, mark[1], { fs: 10, fill: "#b0bec5" }),
    ...xs.map((x, i) => pill(x, y0 + 140, pins[i])),
  ].join("\n");
  const t = {};
  pins.forEach((p, i) => (t[p] = { x: xs[i], y: tip }));
  return base(id, `modules/${slug}.svg`, name, `${name} (flat face toward you)`, comment, W, H, body, t, DOWN);
}

function to18() {
  const W = 170, H = 260, cx = 85, tip = 248;
  const xs = [cx - 28, cx, cx + 28];
  const labels = ["E", "B", "C"];
  const body = [
    ...xs.map((x) => lead(x, 150, x, tip)),
    `  <path d="M${cx - 38} 138 V68 Q${cx - 38} 20 ${cx} 20 Q${cx + 38} 20 ${cx + 38} 68 V138 Z" fill="#b0bec5" stroke="#546e7a" stroke-width="2.5"/>`,
    `  <path d="M${cx - 28} 130 V70 Q${cx - 28} 34 ${cx - 6} 30" fill="none" stroke="#fff" stroke-width="5" opacity="0.5" stroke-linecap="round"/>`,
    `  <rect x="${cx - 50}" y="136" width="100" height="12" rx="2" fill="#90a4ae" stroke="#546e7a" stroke-width="2"/>`,
    `  <rect x="${cx - 62}" y="134" width="14" height="16" rx="2" fill="#90a4ae" stroke="#546e7a" stroke-width="2"/>`,
    txt(cx, 84, "2N2222", { fs: 11, fill: "#263238", bold: true }),
    ...xs.map((x, i) => pill(x, 186, labels[i])),
    txt(cx - 56, 124, "tab", { fs: 8, fill: "#607d8b" }),
  ].join("\n");
  return base("passive.transistor.2n2222", "modules/transistor-2n2222.svg", "NPN transistor 2N2222 (metal can)", "2N2222 metal can (TO-18) side view",
    ["Metal can TO-18 seen from the side with the legs down. The small tab on the flange is next to the emitter.",
     "Legs left to right with the tab on the left: E, B, C. (The plastic PN2222 is also E-B-C seen from its flat face.)"],
    W, H, body, { E: { x: xs[0], y: tip }, B: { x: xs[1], y: tip }, C: { x: xs[2], y: tip } }, DOWN);
}

function to220({ id, slug, name, mark, sub, pins, tabText, comment }) {
  const W = 200, H = 330, cx = 100, tip = 318;
  const xs = [cx - 38, cx, cx + 38];
  const body = [
    ...xs.map((x) => `  <rect x="${x - 6}" y="212" width="12" height="${tip - 212}" rx="1" fill="#cfd8dc" stroke="#607d8b" stroke-width="1.5"/>`),
    `  <path d="M${cx - 62} 120 V24 Q${cx - 62} 12 ${cx - 50} 12 H${cx + 50} Q${cx + 62} 12 ${cx + 62} 24 V120 Z" fill="#b0bec5" stroke="#546e7a" stroke-width="2"/>`,
    `  <circle cx="${cx}" cy="46" r="13" fill="#f5f5f5" stroke="#546e7a" stroke-width="2"/>`,
    txt(cx, 92, tabText, { fs: 9, fill: "#455a64" }),
    `  <rect x="${cx - 62}" y="118" width="124" height="96" fill="#1d1d1d" stroke="#000" stroke-width="2"/>`,
    `  <rect x="${cx - 62}" y="118" width="124" height="4" fill="#000" opacity="0.5"/>`,
    txt(cx, 156, mark, { fs: 18, bold: true }),
    txt(cx, 176, sub, { fs: 10, fill: "#b0bec5" }),
    ...xs.map((x, i) => pill(x, 244, pins[i])),
  ].join("\n");
  const t = {};
  pins.forEach((p, i) => (t[p] = { x: xs[i], y: tip }));
  return base(id, `modules/${slug}.svg`, name, `${name} (TO-220, printed side toward you)`, comment, W, H, body, t, DOWN);
}

// ---------- switches, connectors ----------

function toggle() {
  const W = 180, H = 320, cx = 90, tip = 296;
  const lugs = [cx - 34, cx + 34];
  const body = [
    ...lugs.map(
      (x) =>
        `  <path d="M${x - 8} 214 H${x + 8} V${tip + 12} H${x - 8} Z" fill="#cfd8dc" stroke="#607d8b" stroke-width="2"/>\n  <circle cx="${x}" cy="${tip}" r="4.5" fill="#f5f5f5" stroke="#546e7a" stroke-width="1.5"/>`,
    ),
    `  <path d="M${cx - 6} 70 L${cx + 14} 16" stroke="#607d8b" stroke-width="16" stroke-linecap="round"/>`,
    `  <path d="M${cx - 6} 70 L${cx + 14} 16" stroke="#eceff1" stroke-width="11" stroke-linecap="round"/>`,
    `  <rect x="${cx - 24}" y="64" width="48" height="52" rx="3" fill="#b0bec5" stroke="#546e7a" stroke-width="2"/>`,
    `  <path d="M${cx - 24} 78 H${cx + 24} M${cx - 24} 90 H${cx + 24} M${cx - 24} 102 H${cx + 24}" stroke="#78909c" stroke-width="1.5"/>`,
    `  <path d="M${cx - 38} 116 H${cx + 38} V132 H${cx - 38} Z" fill="#cfd8dc" stroke="#546e7a" stroke-width="2"/>`,
    `  <rect x="${cx - 56}" y="132" width="112" height="82" rx="4" fill="#212121" stroke="#000" stroke-width="2"/>`,
    txt(cx, 176, "ON-OFF", { fs: 10, fill: "#b0bec5" }),
    txt(cx, 194, "SPST 6A", { fs: 8, fill: "#78909c" }),
    pill(lugs[0], 262, "1"),
    pill(lugs[1], 262, "2"),
  ].join("\n");
  return base("passive.switch.toggle_spst", "modules/toggle-switch-spst.svg", "SPST toggle switch", "SPST toggle switch side view",
    ["Metal toggle: lever, threaded bushing with nut, black body and two solder lugs with holes.",
     "A 3-lug version has the same two outer lugs; the third is not used for SPST."],
    W, H, body, { 1: { x: lugs[0], y: tip }, 2: { x: lugs[1], y: tip } }, DOWN);
}

function rocker() {
  const W = 220, H = 290, cx = 110, tip = 268;
  const lugs = [cx - 40, cx + 40];
  const body = [
    ...lugs.map(
      (x) =>
        `  <path d="M${x - 11} 178 H${x + 11} V${tip + 12} H${x - 11} Z" fill="#cfd8dc" stroke="#607d8b" stroke-width="2"/>\n  <circle cx="${x}" cy="${tip}" r="4.5" fill="#f5f5f5" stroke="#546e7a" stroke-width="1.5"/>`,
    ),
    `  <rect x="${cx - 52}" y="126" width="104" height="52" rx="3" fill="#1a1a1a" stroke="#000" stroke-width="2"/>`,
    `  <rect x="${cx - 74}" y="18" width="148" height="116" rx="10" fill="#263238" stroke="#000" stroke-width="2"/>`,
    `  <rect x="${cx - 62}" y="28" width="124" height="94" rx="7" fill="#c62828" stroke="#7f0000" stroke-width="2"/>`,
    `  <path d="M${cx - 62} 80 L${cx - 62} 28 H${cx + 62} V70 Z" fill="#fff" opacity="0.1"/>`,
    `  <circle cx="${cx + 30}" cy="75" r="14" fill="none" stroke="#fff" stroke-width="5"/>`,
    `  <path d="M${cx - 30} 56 V94" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`,
    pill(lugs[0], 224, "1"),
    pill(lugs[1], 224, "2"),
  ].join("\n");
  return base("passive.switch.rocker", "modules/rocker-switch.svg", "Rocker switch (ON/OFF)", "Rocker switch front view",
    ["Two-position rocker: red I/O rocker in a black bezel, two flat spade lugs on the back.", "Wires end on the spade lugs; the switch is not polarised."],
    W, H, body, { 1: { x: lugs[0], y: tip }, 2: { x: lugs[1], y: tip } }, DOWN);
}

function dcJack() {
  const W = 230, H = 260, cx = 115;
  const tip = 244;
  const body = [
    `  <rect x="${cx - 7}" y="182" width="14" height="${tip - 182}" fill="#cfd8dc" stroke="#607d8b" stroke-width="2"/>`,
    `  <rect x="${cx - 49}" y="182" width="14" height="${tip - 182 - 18}" fill="#cfd8dc" stroke="#607d8b" stroke-width="2"/>`,
    `  <rect x="${cx + 35}" y="182" width="14" height="${tip - 182 - 18}" fill="#cfd8dc" stroke="#607d8b" stroke-width="2"/>`,
    `  <rect x="${cx - 82}" y="18" width="164" height="168" rx="5" fill="#1d1d1d" stroke="#000" stroke-width="2"/>`,
    `  <rect x="${cx - 62}" y="18" width="124" height="76" fill="#050505" stroke="#37474f" stroke-width="2"/>`,
    `  <rect x="${cx - 52}" y="24" width="104" height="64" fill="#0d0d0d" stroke="#455a64" stroke-width="1.5"/>`,
    `  <rect x="${cx - 5}" y="24" width="10" height="48" rx="3" fill="#cfd8dc" stroke="#607d8b" stroke-width="1.5"/>`,
    txt(cx, 132, "DC IN", { fs: 14, bold: true }),
    txt(cx, 152, "5.5 x 2.1 mm", { fs: 10, fill: "#b0bec5" }),
    pill(cx - 42, 214, "−"),
    pill(cx, 220, "+"),
  ].join("\n");
  return base("passive.connector.dc_jack_5521", "modules/dc-jack-5521.svg", "DC barrel jack 5.5 x 2.1 mm", "DC barrel jack 5.5 x 2.1 mm top view",
    ["Black PCB barrel socket seen from above: barrel opening at the top, centre pin visible inside, three pins behind.",
     "Pins left to right: sleeve (-), centre (+), switch pin (unused). Centre-positive adapters assumed."],
    W, H, body, { "+": { x: cx, y: tip }, "-": { x: cx - 42, y: tip - 18 } }, DOWN);
}

// ---------- modules ----------

function irf520() {
  const W = 340, H = 240;
  const t = {};
  const parts = [];
  [["SIG", ""], ["VCC", " pwr"], ["GND", " gnd"]].forEach(([l, c], i) => {
    const y = 52 + i * 36;
    parts.push(`  <rect x="17" y="${y - 12}" width="26" height="24" rx="2" fill="#1b1b1b"/>`);
    parts.push(`  <circle class="hole${c}" cx="30" cy="${y}" r="6"/>`);
    parts.push(txt(50, y + 3, l, { fs: 8, anchor: "start" }));
    t[l] = { x: 30, y };
  });
  const a = screwTerminal(272, 14, 2, { pitch: 44, h: 44, horizontal: false });
  const b = screwTerminal(272, 130, 2, { pitch: 44, h: 44, horizontal: false });
  [["VIN+", "VIN-", a], ["V+", "V-", b]].forEach(([p, m, s]) => {
    [p, m].forEach((id, i) => {
      t[id] = s.poles[i];
      parts.push(txt(266, s.poles[i].y + 3, id, { fs: 8, anchor: "end" }));
    });
  });
  const body = [
    board(2, 2, 336, 236, "#1f56b0", "#143c80"),
    a.svg,
    b.svg,
    ...parts,
    // TO-220 lying on the board: legs to the left, metal tab to the right.
    ...[88, 110, 132].map((y) => rect(96, y - 3, 30, 6, "#cfd8dc", 'stroke="#607d8b"')),
    `  <rect class="chip" x="124" y="72" width="54" height="80" rx="2"/>`,
    `  <rect class="metal" x="178" y="68" width="46" height="88" rx="3"/>`,
    `  <circle cx="204" cy="112" r="9" fill="#f5f5f5" stroke="#546e7a" stroke-width="1.5"/>`,
    txt(151, 112, "IRF520", { fs: 10, rot: -90, bold: true }),
    `  <circle cx="64" cy="204" r="4" fill="#ef5350" stroke="#00000066"/>`,
    txt(74, 207, "PWR", { fs: 7, anchor: "start" }),
    txt(170, 214, "IRF520 MOSFET DRIVER", { fs: 8 }),
    `  <circle cx="26" cy="214" r="5" fill="#f5f5f5" stroke="#c9a227" stroke-width="2.5"/>`,
  ].join("\n");
  return base("passive.mosfet.irf520_module", "modules/irf520-mosfet-module.svg", "IRF520 MOSFET driver module", "IRF520 MOSFET driver module top view",
    ["Blue board: 3-pin control header (SIG, VCC, GND) on the left, TO-220 IRF520 with its metal tab in the middle,",
     "two 2-pole screw terminals on the right: VIN+/VIN- (load supply in) on top, V+/V- (to the load) below."],
    W, H, body, t);
}

function ams1117() {
  const W = 200, H = 250;
  const xs = [56, 100, 144];
  const t = {};
  const hdr = [`  <rect x="${xs[0] - 12}" y="22" width="${xs[2] - xs[0] + 24}" height="24" rx="2" fill="#1b1b1b"/>`];
  [["VIN", " pwr"], ["GND", " gnd"], ["VOUT", " v3"]].forEach(([l, c], i) => {
    hdr.push(`  <circle class="hole${c}" cx="${xs[i]}" cy="34" r="6"/>`);
    hdr.push(txt(xs[i], 62, l, { fs: 8 }));
    t[l] = { x: xs[i], y: 34 };
  });
  const body = [
    board(10, 8, 180, 234, "#1b4f9c", "#10336a"),
    ...hdr,
    // SOT-223: three legs on top, wide tab at the bottom.
    ...[84, 100, 116].map((x) => rect(x - 3, 98, 6, 16, "#cfd8dc", 'stroke="#607d8b"')),
    `  <rect class="chip" x="68" y="112" width="64" height="40" rx="1.5"/>`,
    `  <rect class="metal" x="76" y="152" width="48" height="14"/>`,
    txt(100, 134, "1117", { fs: 11, bold: true }),
    txt(100, 146, "3.3", { fs: 8, fill: "#b0bec5" }),
    rect(24, 96, 26, 34, "#a1887f", 'rx="2" stroke="#5d4037"'),
    txt(37, 117, "+", { fs: 10, fill: "#3e2723" }),
    rect(150, 96, 26, 34, "#a1887f", 'rx="2" stroke="#5d4037"'),
    txt(163, 117, "+", { fs: 10, fill: "#3e2723" }),
    tan(36, 176), tan(150, 176), tan(24, 150, 8, 14),
    txt(100, 204, "AMS1117", { fs: 12, bold: true }),
    txt(100, 222, "3.3V", { fs: 11 }),
  ].join("\n");
  return base("passive.regulator.ams1117_33", "modules/ams1117-3v3.svg", "AMS1117-3.3 regulator module", "AMS1117-3.3 regulator module top view",
    ["Small blue module: 3-pin header VIN, GND, VOUT along the top, SOT-223 regulator with its tab in the middle,",
     "input and output capacitors beside it. Input up to about 12 V, output 3.3 V."],
    W, H, body, t, { dx: 0, dy: -1 });
}

function wideModule(W, H, padSpec, padR) {
  const t = {};
  const out = [];
  padSpec.forEach(([l, x, y, s]) => {
    out.push(pad(x, y, padR), txt(s === "l" ? x + padR + 5 : x - padR - 5, y + 3, l, { fs: 9, anchor: s === "l" ? "start" : "end", bold: true }));
    t[l] = { x, y };
  });
  return { t, pads: out, board: board(2, 2, W - 4, H - 4, "#1f56b0", "#143c80") };
}

function lm2596() {
  const W = 340, H = 170;
  const m = wideModule(W, H, [["IN+", 22, 28, "l"], ["IN-", 22, 142, "l"], ["OUT+", 318, 28, "r"], ["OUT-", 318, 142, "r"]], 11);
  const cap = (cx, cy, mark) => [
    `  <circle cx="${cx}" cy="${cy}" r="24" fill="#1a1a1a" stroke="#90a4ae" stroke-width="2"/>`,
    `  <path d="M${cx - 17} ${cy - 17} A24 24 0 0 0 ${cx - 17} ${cy + 17} L${cx - 11} ${cy + 12} A15 15 0 0 1 ${cx - 11} ${cy - 12} Z" fill="#cfd8dc" opacity="0.9"/>`,
    txt(cx + 5, cy + 3, mark, { fs: 7 }),
  ].join("\n");
  const body = [
    m.board,
    ...m.pads,
    cap(70, 85, "220µ"),
    `  <rect class="chip" x="108" y="62" width="36" height="46" rx="1.5"/>`,
    `  <rect class="metal" x="144" y="68" width="10" height="34"/>`,
    txt(126, 85, "LM2596", { fs: 7, rot: -90 }),
    `  <rect x="162" y="38" width="76" height="76" rx="4" fill="#cfd8dc" stroke="#78909c" stroke-width="2"/>`,
    `  <circle cx="200" cy="76" r="26" fill="#b0bec5" stroke="#78909c" stroke-width="2"/>`,
    `  <circle cx="200" cy="76" r="20" fill="none" stroke="#455a64" stroke-width="9" stroke-dasharray="3 2"/>`,
    `  <circle cx="200" cy="76" r="9" fill="#eceff1" stroke="#78909c" stroke-width="1.5"/>`,
    rect(246, 122, 26, 14, "#1a1a1a", 'rx="1"'),
    rect(264, 122, 4, 14, "#cfd8dc"),
    `  <rect x="248" y="48" width="30" height="26" rx="2" fill="#4a8fdd" stroke="#0d3c7a" stroke-width="1.5"/>`,
    `  <circle cx="263" cy="61" r="8" fill="#d9b44a" stroke="#8a6d1a" stroke-width="1.2"/>`,
    `  <path d="M257 61 H269" stroke="#6d5a14" stroke-width="2"/>`,
    cap(292, 90, "470µ"),
    txt(190, 158, "LM2596 DC-DC STEP DOWN", { fs: 7 }),
  ].join("\n");
  return base("passive.converter.lm2596_buck", "modules/lm2596-buck.svg", "LM2596 buck converter module", "LM2596 buck converter module top view",
    ["Blue board: IN+ / IN- pads at the left, OUT+ / OUT- at the right (the most common silkscreen).",
     "LM2596 chip, big silver inductor, input and output electrolytic caps, blue trimmer with a brass screw sets the output voltage."],
    W, H, body, m.t);
}

function mt3608() {
  const W = 300, H = 150;
  const m = wideModule(W, H, [["IN+", 20, 26, "l"], ["IN-", 20, 124, "l"], ["OUT+", 280, 26, "r"], ["OUT-", 280, 124, "r"]], 10);
  const body = [
    m.board,
    ...m.pads,
    `  <rect class="chip" x="62" y="60" width="22" height="16" rx="1.5"/>`,
    txt(73, 71, "B628", { fs: 5 }),
    `  <rect x="96" y="44" width="56" height="50" rx="3" fill="#2b2b2b" stroke="#000" stroke-width="1.5"/>`,
    `  <rect x="102" y="50" width="44" height="38" rx="2" fill="#3a3a3a"/>`,
    txt(124, 74, "4R7", { fs: 10, bold: true }),
    `  <rect x="196" y="52" width="32" height="30" rx="2" fill="#4a8fdd" stroke="#0d3c7a" stroke-width="1.5"/>`,
    `  <circle cx="212" cy="67" r="9" fill="#eceff1" stroke="#78909c" stroke-width="1.2"/>`,
    `  <path d="M205 67 H219" stroke="#546e7a" stroke-width="2"/>`,
    rect(166, 98, 24, 12, "#1a1a1a", 'rx="1"'),
    rect(184, 98, 4, 12, "#cfd8dc"),
    tan(160, 40), tan(58, 100), tan(238, 98),
    txt(150, 138, "MT3608 2A BOOST", { fs: 7 }),
  ].join("\n");
  return base("passive.converter.mt3608_boost", "modules/mt3608-boost.svg", "MT3608 boost converter module", "MT3608 boost converter module top view",
    ["Small blue board: IN+ / IN- pads at the left, OUT+ / OUT- at the right.",
     "MT3608 chip (marked B628), 4R7 SMD inductor, SS34 diode, blue multi-turn trimmer sets the output voltage."],
    W, H, body, m.t);
}

function tp4056() {
  const W = 200, H = 300;
  const t = {};
  const items = [];
  [["IN+", 32, 60], ["IN-", 168, 60]].forEach(([l, x, y]) => {
    items.push(pad(x, y, 9), txt(x, y + 22, l, { fs: 8.5, bold: true }));
    t[l] = { x, y };
  });
  [["OUT+", 34], ["B+", 78], ["B-", 122], ["OUT-", 166]].forEach(([l, x]) => {
    items.push(pad(x, 272, 9), txt(x, 252, l, { fs: 8.5, bold: true }));
    t[l] = { x, y: 272 };
  });
  const body = [
    board(10, 30, 180, 266, "#1b66c9", "#0f4590"),
    // USB-C receptacle sticking out of the top edge
    `  <rect x="64" y="4" width="72" height="42" rx="12" fill="#cfd8dc" stroke="#546e7a" stroke-width="2"/>`,
    `  <rect x="80" y="12" width="40" height="8" rx="4" fill="#37474f"/>`,
    `  <rect x="86" y="14" width="28" height="4" rx="2" fill="#90a4ae"/>`,
    ...items,
    `  <rect x="24" y="100" width="16" height="9" rx="1.5" fill="#ef5350" stroke="#7f0000"/>`,
    txt(46, 108, "CHRG", { fs: 7, anchor: "start" }),
    `  <rect x="24" y="120" width="16" height="9" rx="1.5" fill="#66bb6a" stroke="#1b5e20"/>`,
    txt(46, 128, "STDBY", { fs: 7, anchor: "start" }),
    `  <rect class="chip" x="96" y="92" width="62" height="40" rx="1.5"/>`,
    `  <circle cx="102" cy="98" r="1.8" fill="#555"/>`,
    txt(127, 116, "TP4056", { fs: 8 }),
    tan(100, 144), tan(128, 144),
    `  <rect class="chip" x="62" y="176" width="24" height="16" rx="1.5"/>`,
    txt(74, 187, "DW01", { fs: 5.5 }),
    `  <rect class="chip" x="108" y="174" width="38" height="20" rx="1.5"/>`,
    txt(127, 187, "8205A", { fs: 6.5 }),
    tan(34, 180), tan(154, 180),
    txt(100, 226, "TYPE-C  1A  LiPo", { fs: 8 }),
  ].join("\n");
  return base("passive.charger.tp4056_usbc", "modules/tp4056-usbc.svg", "TP4056 USB-C LiPo charger", "TP4056 USB-C LiPo charger board top view",
    ["Blue board: USB-C at the top, IN+ / IN- pads at the top corners, red CHRG and green STDBY LEDs, TP4056 + DW01 + 8205A protection chips.",
     "Bottom pads left to right: OUT+, B+, B-, OUT- (OUT = protected load output, B = battery). Pad order differs slightly between sellers."],
    W, H, body, t);
}

const drawings = [
  ceramic,
  () => electrolytic("passive.capacitor.electrolytic.10uf", "electrolytic-capacitor-10uf", "10µF", "25V", "#1e4fa8", 64, 82, 16, 84),
  () => electrolytic("passive.capacitor.electrolytic.100uf", "electrolytic-capacitor-100uf", "100µF", "25V", "#1c1c1c", 92, 128, 20, 88),
  () => electrolytic("passive.capacitor.electrolytic.1000uf", "electrolytic-capacitor-1000uf", "1000µF", "16V", "#1c1c1c", 128, 184, 26, 92),
  () => axialDiode({ id: "passive.diode.1n4007", slug: "diode-1n4007", name: "Diode 1N4007", bw: 124, bh: 48, fill: "#1d1d1d", bandFill: "#cfd8dc", print: "1N4007", printFill: "#eceff1", printFs: 12,
    comment: ["Black DO-41 rectifier with a silver band at the cathode end (C).", "Anode left, cathode (band) right."] }),
  () => axialDiode({ id: "passive.diode.1n4148", slug: "diode-1n4148", name: "Diode 1N4148", bw: 92, bh: 32, fill: "#c9772f", bandFill: "#111", bandW: 9, print: "1N4148", printFill: "#3e2723", printFs: 9, glass: true,
    comment: ["Small glass DO-35 diode, orange-brown, black band at the cathode end (C).", "Anode left, cathode (band) right."] }),
  () => axialDiode({ id: "passive.diode.1n5819", slug: "diode-1n5819", name: "Schottky diode 1N5819", bw: 124, bh: 48, fill: "#1d1d1d", bandFill: "#b0bec5", print: "1N5819", printFill: "#eceff1", printFs: 12,
    comment: ["Black DO-41 Schottky diode with a grey band at the cathode end (C).", "Anode left, cathode (band) right."] }),
  () => axialDiode({ id: "passive.diode.zener.5v1", slug: "diode-zener-5v1", name: "Zener diode 5.1 V", bw: 98, bh: 34, fill: "#8fbcd0", bandFill: "#111", bandW: 9, print: "5V1", printFill: "#102027", printFs: 11, glass: true,
    comment: ["Glass DO-35 zener (for example BZX55C5V1), black band at the cathode end (C).", "Anode left, cathode (band) right; the zener is normally wired in reverse across the supply."] }),
  to18,
  () => to92({ id: "passive.transistor.2n3904", slug: "transistor-2n3904", name: "NPN transistor 2N3904", mark: ["2N", "3904"], pins: ["E", "B", "C"],
    comment: ["TO-92, flat face toward you, legs down: E, B, C left to right."] }),
  () => to92({ id: "passive.transistor.bc547", slug: "transistor-bc547", name: "NPN transistor BC547", mark: ["BC", "547"], pins: ["C", "B", "E"],
    comment: ["TO-92, flat face toward you, legs down: C, B, E left to right (the reverse of the 2N3904)."] }),
  () => to220({ id: "passive.transistor.tip120", slug: "transistor-tip120", name: "Power NPN transistor TIP120", mark: "TIP120", sub: "NPN Darlington", pins: ["B", "C", "E"], tabText: "tab = C",
    comment: ["TO-220, printed side toward you, legs down: B, C, E left to right. The metal tab is the collector."] }),
  () => to220({ id: "passive.mosfet.irlz44n", slug: "mosfet-irlz44n", name: "Logic-level N-MOSFET IRLZ44N", mark: "IRLZ44N", sub: "N-MOSFET", pins: ["G", "D", "S"], tabText: "tab = D",
    comment: ["TO-220, printed side toward you, legs down: G, D, S left to right. The metal tab is the drain."] }),
  irf520,
  toggle,
  rocker,
  dcJack,
  () => to220({ id: "passive.regulator.7805", slug: "regulator-7805", name: "Voltage regulator 7805", mark: "7805", sub: "5V 1A", pins: ["IN", "GND", "OUT"], tabText: "tab = GND",
    comment: ["TO-220, printed side toward you, legs down: IN, GND, OUT left to right. The metal tab is ground."] }),
  ams1117,
  lm2596,
  mt3608,
  tp4056,
];

export default drawings;
