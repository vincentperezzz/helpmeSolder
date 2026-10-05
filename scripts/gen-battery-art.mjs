// Generates the original CC0 battery / power-source illustrations and the terminal
// geometry table that goes with them.
//
//   node scripts/gen-battery-art.mjs
//
// Writes:
//   public/assets/batteries/<file>.svg      diagram drawing (has term-plus / term-minus ids)
//   public/photos/batteries/<file>.svg      Parts-tab thumbnail (same artwork)
//   src/lib/catalog/battery-geometry.generated.ts   size + wire anchors per drawing
//
// The artwork is generic on purpose: no brand names, logos or branded colours.
// The older hand-made drawings (9V, 2xAA, 3xAA, 18650) are not touched.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_DIR = path.join(root, "public/assets/batteries");
const THUMB_DIR = path.join(root, "public/photos/batteries");
mkdirSync(ASSET_DIR, { recursive: true });
mkdirSync(THUMB_DIR, { recursive: true });

const FONT = 'font-family="ui-monospace, monospace"';
const RED = "#c62828";
const REDD = "#8e0000";
const BLK = "#212121";
const MINUS = "&#8722;";

/** @type {Record<string, { width: number, height: number, plus: [number, number], minus: [number, number], plusExit: [number, number], minusExit: [number, number] }>} */
const geometry = {};

function wrap(id, w, h, label, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">\n  <title>${title} (CC0)</title>\n${body
    .map((line) => `  ${line}`)
    .join("\n")}\n</svg>\n`;
}

function emit(id, file, w, h, label, title, body, g) {
  const text = wrap(id, w, h, label, title, body);
  // Guard: printable ASCII, newlines only.
  if (/[^\x20-\x7e\n]/.test(text)) throw new Error(`${file}: non-ASCII or control character`);
  writeFileSync(path.join(ASSET_DIR, `${file}.svg`), text);
  writeFileSync(path.join(THUMB_DIR, `${file}.svg`), text);
  geometry[id] = { width: w, height: h, ...g };
}

// ---------------------------------------------------------------------------
// Cell packs: n round cells in a plastic holder, snaked in series.
// ---------------------------------------------------------------------------
const SIZES = {
  aa: { w: 40, h: 110, label: "AA" },
  aaa: { w: 30, h: 96, label: "AAA" },
  c: { w: 56, h: 110, label: "C" },
  d: { w: 66, h: 132, label: "D" },
};
const SCHEMES = {
  alk: { body: "#f0e6c8", stroke: "#8d6e63", band: "#c62828", ink: "#5d4037", volts: "1.5V", chem: "ALK", name: "alkaline" },
  nimh: { body: "#b2dfdb", stroke: "#00695c", band: "#00897b", ink: "#004d40", volts: "1.2V", chem: "NiMH", name: "NiMH" },
  li: { body: "#e8eaf6", stroke: "#6a1b9a", band: "#7b1fa2", ink: "#4a148c", volts: "1.5V", chem: "Li", name: "lithium" },
};

function cellPack(id, n, sizeKey, schemeKey) {
  const size = SIZES[sizeKey];
  const sc = SCHEMES[schemeKey];
  const cw = n >= 5 && sizeKey === "aa" ? 36 : size.w;
  const ch = size.h;
  const gap = 8;
  const content = n * cw + (n - 1) * gap;
  const W = Math.max(120, content + 32);
  const x0 = Math.round((W - content) / 2);
  const y0 = 36;
  const y1 = y0 + ch;
  const even = n % 2 === 0;
  const H = y1 + (even ? 22 : 36);
  const cx = (i) => x0 + i * (cw + gap) + cw / 2;
  const body = [];
  body.push(
    `<rect x="${x0 - 8}" y="${y0 - 6}" width="${content + 16}" height="${ch + 12}" rx="10" fill="#eceff1" stroke="#90a4ae" stroke-width="1.5"/>`,
  );
  for (let i = 0; i < n; i++) {
    const plusUp = i % 2 === 0;
    const x = x0 + i * (cw + gap);
    body.push(
      `<rect x="${x}" y="${y0}" width="${cw}" height="${ch}" rx="8" fill="${sc.body}" stroke="${sc.stroke}" stroke-width="1.5"/>`,
    );
    body.push(`<rect x="${x + 5}" y="${y0 + 18}" width="${cw - 10}" height="18" rx="2" fill="${sc.band}"/>`);
    body.push(
      `<text x="${cx(i)}" y="${y0 + 31}" text-anchor="middle" ${FONT} font-size="9" font-weight="700" fill="#ffffff">${sc.volts}</text>`,
    );
    body.push(
      `<text x="${cx(i)}" y="${y0 + 62}" text-anchor="middle" ${FONT} font-size="${sizeKey === "aaa" ? 11 : 13}" fill="${sc.ink}">${size.label}</text>`,
    );
    body.push(
      `<text x="${cx(i)}" y="${y0 + 76}" text-anchor="middle" ${FONT} font-size="8" fill="${sc.ink}">${sc.chem}</text>`,
    );
    // + nub on one end, flat - on the other. Neighbouring cells face opposite ways.
    const nubY = plusUp ? y0 - 6 : y1;
    body.push(`<rect x="${cx(i) - 6}" y="${nubY}" width="12" height="6" rx="1.5" fill="#b0bec5" stroke="#78909c" stroke-width="1"/>`);
    const plusY = plusUp ? y0 + 10 : y1 - 6;
    const minusY = plusUp ? y1 - 6 : y0 + 10;
    body.push(`<text x="${cx(i)}" y="${plusY}" text-anchor="middle" ${FONT} font-size="10" fill="${RED}">+</text>`);
    body.push(`<text x="${cx(i)}" y="${minusY}" text-anchor="middle" ${FONT} font-size="10" fill="${BLK}">${MINUS}</text>`);
  }
  // Series straps between neighbours.
  for (let i = 0; i < n - 1; i++) {
    if (i % 2 === 0) {
      body.push(`<path d="M${cx(i)} ${y1} V${y1 + 12} H${cx(i + 1)} V${y1 + 6}" fill="none" stroke="#546e7a" stroke-width="2"/>`);
    } else {
      body.push(`<path d="M${cx(i)} ${y0} V${y0 - 12} H${cx(i + 1)} V${y0 - 6}" fill="none" stroke="#546e7a" stroke-width="2"/>`);
    }
  }
  // Leads and terminal tabs.
  const plusX = cx(0);
  body.push(`<path d="M${plusX} ${y0 - 6} V16" fill="none" stroke="${RED}" stroke-width="2"/>`);
  body.push(`<rect id="term-plus" x="${plusX - 12}" y="4" width="24" height="12" rx="2" fill="${RED}" stroke="${REDD}" stroke-width="1.5"/>`);
  body.push(`<text x="${plusX - 18}" y="14" text-anchor="middle" ${FONT} font-size="11" fill="${RED}">+</text>`);
  let minus;
  let minusExit;
  const minusX = cx(n - 1);
  if (even) {
    body.push(`<path d="M${minusX} ${y0} V16" fill="none" stroke="${BLK}" stroke-width="2"/>`);
    body.push(`<rect id="term-minus" x="${minusX - 12}" y="4" width="24" height="12" rx="2" fill="${BLK}" stroke="#000" stroke-width="1.5"/>`);
    body.push(`<text x="${minusX + 18}" y="14" text-anchor="middle" ${FONT} font-size="11" fill="${BLK}">${MINUS}</text>`);
    minus = [minusX, 10];
    minusExit = [0, -1];
  } else {
    body.push(`<path d="M${minusX} ${y1} V${y1 + 15}" fill="none" stroke="${BLK}" stroke-width="2"/>`);
    body.push(`<rect id="term-minus" x="${minusX - 18}" y="${y1 + 14}" width="36" height="10" rx="2" fill="${BLK}" stroke="#000" stroke-width="1.5"/>`);
    body.push(`<text x="${minusX - 26}" y="${y1 + 24}" text-anchor="middle" ${FONT} font-size="11" fill="${BLK}">${MINUS}</text>`);
    minus = [minusX, y1 + 19];
    minusExit = [0, 1];
  }
  const file = id.replace(/_/g, "-");
  emit(
    id,
    file,
    W,
    H,
    `${n} ${size.label} ${sc.name} cells in a holder`,
    `${n}x ${size.label} ${sc.name} cell holder`,
    body,
    { plus: [plusX, 10], minus, plusExit: [0, -1], minusExit },
  );
}

for (const [id, n, size, scheme] of [
  ["battery_1aa", 1, "aa", "alk"],
  ["battery_4aa", 4, "aa", "alk"],
  ["battery_6aa", 6, "aa", "alk"],
  ["battery_2aaa", 2, "aaa", "alk"],
  ["battery_3aaa", 3, "aaa", "alk"],
  ["battery_4aaa", 4, "aaa", "alk"],
  ["battery_1c", 1, "c", "alk"],
  ["battery_1d", 1, "d", "alk"],
  ["battery_2d", 2, "d", "alk"],
  ["battery_2aa_nimh", 2, "aa", "nimh"],
  ["battery_3aa_nimh", 3, "aa", "nimh"],
  ["battery_4aa_nimh", 4, "aa", "nimh"],
  ["battery_6aa_nimh", 6, "aa", "nimh"],
  ["battery_2aaa_nimh", 2, "aaa", "nimh"],
  ["battery_3aaa_nimh", 3, "aaa", "nimh"],
  ["battery_4aaa_nimh", 4, "aaa", "nimh"],
  ["battery_2aa_lithium", 2, "aa", "li"],
  ["battery_3aa_lithium", 3, "aa", "li"],
  ["battery_2aaa_lithium", 2, "aaa", "li"],
  ["battery_3aaa_lithium", 3, "aaa", "li"],
]) {
  cellPack(id, n, size, scheme);
}

// ---------------------------------------------------------------------------
// Single cylindrical cells in the same frame as the 18650 drawing (120 x 180).
// ---------------------------------------------------------------------------
function cylinder(id, o) {
  const cx = 60;
  const body = [];
  body.push(`<rect x="${cx - o.w / 2}" y="${o.y0}" width="${o.w}" height="${o.y1 - o.y0}" rx="${o.rx}" fill="${o.fill}" stroke="${o.stroke}" stroke-width="1.5"/>`);
  body.push(`<rect x="${cx - o.w / 2 + 6}" y="${o.y0 + 12}" width="${o.w - 12}" height="${o.y1 - o.y0 - 24}" rx="6" fill="${o.inner}"/>`);
  const mid = (o.y0 + o.y1) / 2;
  o.lines.forEach((line, i) => {
    const y = mid + (i - (o.lines.length - 1) / 2) * 13 + 4;
    body.push(`<text x="${cx}" y="${y}" text-anchor="middle" ${FONT} font-size="${line.size}" ${line.bold ? 'font-weight="700" ' : ""}fill="${o.ink}">${line.text}</text>`);
  });
  body.push(`<circle id="term-plus" cx="${cx}" cy="14" r="8" fill="${RED}" stroke="${REDD}" stroke-width="1.5"/>`);
  body.push(`<circle cx="${cx}" cy="14" r="4" fill="#ef5350"/>`);
  body.push(`<text x="${cx}" y="8" text-anchor="middle" ${FONT} font-size="11" fill="${RED}">+</text>`);
  body.push(`<path d="M${cx} 22 V${o.y0}" stroke="${RED}" stroke-width="2.5"/>`);
  body.push(`<rect id="term-minus" x="${cx - 22}" y="158" width="44" height="12" rx="2" fill="${BLK}" stroke="#000" stroke-width="1.5"/>`);
  body.push(`<text x="${cx}" y="178" text-anchor="middle" ${FONT} font-size="11" fill="${BLK}">${MINUS}</text>`);
  body.push(`<path d="M${cx} ${o.y1} V158" stroke="${BLK}" stroke-width="2.5"/>`);
  emit(id, id.replace(/_/g, "-"), 120, 180, o.label, o.title, body, {
    plus: [cx, 14],
    minus: [cx, 164],
    plusExit: [0, -1],
    minusExit: [0, 1],
  });
}

cylinder("battery_21700", {
  w: 70, y0: 28, y1: 152, rx: 12, fill: "#00838f", stroke: "#006064", inner: "#0097a7", ink: "#e0f7fa",
  lines: [{ text: "21700", size: 14, bold: true }, { text: "3.7V", size: 11 }, { text: "Li-ion", size: 9 }],
  label: "21700 Li-ion cell positive top negative bottom", title: "21700 Li-ion cell",
});
cylinder("battery_14500", {
  w: 44, y0: 40, y1: 140, rx: 10, fill: "#eceff1", stroke: "#546e7a", inner: "#cfd8dc", ink: "#b71c1c",
  lines: [{ text: "14500", size: 11, bold: true }, { text: "3.7V", size: 10, bold: true }, { text: "NOT", size: 9, bold: true }, { text: "1.5V", size: 9, bold: true }],
  label: "14500 Li-ion cell, AA size but 3.7 volts, positive top negative bottom", title: "14500 Li-ion cell (AA size, 3.7 V)",
});
cylinder("battery_cr123a", {
  w: 60, y0: 52, y1: 128, rx: 10, fill: "#6d4c41", stroke: "#3e2723", inner: "#8d6e63", ink: "#fff3e0",
  lines: [{ text: "CR123A", size: 11, bold: true }, { text: "3V", size: 11 }, { text: "LITHIUM", size: 8 }],
  label: "CR123A 3 volt lithium cell positive top negative bottom", title: "CR123A lithium cell",
});

// ---------------------------------------------------------------------------
// CR2032 coin cell in a holder, both leads leave from the top.
// ---------------------------------------------------------------------------
{
  const body = [];
  body.push(`<rect x="24" y="38" width="112" height="108" rx="16" fill="#37474f" stroke="#1c262b" stroke-width="1.5"/>`);
  body.push(`<circle cx="80" cy="94" r="44" fill="#263238"/>`);
  body.push(`<circle cx="80" cy="94" r="40" fill="#cfd8dc" stroke="#78909c" stroke-width="1.5"/>`);
  body.push(`<circle cx="80" cy="94" r="30" fill="#b0bec5"/>`);
  body.push(`<text x="80" y="90" text-anchor="middle" ${FONT} font-size="12" font-weight="700" fill="#263238">CR2032</text>`);
  body.push(`<text x="80" y="104" text-anchor="middle" ${FONT} font-size="10" fill="#37474f">3V LITHIUM</text>`);
  body.push(`<text x="80" y="72" text-anchor="middle" ${FONT} font-size="12" fill="${RED}">+</text>`);
  body.push(`<rect x="66" y="38" width="28" height="10" rx="2" fill="#90a4ae"/>`);
  body.push(`<path d="M106 38 V24" fill="none" stroke="${RED}" stroke-width="2"/>`);
  body.push(`<path d="M54 38 V24" fill="none" stroke="${BLK}" stroke-width="2"/>`);
  body.push(`<rect id="term-plus" x="98" y="10" width="16" height="14" rx="2" fill="${RED}" stroke="${REDD}" stroke-width="1.5"/>`);
  body.push(`<rect id="term-minus" x="46" y="10" width="16" height="14" rx="2" fill="${BLK}" stroke="#000" stroke-width="1.5"/>`);
  body.push(`<text x="106" y="8" text-anchor="middle" ${FONT} font-size="11" fill="${RED}">+</text>`);
  body.push(`<text x="54" y="8" text-anchor="middle" ${FONT} font-size="11" fill="${BLK}">${MINUS}</text>`);
  body.push(`<text x="80" y="140" text-anchor="middle" ${FONT} font-size="9" fill="#cfd8dc">coin holder</text>`);
  emit("battery_cr2032", "battery-cr2032", 160, 156, "CR2032 coin cell in a holder with two leads on top", "CR2032 coin cell and holder", body, {
    plus: [106, 17],
    minus: [54, 17],
    plusExit: [0, -1],
    minusExit: [0, -1],
  });
}

// ---------------------------------------------------------------------------
// 1S LiPo flat pouch with a protection board and a JST-PH style lead.
// ---------------------------------------------------------------------------
{
  const body = [];
  body.push(`<rect x="30" y="64" width="100" height="92" rx="6" fill="#e3e8ec" stroke="#78909c" stroke-width="1.5"/>`);
  body.push(`<rect x="30" y="64" width="100" height="14" rx="6" fill="#cfd8dc" stroke="#78909c" stroke-width="1.5"/>`);
  body.push(`<rect x="44" y="92" width="72" height="50" rx="4" fill="#ffffff" stroke="#b0bec5"/>`);
  body.push(`<text x="80" y="112" text-anchor="middle" ${FONT} font-size="13" font-weight="700" fill="#37474f">LiPo 1S</text>`);
  body.push(`<text x="80" y="128" text-anchor="middle" ${FONT} font-size="11" fill="#37474f">3.7V</text>`);
  body.push(`<text x="80" y="140" text-anchor="middle" ${FONT} font-size="8" fill="#c62828">no puncture</text>`);
  body.push(`<rect x="54" y="48" width="52" height="18" rx="2" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.5"/>`);
  body.push(`<rect x="60" y="53" width="10" height="8" fill="#c9a227"/>`);
  body.push(`<rect x="78" y="53" width="20" height="8" fill="#37474f"/>`);
  body.push(`<path d="M93 48 V24" fill="none" stroke="${RED}" stroke-width="2"/>`);
  body.push(`<path d="M67 48 V24" fill="none" stroke="${BLK}" stroke-width="2"/>`);
  body.push(`<rect x="56" y="8" width="50" height="16" rx="2" fill="#f5f5f5" stroke="#90a4ae" stroke-width="1.5"/>`);
  body.push(`<rect id="term-plus" x="87" y="11" width="12" height="10" rx="1" fill="${RED}" stroke="${REDD}" stroke-width="1"/>`);
  body.push(`<rect id="term-minus" x="61" y="11" width="12" height="10" rx="1" fill="${BLK}" stroke="#000" stroke-width="1"/>`);
  body.push(`<text x="93" y="6" text-anchor="middle" ${FONT} font-size="10" fill="${RED}">+</text>`);
  body.push(`<text x="67" y="6" text-anchor="middle" ${FONT} font-size="10" fill="${BLK}">${MINUS}</text>`);
  body.push(`<text x="80" y="170" text-anchor="middle" ${FONT} font-size="8" fill="#546e7a">check JST polarity</text>`);
  emit("battery_lipo_1s", "battery-lipo-1s", 160, 176, "1S LiPo flat pouch cell with protection board and JST connector", "1S LiPo pouch cell with JST lead", body, {
    plus: [93, 16],
    minus: [67, 16],
    plusExit: [0, -1],
    minusExit: [0, -1],
  });
}

// ---------------------------------------------------------------------------
// 2S LiPo pack (two cells in series, 7.4 V) with a main lead and a balance lead.
// ---------------------------------------------------------------------------
{
  const body = [];
  body.push(`<rect x="24" y="64" width="122" height="92" rx="8" fill="#1976d2" stroke="#0d47a1" stroke-width="1.5"/>`);
  body.push(`<path d="M85 66 V154" stroke="#0d47a1" stroke-width="1.5" stroke-dasharray="4 3"/>`);
  body.push(`<rect x="34" y="82" width="102" height="48" rx="4" fill="#e3f2fd" stroke="#90caf9"/>`);
  body.push(`<text x="85" y="102" text-anchor="middle" ${FONT} font-size="13" font-weight="700" fill="#0d47a1">LiPo 2S</text>`);
  body.push(`<text x="85" y="118" text-anchor="middle" ${FONT} font-size="12" fill="#0d47a1">7.4V</text>`);
  body.push(`<text x="85" y="144" text-anchor="middle" ${FONT} font-size="8" fill="#e3f2fd">2 cells in series</text>`);
  body.push(`<path d="M104 64 V30" fill="none" stroke="${RED}" stroke-width="2.5"/>`);
  body.push(`<path d="M72 64 V30" fill="none" stroke="${BLK}" stroke-width="2.5"/>`);
  body.push(`<rect x="60" y="10" width="56" height="20" rx="3" fill="#fbc02d" stroke="#f57f17" stroke-width="1.5"/>`);
  body.push(`<rect id="term-plus" x="94" y="14" width="14" height="12" rx="1" fill="${RED}" stroke="${REDD}" stroke-width="1"/>`);
  body.push(`<rect id="term-minus" x="68" y="14" width="14" height="12" rx="1" fill="${BLK}" stroke="#000" stroke-width="1"/>`);
  body.push(`<text x="101" y="8" text-anchor="middle" ${FONT} font-size="10" fill="${RED}">+</text>`);
  body.push(`<text x="75" y="8" text-anchor="middle" ${FONT} font-size="10" fill="${BLK}">${MINUS}</text>`);
  body.push(`<path d="M36 64 V50 H20 V40" fill="none" stroke="#9e9e9e" stroke-width="1.5"/>`);
  body.push(`<rect x="10" y="26" width="22" height="14" rx="2" fill="#f5f5f5" stroke="#90a4ae"/>`);
  body.push(`<text x="21" y="22" text-anchor="middle" ${FONT} font-size="7" fill="#546e7a">balance</text>`);
  body.push(`<text x="85" y="172" text-anchor="middle" ${FONT} font-size="8" fill="#546e7a">charge with a 2S balance charger</text>`);
  emit("battery_lipo_2s", "battery-lipo-2s", 170, 178, "2S LiPo pack, 7.4 volts, with main lead and balance lead", "2S LiPo pack", body, {
    plus: [101, 20],
    minus: [75, 20],
    plusExit: [0, -1],
    minusExit: [0, -1],
  });
}

// ---------------------------------------------------------------------------
// Barrel-jack wall supply (9 V / 12 V) with a plug-to-screw-terminal adapter.
// ---------------------------------------------------------------------------
function barrel(id, volts, color, stroke) {
  const body = [];
  body.push(`<rect x="22" y="16" width="14" height="10" rx="1" fill="#90a4ae"/>`);
  body.push(`<rect x="50" y="16" width="14" height="10" rx="1" fill="#90a4ae"/>`);
  body.push(`<rect x="10" y="24" width="68" height="56" rx="8" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>`);
  body.push(`<text x="44" y="50" text-anchor="middle" ${FONT} font-size="10" fill="#ffffff">DC OUT</text>`);
  body.push(`<text x="44" y="68" text-anchor="middle" ${FONT} font-size="14" font-weight="700" fill="#ffffff">${volts}V</text>`);
  body.push(`<path d="M78 52 H112" fill="none" stroke="${BLK}" stroke-width="3"/>`);
  body.push(`<rect x="112" y="24" width="52" height="56" rx="4" fill="#1565c0" stroke="#0d47a1" stroke-width="1.5"/>`);
  body.push(`<text x="134" y="56" text-anchor="middle" ${FONT} font-size="8" fill="#e3f2fd">DC plug</text>`);
  body.push(`<text x="134" y="66" text-anchor="middle" ${FONT} font-size="8" fill="#e3f2fd">adapter</text>`);
  body.push(`<rect id="term-plus" x="160" y="28" width="18" height="14" rx="2" fill="${RED}" stroke="${REDD}" stroke-width="1.5"/>`);
  body.push(`<rect id="term-minus" x="160" y="62" width="18" height="14" rx="2" fill="${BLK}" stroke="#000" stroke-width="1.5"/>`);
  body.push(`<text x="172" y="24" text-anchor="middle" ${FONT} font-size="11" fill="${RED}">+</text>`);
  body.push(`<text x="172" y="90" text-anchor="middle" ${FONT} font-size="11" fill="${BLK}">${MINUS}</text>`);
  body.push(`<text x="10" y="104" ${FONT} font-size="8" fill="#546e7a">centre pin + outer sleeve ${MINUS}</text>`);
  emit(id, id.replace(/_/g, "-"), 190, 110, `${volts} volt DC wall supply with barrel plug and screw block`, `${volts} V DC barrel supply`, body, {
    plus: [172, 35],
    minus: [172, 69],
    plusExit: [1, 0],
    minusExit: [1, 0],
  });
}
barrel("supply_barrel_9v", 9, "#546e7a", "#37474f");
barrel("supply_barrel_12v", 12, "#455a64", "#263238");

// ---------------------------------------------------------------------------
// USB power bank thumbnail (drawn in the diagram by the built-in USB visual).
// ---------------------------------------------------------------------------
{
  const body = [];
  body.push(`<rect x="30" y="20" width="100" height="126" rx="14" fill="#546e7a" stroke="#263238" stroke-width="1.5"/>`);
  body.push(`<rect x="38" y="28" width="84" height="64" rx="8" fill="#37474f"/>`);
  body.push(`<text x="80" y="56" text-anchor="middle" ${FONT} font-size="12" font-weight="700" fill="#eceff1">POWER BANK</text>`);
  body.push(`<text x="80" y="74" text-anchor="middle" ${FONT} font-size="11" fill="#b0bec5">5V USB</text>`);
  for (let i = 0; i < 4; i++) {
    body.push(`<circle cx="${52 + i * 18}" cy="108" r="4" fill="${i < 3 ? "#66bb6a" : "#cfd8dc"}"/>`);
  }
  body.push(`<rect x="62" y="126" width="36" height="12" rx="2" fill="#263238"/>`);
  body.push(`<rect x="68" y="129" width="24" height="6" rx="1" fill="#0d1417"/>`);
  writeFileSync(
    path.join(THUMB_DIR, "power-bank.svg"),
    wrap("power_bank", 160, 160, "USB power bank", "USB power bank", body),
  );
}

// ---------------------------------------------------------------------------
// Geometry table for the catalog.
// ---------------------------------------------------------------------------
const rows = Object.entries(geometry)
  .map(([id, g]) => {
    const pt = (p) => `{ x: ${p[0]}, y: ${p[1]} }`;
    const ex = (p) => `{ dx: ${p[0]}, dy: ${p[1]} }`;
    return `  ${id}: {\n    width: ${g.width},\n    height: ${g.height},\n    terminals: {\n      plus: ${pt(g.plus)},\n      minus: ${pt(g.minus)},\n      plusExit: ${ex(g.plusExit)},\n      minusExit: ${ex(g.minusExit)},\n    },\n  },`;
  })
  .join("\n");
writeFileSync(
  path.join(root, "src/lib/catalog/battery-geometry.generated.ts"),
  `// Generated by scripts/gen-battery-art.mjs. Do not edit by hand.\n// Size of each drawing in public/assets/batteries and where its + and - wires attach.\nimport type { BatteryTerminals } from "./batteries";\n\nexport type BatteryGeometry = { width: number; height: number; terminals: BatteryTerminals };\n\nexport const BATTERY_GEOMETRY = {\n${rows}\n} as const satisfies Record<string, BatteryGeometry>;\n`,
);
console.log(`wrote ${Object.keys(geometry).length} drawings`);
