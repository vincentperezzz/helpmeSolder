// Actuators: motors, fan, steppers and drivers, relays, solenoid, audio, LED strips and other outputs.
import { holeClass, esc, r1 } from "./_lib.mjs";
import { rowHeader } from "./_helpers.mjs";

/** Drawing helpers that take millimetres and scale them to SVG units (k units per mm). */
function kit(k, ox = 10, oy = 10) {
  const X = (v) => r1(ox + v * k);
  const Y = (v) => r1(oy + v * k);
  const D = (v) => r1(v * k);
  const at = (o) =>
    `${o.fill ? ` fill="${o.fill}"` : ""}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 1}"` : ""}${o.cls ? ` class="${o.cls}"` : ""}${o.op ? ` opacity="${o.op}"` : ""}`;
  const rect = (x, y, w, h, fill, o = {}) =>
    `  <rect x="${X(x)}" y="${Y(y)}" width="${D(w)}" height="${D(h)}"${o.rx != null ? ` rx="${D(o.rx)}"` : ""}${at({ ...o, fill })}/>`;
  const circ = (x, y, r, fill, o = {}) => `  <circle cx="${X(x)}" cy="${Y(y)}" r="${D(r)}"${at({ ...o, fill })}/>`;
  const text = (x, y, s, o = {}) => {
    const px = X(x);
    const py = Y(y);
    const rot = o.rot ? ` transform="rotate(${o.rot} ${px} ${py})"` : "";
    const st = o.dark ? ` style="fill:#263238"` : "";
    return `  <text class="${o.cls ?? "label"}" x="${px}" y="${py}" text-anchor="${o.anchor ?? "middle"}" font-size="${o.size ?? 6}"${o.bold ? ` font-weight="bold"` : ""}${rot}${st}>${esc(s)}</text>`;
  };
  const mount = (x, y, r = 1.1) => `  <circle cx="${X(x)}" cy="${Y(y)}" r="${D(r)}" fill="#f5f5f5" stroke="#c9a227" stroke-width="2"/>`;
  /** A pin hole (units radius) with the colour its label implies. */
  const hole = (x, y, label, r = 5, extra = "") => `  <circle class="${holeClass(label)}" cx="${X(x)}" cy="${Y(y)}" r="${r}"${extra}/>`;
  const pt = (x, y) => ({ x: X(x), y: Y(y) });
  /** Screw terminal: poles along x (entry on top/bottom edge) or along y (entry on right/left edge). */
  const block = (x, y, n, { vertical = false, pitch = 5, depth = 8.5, edge = vertical ? "right" : "top", color = "#2e9e4f" } = {}) => {
    const out = [];
    const poles = [];
    const w = vertical ? depth : pitch * n;
    const h = vertical ? pitch * n : depth;
    out.push(rect(x, y, w, h, color, { rx: 0.4, stroke: "#1b5e20", sw: 1 }));
    for (let i = 0; i < n; i++) {
      const cx = vertical ? x + depth * (edge === "right" ? 0.38 : 0.62) : x + pitch * (i + 0.5);
      const cy = vertical ? y + pitch * (i + 0.5) : y + depth * (edge === "top" ? 0.6 : 0.4);
      const ex = vertical ? (edge === "right" ? x + depth - 2.2 : x) : cx - 1.5;
      const ey = vertical ? cy - 1.5 : edge === "top" ? y : y + depth - 2.2;
      out.push(rect(ex, ey, vertical ? 2.2 : 3, vertical ? 3 : 2.2, "#102a14"));
      out.push(circ(cx, cy, 1.8, "#cfd8dc", { stroke: "#546e7a", sw: 1 }));
      out.push(`  <path d="M${X(cx - 1.1)} ${Y(cy)} H${X(cx + 1.1)}" stroke="#546e7a" stroke-width="1.4"/>`);
      poles.push(pt(cx, cy));
    }
    return { svg: out.join("\n"), poles };
  };
  const chipK = (x, y, w, h, label, { fs = 5, rot = 0 } = {}) => {
    const cx = X(x + w / 2);
    const cy = Y(y + h / 2);
    return [
      `  <g${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""}>`,
      `    <rect class="chip" x="${X(x)}" y="${Y(y)}" width="${D(w)}" height="${D(h)}" rx="1.2"/>`,
      `    <circle cx="${X(x) + 4}" cy="${Y(y) + 4}" r="1.3" fill="#555"/>`,
      label ? `    <text class="label" x="${cx}" y="${cy + fs / 3}" text-anchor="middle" font-size="${fs}">${esc(label)}</text>` : "",
      `  </g>`,
    ].join("\n");
  };
  const smdK = (x, y, w = 1.6, h = 0.9) => `  <rect class="smd" x="${X(x)}" y="${Y(y)}" width="${D(w)}" height="${D(h)}" rx="0.6"/>`;
  const ledK = (x, y, color, label) =>
    [
      `  <circle cx="${X(x)}" cy="${Y(y)}" r="3.4" fill="${color}" stroke="#00000066" stroke-width="0.6"/>`,
      label ? `  <text class="label" x="${X(x)}" y="${Y(y) + 11}" text-anchor="middle" font-size="5">${esc(label)}</text>` : "",
    ].join("\n");
  return { X, Y, D, rect, circ, text, mount, hole, pt, block, chipK, smdK, ledK };
}

/** A wire tail: dark insulation outline, coloured core and a tinned tip. */
const wire = (d, color, tip) =>
  [
    `  <path d="${d}" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="7.5" stroke-linecap="round"/>`,
    `  <path d="${d}" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round"/>`,
    `  <circle cx="${tip[0]}" cy="${tip[1]}" r="3.6" fill="#e0e0e0" stroke="#607d8b" stroke-width="1"/>`,
  ].join("\n");

const BLUE = ["#1f56b0", "#143c80"];
const RED = ["#c62828", "#7f1717"];

// ---------------------------------------------------------------- motors, fan, solenoid, speaker, siren

function dcMotor() {
  const body = [
    // shaft and bushing
    `  <rect class="metal" x="214" y="74" width="46" height="12" rx="2"/>`,
    `  <rect x="196" y="60" width="20" height="40" rx="3" fill="#90a4ae" stroke="#546e7a"/>`,
    // can
    `  <rect x="62" y="30" width="136" height="100" rx="12" fill="#cfd8dc" stroke="#607d8b" stroke-width="2"/>`,
    `  <rect x="62" y="36" width="136" height="10" rx="5" fill="#ffffff" opacity="0.45"/>`,
    `  <rect x="62" y="114" width="136" height="12" rx="6" fill="#78909c" opacity="0.35"/>`,
    `  <path d="M150 30 V130 M154 30 V130" stroke="#90a4ae" stroke-width="1"/>`,
    `  <text x="106" y="76" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" font-weight="bold" fill="#263238">RF-130</text>`,
    `  <text x="106" y="92" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" fill="#37474f">3-6V DC</text>`,
    // black end cap with two solder tabs
    `  <rect x="44" y="40" width="20" height="80" rx="5" fill="#263238" stroke="#000"/>`,
    `  <rect class="metal" x="30" y="56" width="18" height="7" rx="1"/>`,
    `  <rect class="metal" x="30" y="97" width="18" height="7" rx="1"/>`,
    wire("M34 60 C22 60 24 40 8 40", "#d32f2f", [8, 40]),
    wire("M34 100 C22 100 24 120 8 120", "#212121", [8, 120]),
  ].join("\n");
  return {
    id: "module.motor.dc",
    kind: "module",
    file: "modules/motor-dc.svg",
    caption: "DC hobby motor (3-6 V)",
    title: "DC hobby motor top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Silver 130-size can, black rear cap with two solder tabs and a wire soldered to each; shaft on the right.",
      "Terminals are the two wire tips (M1 top, M2 bottom). The motor has no polarity.",
    ],
    width: 270,
    height: 160,
    body,
    terminals: { M1: { x: 8, y: 40 }, M2: { x: 8, y: 120 } },
    pinExit: { dx: -1, dy: 0 },
  };
}

function vibrationMotor() {
  const body = [
    `  <circle cx="100" cy="86" r="64" fill="#b0bec5" stroke="#607d8b" stroke-width="2"/>`,
    `  <circle cx="100" cy="86" r="52" fill="#cfd8dc" stroke="#90a4ae"/>`,
    `  <circle cx="100" cy="86" r="14" fill="#90a4ae" opacity="0.5"/>`,
    `  <path d="M60 60 A48 48 0 0 1 140 60" fill="none" stroke="#fff" stroke-width="5" opacity="0.5"/>`,
    `  <text x="100" y="124" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#37474f">3V  10x3</text>`,
    // flex tail with two solder pads
    `  <rect x="82" y="138" width="36" height="34" rx="3" fill="#8d6e3b" stroke="#5d4630"/>`,
    `  <circle cx="92" cy="162" r="5" fill="#d9b44a" stroke="#a07d1c"/>`,
    `  <circle cx="108" cy="162" r="5" fill="#d9b44a" stroke="#a07d1c"/>`,
    wire("M92 162 C92 196 78 204 78 238", "#d32f2f", [78, 238]),
    wire("M108 162 C108 196 122 204 122 238", "#212121", [122, 238]),
  ].join("\n");
  return {
    id: "module.motor.vibration",
    kind: "module",
    file: "modules/motor-vibration.svg",
    caption: "Coin vibration motor",
    title: "Coin vibration motor top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "10 mm silver disc with a short flex tail and two soldered wires: red is V+, black is GND.",
    ],
    width: 200,
    height: 252,
    body,
    terminals: { "V+": { x: 78, y: 238 }, GND: { x: 122, y: 238 } },
    pinExit: { dx: 0, dy: 1 },
  };
}

function fan5v() {
  const blades = [];
  for (let i = 0; i < 7; i++) {
    blades.push(
      `    <path transform="rotate(${r1((360 / 7) * i)})" d="M-10 -30 C-34 -66 -24 -98 28 -106 C42 -78 32 -52 14 -30 Z" fill="#455a64" stroke="#1c262b" stroke-width="1.5"/>`,
    );
  }
  const body = [
    `  <rect x="20" y="10" width="240" height="240" rx="16" fill="#263238" stroke="#000" stroke-width="2"/>`,
    `  <circle cx="140" cy="130" r="112" fill="#1b2428" stroke="#37474f" stroke-width="2"/>`,
    ...[
      [38, 28],
      [242, 28],
      [38, 232],
      [242, 232],
    ].map(([x, y]) => `  <circle cx="${x}" cy="${y}" r="7" fill="#f5f5f5" stroke="#546e7a" stroke-width="2"/>`),
    `  <g transform="translate(140 130)">`,
    ...blades,
    `    <circle r="34" fill="#37474f" stroke="#000"/>`,
    `    <circle r="24" fill="#eceff1" stroke="#90a4ae"/>`,
    `    <text y="-2" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" font-weight="bold" fill="#263238">5V DC</text>`,
    `    <text y="9" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="#37474f">0.1A</text>`,
    `  </g>`,
    // cable grommet and two wires
    `  <rect x="196" y="246" width="44" height="12" rx="3" fill="#111" stroke="#000"/>`,
    wire("M208 254 C208 284 196 292 196 322", "#d32f2f", [196, 322]),
    wire("M228 254 C228 284 240 292 240 322", "#212121", [240, 322]),
  ].join("\n");
  return {
    id: "module.fan.5v",
    kind: "module",
    file: "modules/fan-5v.svg",
    caption: "Mini fan (5 V, 2-wire)",
    title: "Mini 5 V fan top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "40 mm square brushless fan, seven blades, four corner holes. Cable leaves the bottom edge: red is V+, black is GND.",
    ],
    width: 280,
    height: 340,
    body,
    terminals: { "V+": { x: 196, y: 322 }, GND: { x: 240, y: 322 } },
    pinExit: { dx: 0, dy: 1 },
  };
}

function solenoid12v() {
  const winding = [];
  for (let i = 0; i < 12; i++) winding.push(`M${72 + i * 8} 40 V100`);
  const body = [
    // open frame
    `  <rect x="52" y="22" width="132" height="96" rx="6" fill="#b0bec5" stroke="#607d8b" stroke-width="2"/>`,
    `  <rect x="60" y="30" width="116" height="80" rx="3" fill="#78909c" opacity="0.5"/>`,
    // bobbin and copper winding
    `  <rect x="64" y="34" width="104" height="72" rx="4" fill="#1b1b1b"/>`,
    `  <rect x="68" y="38" width="96" height="64" rx="2" fill="#c77b2a" stroke="#8a4f12"/>`,
    `  <path d="${winding.join(" ")}" stroke="#8a4f12" stroke-width="1" opacity="0.7"/>`,
    // plunger
    `  <rect class="metal" x="170" y="58" width="82" height="24" rx="3"/>`,
    `  <circle cx="240" cy="70" r="5" fill="#f5f5f5" stroke="#607d8b" stroke-width="1.5"/>`,
    `  <rect x="176" y="52" width="6" height="36" rx="2" fill="#546e7a"/>`,
    `  <text x="116" y="136" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" fill="#37474f">12V DC</text>`,
    wire("M68 56 C40 56 36 44 10 44", "#d32f2f", [10, 44]),
    wire("M68 86 C40 86 36 96 10 96", "#212121", [10, 96]),
  ].join("\n");
  return {
    id: "module.solenoid.12v",
    kind: "module",
    file: "modules/solenoid-12v.svg",
    caption: "12 V push-pull solenoid",
    title: "12 V open-frame solenoid top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Open-frame solenoid: steel frame, copper coil on a black bobbin, plunger on the right, two wire tails on the left.",
      "Terminals: V+ (red, top) and SW (black, bottom). The coil has no polarity but the app keeps V+ on the supply.",
    ],
    width: 262,
    height: 148,
    body,
    terminals: { "V+": { x: 10, y: 44 }, SW: { x: 10, y: 96 } },
    pinExit: { dx: -1, dy: 0 },
  };
}

function speaker8ohm() {
  const body = [
    // basket with mounting ears
    `  <circle cx="130" cy="120" r="112" fill="#37474f" stroke="#000" stroke-width="2"/>`,
    ...[45, 135, 225, 315].map((a) => {
      const x = r1(130 + 100 * Math.cos((a * Math.PI) / 180));
      const y = r1(120 + 100 * Math.sin((a * Math.PI) / 180));
      return `  <circle cx="${x}" cy="${y}" r="6" fill="#f5f5f5" stroke="#90a4ae" stroke-width="2"/>`;
    }),
    // cone surround and cone
    `  <circle cx="130" cy="120" r="84" fill="#212121" stroke="#546e7a" stroke-width="2"/>`,
    `  <circle cx="130" cy="120" r="72" fill="#cfc7b8" stroke="#8d8573" stroke-width="1.5"/>`,
    `  <circle cx="130" cy="120" r="56" fill="none" stroke="#8d8573" stroke-width="1" opacity="0.6"/>`,
    `  <circle cx="130" cy="120" r="40" fill="none" stroke="#8d8573" stroke-width="1" opacity="0.6"/>`,
    `  <circle cx="130" cy="120" r="24" fill="#b9b09f" stroke="#8d8573" stroke-width="1.5"/>`,
    `  <text x="130" y="124" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#263238">8 OHM</text>`,
    // two solder tabs on the rim and their wires
    `  <rect class="metal" x="104" y="226" width="18" height="12" rx="1.5"/>`,
    `  <rect class="metal" x="138" y="226" width="18" height="12" rx="1.5"/>`,
    wire("M113 234 C113 262 100 272 100 304", "#d32f2f", [100, 304]),
    wire("M147 234 C147 262 160 272 160 304", "#212121", [160, 304]),
    `  <text x="86" y="296" text-anchor="end" font-family="ui-monospace, monospace" font-size="9" fill="#37474f">+</text>`,
    `  <text x="174" y="296" font-family="ui-monospace, monospace" font-size="9" fill="#37474f">-</text>`,
  ].join("\n");
  return {
    id: "module.speaker.8ohm",
    kind: "module",
    file: "modules/speaker-8ohm.svg",
    caption: "Small 8 ohm speaker",
    title: "Small 8 ohm speaker top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Round steel-basket speaker with a paper cone; two solder tabs at the bottom with a red (+) and a black (-) wire tail.",
    ],
    width: 260,
    height: 320,
    body,
    terminals: { "SPK+": { x: 100, y: 304 }, "SPK-": { x: 160, y: 304 } },
    pinExit: { dx: 0, dy: 1 },
  };
}

function siren() {
  const body = [
    // box and mounting ears
    `  <rect x="20" y="180" width="160" height="50" rx="6" fill="#263238" stroke="#000" stroke-width="2"/>`,
    `  <circle cx="34" cy="205" r="6" fill="#f5f5f5" stroke="#546e7a" stroke-width="2"/>`,
    `  <circle cx="166" cy="205" r="6" fill="#f5f5f5" stroke="#546e7a" stroke-width="2"/>`,
    `  <text x="100" y="208" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#eceff1">12V  110dB</text>`,
    // horn seen from the front: rings
    `  <circle cx="100" cy="100" r="84" fill="#1b2428" stroke="#000" stroke-width="2"/>`,
    `  <circle cx="100" cy="100" r="70" fill="#2f3b41" stroke="#0e1417"/>`,
    `  <circle cx="100" cy="100" r="52" fill="#263238" stroke="#0e1417"/>`,
    `  <circle cx="100" cy="100" r="34" fill="#1b2428" stroke="#0e1417"/>`,
    `  <circle cx="100" cy="100" r="16" fill="#455a64" stroke="#0e1417"/>`,
    `  <path d="M52 62 A60 60 0 0 1 112 42" fill="none" stroke="#90a4ae" stroke-width="4" opacity="0.45" stroke-linecap="round"/>`,
    // wires from the back of the box
    `  <rect x="86" y="228" width="28" height="9" rx="3" fill="#111"/>`,
    wire("M94 234 C94 258 82 268 82 296", "#d32f2f", [82, 296]),
    wire("M106 234 C106 258 118 268 118 296", "#212121", [118, 296]),
  ].join("\n");
  return {
    id: "module.siren.alarm",
    kind: "module",
    file: "modules/siren-alarm.svg",
    caption: "Alarm siren (red V+, black GND)",
    title: "Alarm siren top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Black horn siren: flared horn seen from the front, box behind it with two mounting ears, red (V+) and black (GND) leads out the back.",
    ],
    width: 200,
    height: 310,
    body,
    terminals: { "V+": { x: 82, y: 296 }, GND: { x: 118, y: 296 } },
    pinExit: { dx: 0, dy: 1 },
  };
}

// ---------------------------------------------------------------- steppers and drivers

function stepper28byj48() {
  const colors = ["#1e88e5", "#ec407a", "#fdd835", "#fb8c00", "#e53935"];
  const wires = colors.map((c, i) => {
    const x0 = 101 + i * 7;
    const x1 = 89 + i * 13;
    return `  <path d="M${x0} 158 C${x0} 186 ${x1} 190 ${x1} 216" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`;
  });
  const holes = [
    ["IN1", 56],
    ["IN2", 76],
    ["IN3", 96],
    ["IN4", 116],
  ];
  const terminals = {};
  const pins = [];
  const y = 392;
  pins.push(`  <rect x="45" y="${y - 9}" width="82" height="18" rx="2" fill="#1b1b1b"/>`);
  for (const [id, x] of holes) {
    terminals[id] = { x, y };
    pins.push(`  <circle class="hole" cx="${x}" cy="${y}" r="5.5"/>`);
    pins.push(`  <text class="label" x="${x}" y="${y - 13}" text-anchor="middle" font-size="7">${id}</text>`);
  }
  pins.push(`  <rect x="139" y="${y - 9}" width="42" height="18" rx="2" fill="#1b1b1b"/>`);
  terminals.GND = { x: 150, y };
  terminals.VCC = { x: 170, y };
  pins.push(`  <circle class="hole gnd" style="stroke:#9e9e9e" cx="150" cy="${y}" r="5.5"/>`);
  pins.push(`  <circle class="hole pwr" cx="170" cy="${y}" r="5.5"/>`);
  pins.push(`  <text class="label" x="150" y="${y - 13}" text-anchor="middle" font-size="8">-</text>`);
  pins.push(`  <text class="label" x="170" y="${y - 13}" text-anchor="middle" font-size="8">+</text>`);
  const legs = [];
  for (let i = 0; i < 8; i++) {
    legs.push(`  <rect class="smd" x="${70 + i * 12}" y="270" width="4" height="6"/>`);
    legs.push(`  <rect class="smd" x="${70 + i * 12}" y="308" width="4" height="6"/>`);
  }
  const body = [
    // motor
    `  <rect x="18" y="62" width="194" height="32" rx="14" fill="#a9b6c4" stroke="#607d8b"/>`,
    `  <circle cx="32" cy="78" r="6" fill="#f5f5f5" stroke="#607d8b" stroke-width="1.5"/>`,
    `  <circle cx="198" cy="78" r="6" fill="#f5f5f5" stroke="#607d8b" stroke-width="1.5"/>`,
    `  <circle cx="115" cy="78" r="70" fill="#3f6db5" stroke="#27487f" stroke-width="2"/>`,
    `  <circle cx="115" cy="78" r="56" fill="#4a7bc6" stroke="#27487f"/>`,
    `  <circle cx="115" cy="52" r="17" fill="#cfd8dc" stroke="#607d8b" stroke-width="1.5"/>`,
    `  <circle cx="115" cy="52" r="8" fill="#eceff1" stroke="#607d8b"/>`,
    `  <path d="M111 52 h8" stroke="#607d8b" stroke-width="1.5"/>`,
    `  <text x="115" y="112" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#eceff1">28BYJ-48  5V</text>`,
    `  <rect x="97" y="140" width="36" height="18" rx="3" fill="#2b4f8e" stroke="#1b3463"/>`,
    ...wires,
    // white 5-pin plug on the board
    `  <rect x="80" y="214" width="70" height="24" rx="3" fill="#f5f5f5" stroke="#9e9e9e"/>`,
    `  <rect x="104" y="214" width="22" height="5" rx="1" fill="#cfcfcf"/>`,
    ...colors.map((_, i) => `  <circle cx="${89 + i * 13}" cy="228" r="2.4" fill="#b0b0b0"/>`),
    // driver board
    `  <rect x="30" y="222" width="170" height="194" rx="5" fill="#1b5ab5" stroke="#143c80" stroke-width="2"/>`,
    `  <rect x="80" y="214" width="70" height="24" rx="3" fill="#f5f5f5" stroke="#9e9e9e"/>`,
    `  <rect x="104" y="214" width="22" height="5" rx="1" fill="#cfcfcf"/>`,
    ...colors.map((_, i) => `  <circle cx="${89 + i * 13}" cy="228" r="2.4" fill="#b0b0b0"/>`),
    ...legs,
    `  <rect class="chip" x="66" y="276" width="98" height="32" rx="2"/>`,
    `  <path d="M66 288 a4 4 0 0 1 0 8" fill="#1b5ab5"/>`,
    `  <text class="label" x="116" y="296" text-anchor="middle" font-size="8">ULN2003A</text>`,
    ...["A", "B", "C", "D"].map(
      (l, i) =>
        `  <circle cx="${74 + i * 24}" cy="336" r="4.5" fill="#ff7043" stroke="#00000066"/><text class="label" x="${74 + i * 24}" y="351" text-anchor="middle" font-size="6">${l}</text>`,
    ),
    // power jumper
    `  <rect x="178" y="326" width="14" height="26" rx="2" fill="#212121"/>`,
    `  <rect x="181" y="330" width="8" height="8" fill="#9e9e9e"/>`,
    `  <text class="label" x="171" y="342" text-anchor="end" font-size="6">EN</text>`,
    ...pins,
  ].join("\n");
  return {
    id: "module.stepper.28byj48",
    kind: "module",
    file: "modules/stepper-28byj48.svg",
    caption: "28BYJ-48 stepper motor with ULN2003 driver board",
    title: "28BYJ-48 stepper and ULN2003 driver top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue geared motor on top with its 5-wire cable plugged into the white socket of the ULN2003 board; ULN2003A chip, LEDs A-D,",
      "power jumper. Bottom edge, left to right: IN1 IN2 IN3 IN4, then - and + (motor supply).",
    ],
    width: 230,
    height: 430,
    body,
    terminals,
    pinExit: { dx: 0, dy: 1 },
  };
}

function stepperDriver({ id, file, caption, title, name, color, left, right, comment }) {
  const pitch = 22;
  const y0 = 42;
  const lx = 24;
  const rx = 156;
  const L = rowHeader({ pins: left, x: lx, y: y0, pitch, dir: "y", side: "right", plastic: false });
  const R = rowHeader({ pins: right, x: rx, y: y0, pitch, dir: "y", side: "left", plastic: false });
  const body = [
    `  <rect x="10" y="10" width="160" height="224" rx="4" fill="${color[0]}" stroke="${color[1]}" stroke-width="2"/>`,
    L.svg,
    R.svg,
    // chip with its small stick-on heatsink
    `  <rect class="chip" x="72" y="64" width="38" height="38" rx="2"/>`,
    ...[0, 1, 2, 3, 4, 5].map((i) => `  <path d="M72 ${72 + i * 6} H110" stroke="#454545" stroke-width="1.4"/>`),
    `  <rect x="72" y="64" width="38" height="38" rx="2" fill="none" stroke="#6a6a6a" stroke-width="1"/>`,
    // tan caps and resistors
    `  <rect class="smd" x="74" y="116" width="10" height="6" rx="1"/>`,
    `  <rect class="smd" x="98" y="116" width="10" height="6" rx="1"/>`,
    `  <rect class="smd" x="74" y="126" width="10" height="6" rx="1"/>`,
    `  <rect class="smd" x="98" y="126" width="6" height="4" rx="1"/>`,
    `  <rect x="82" y="42" width="18" height="12" rx="2" fill="#bdbdbd" stroke="#757575"/>`,
    // current-limit trimmer
    `  <circle cx="91" cy="166" r="13" fill="#d4a84b" stroke="#8a6a1e" stroke-width="1.5"/>`,
    `  <path d="M82 166 H100 M91 157 V175" stroke="#7a5a14" stroke-width="2"/>`,
    `  <text class="label" x="91" y="205" text-anchor="middle" font-size="10" font-weight="bold">${name}</text>`,
  ].join("\n");
  return {
    id,
    kind: "module",
    file,
    caption,
    title,
    comment,
    width: 180,
    height: 244,
    body,
    terminals: { ...L.terminals, ...R.terminals },
  };
}

const a4988 = () =>
  stepperDriver({
    id: "module.driver.a4988",
    file: "modules/driver-a4988.svg",
    caption: "A4988 stepper driver",
    title: "A4988 stepper driver top view (original simplified drawing, CC0)",
    name: "A4988",
    color: RED,
    left: [
      { label: "ENABLE", id: "ENABLE" },
      { label: "MS1", id: "MS1" },
      { label: "MS2", id: "MS2" },
      { label: "MS3", id: "MS3" },
      { label: "RESET", id: "RESET" },
      { label: "SLEEP", id: "SLEEP" },
      { label: "STEP", id: "STEP" },
      { label: "DIR", id: "DIR" },
    ],
    right: [
      { label: "VMOT", id: "VMOT" },
      { label: "GND", id: "GND" },
      { label: "2B", id: "2B" },
      { label: "2A", id: "2A" },
      { label: "1A", id: "1A" },
      { label: "1B", id: "1B" },
      { label: "VDD", id: "VDD" },
      { label: "GND", id: "GND2" },
    ],
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Red 15 x 20 mm carrier, 8 pins per long side, black stick-on heatsink on the chip, brass current trimmer.",
      "Left column top to bottom: ENABLE MS1 MS2 MS3 RESET SLEEP STEP DIR. Right: VMOT GND 2B 2A 1A 1B VDD GND (Pololu order).",
    ],
  });

const drv8825 = () =>
  stepperDriver({
    id: "module.driver.drv8825",
    file: "modules/driver-drv8825.svg",
    caption: "DRV8825 stepper driver",
    title: "DRV8825 stepper driver top view (original simplified drawing, CC0)",
    name: "DRV8825",
    color: ["#5e35b1", "#3a2070"],
    left: [
      { label: "ENABLE", id: "ENABLE" },
      { label: "M0", id: "M0" },
      { label: "M1", id: "M1" },
      { label: "M2", id: "M2" },
      { label: "RESET", id: "RESET" },
      { label: "SLEEP", id: "SLEEP" },
      { label: "STEP", id: "STEP" },
      { label: "DIR", id: "DIR" },
    ],
    right: [
      { label: "VMOT", id: "VMOT" },
      { label: "GND", id: "GND" },
      { label: "2B", id: "2B" },
      { label: "2A", id: "2A" },
      { label: "1A", id: "1A" },
      { label: "1B", id: "1B" },
      { label: "FAULT", id: "FAULT" },
      { label: "GND", id: "GND2" },
    ],
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Purple 15 x 20 mm carrier, 8 pins per long side, black stick-on heatsink on the chip, brass current trimmer.",
      "Left column top to bottom: ENABLE M0 M1 M2 RESET SLEEP STEP DIR. Right: VMOT GND 2B 2A 1A 1B FAULT GND (Pololu order).",
      "Differs from the A4988: FAULT and M0 replace VDD, and the last pin is the logic GND.",
    ],
  });

function l298n() {
  const k = 6.5;
  const g = kit(k, 12, 12);
  const { rect, circ, text, mount, hole, pt, block } = g;
  const out = [];
  out.push(rect(0, 0, 43, 43, "#c62828", { rx: 1.5, stroke: "#7f1717", sw: 2 }));
  for (const [x, y] of [
    [2.6, 2.6],
    [40.4, 2.6],
    [2.6, 40.4],
    [41.2, 41.2],
  ])
    out.push(mount(x, y));
  const A = block(4.5, 0.4, 2, { depth: 8.9, edge: "top" });
  const B = block(28.5, 0.4, 2, { depth: 8.9, edge: "top" });
  out.push(A.svg, B.svg);
  out.push(text(7, 10.9, "OUT1", { size: 5.5 }), text(12, 10.9, "OUT2", { size: 5.5 }), text(31, 10.9, "OUT3", { size: 5.5 }), text(36, 10.9, "OUT4", { size: 5.5 }));
  out.push(text(21.5, 10.9, "L298N", { size: 6, bold: true }));
  // motor-output diodes
  for (let i = 0; i < 4; i++) {
    out.push(rect(2, 13.5 + i * 2.2, 2.6, 1.3, "#1b1b1b"));
    out.push(rect(39.4, 13.5 + i * 2.2, 2.6, 1.3, "#1b1b1b"));
  }
  // tall black heatsink with fins (the L298N sits under it)
  out.push(rect(14.5, 12.3, 17, 18.6, "#1a1a1a", { rx: 0.5, stroke: "#000", sw: 1.5 }));
  for (let i = 0; i < 12; i++) out.push(rect(14.9, 13 + i * 1.5, 16.2, 0.5, "#454545"));
  // two electrolytic caps right of the heatsink
  for (const cy of [16.5, 24]) {
    out.push(circ(35.6, cy, 2.5, "#263238", { stroke: "#000", sw: 1 }));
    out.push(`  <path d="M${g.X(34.2)} ${g.Y(cy)} a${g.D(1.4)} ${g.D(1.4)} 0 0 1 ${g.D(2.8)} 0" fill="#b0bec5"/>`);
  }
  // 78M05 regulator and power LED
  out.push(rect(20, 35.3, 5, 3.6, "#1a1a1a", { rx: 0.3, stroke: "#000", sw: 1 }));
  out.push(rect(20.4, 34.6, 4.2, 0.9, "#9e9e9e"));
  out.push(text(22.5, 41.8, "78M05", { size: 4.5 }));
  out.push(g.ledK(33.5, 32.8, "#ff5252", ""));
  // power terminal: 12V GND 5V
  const P = block(3.5, 33.8, 3, { depth: 8.9, edge: "bottom" });
  out.push(P.svg);
  out.push(text(6, 33.1, "12V", { size: 5.5 }), text(11, 33.1, "GND", { size: 5.5 }), text(16, 33.1, "5V", { size: 5.5 }));
  // header ENA IN1 IN2 IN3 IN4 ENB with the two enable jumpers above ENA and ENB
  const names = ["ENA", "IN1", "IN2", "IN3", "IN4", "ENB"];
  const terminals = { VS: P.poles[0], GND: P.poles[1], "5V": P.poles[2], OUT1: A.poles[0], OUT2: A.poles[1], OUT3: B.poles[0], OUT4: B.poles[1] };
  out.push(rect(25.4, 38.0, 15.6, 2.4, "#1b1b1b"));
  names.forEach((n, i) => {
    const x = 26.5 + i * 2.54;
    out.push(hole(x, 39.2, n, 4.2));
    out.push(text(x, 41.9, n, { size: 4.6 }));
    terminals[n] = pt(x, 39.2);
  });
  for (const x of [26.5, 39.2]) {
    out.push(rect(x - 0.7, 34.2, 1.4, 3.4, "#1b1b1b"));
    out.push(rect(x - 1.1, 34.0, 2.2, 3.2, "#ffd54f", { rx: 0.3, stroke: "#b28900", sw: 0.8 }));
  }
  return {
    id: "module.driver.l298n",
    kind: "module",
    file: "modules/driver-l298n.svg",
    caption: "L298N dual H-bridge motor driver board",
    title: "L298N motor driver board top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Red 43 x 43 mm board: motor A (OUT1/OUT2) and motor B (OUT3/OUT4) screw terminals on the top edge, tall black heatsink,",
      "12V / GND / 5V power terminal bottom left, header ENA IN1 IN2 IN3 IN4 ENB bottom right with yellow enable jumpers.",
      "Layout is the most common version; some boards swap the sides of the terminals.",
    ],
    width: r1(43 * k + 24),
    height: r1(43 * k + 24),
    body: out.join("\n"),
    terminals,
  };
}

function l293d() {
  const pitch = 24;
  const y0 = 46;
  const bx = 95;
  const bw = 60;
  const left = ["1 EN1,2", "2 IN1", "3 OUT1", "4 GND", "5 GND", "6 OUT2", "7 IN2", "8 VCC2"];
  const right = ["16 VCC1", "15 IN4", "14 OUT4", "13 GND", "12 GND", "11 OUT3", "10 IN3", "9 EN3,4"];
  const lid = ["EN12", "IN1", "OUT1", "GND4", "GND5", "OUT2", "IN2", "VCC2"];
  const rid = ["VCC1", "IN4", "OUT4", "GND13", "GND12", "OUT3", "IN3", "EN34"];
  const terminals = {};
  const parts = [];
  left.forEach((label, i) => {
    const y = y0 + i * pitch;
    parts.push(`  <rect x="76" y="${y - 3.5}" width="${bx - 76}" height="7" rx="1" fill="#cfd8dc" stroke="#607d8b" stroke-width="0.8"/>`);
    parts.push(`  <circle class="${holeClass(label.replace(/^\d+ /, ""))}" cx="80" cy="${y}" r="4.5"/>`);
    parts.push(`  <text x="70" y="${y + 3}" text-anchor="end" font-family="ui-monospace, monospace" font-size="8" fill="#263238">${esc(label)}</text>`);
    terminals[lid[i]] = { x: 80, y };
  });
  right.forEach((label, i) => {
    const y = y0 + (7 - i) * pitch;
    const rx0 = bx + bw;
    parts.push(`  <rect x="${rx0}" y="${y - 3.5}" width="${bx - 76}" height="7" rx="1" fill="#cfd8dc" stroke="#607d8b" stroke-width="0.8"/>`);
    parts.push(`  <circle class="${holeClass(label.replace(/^\d+ /, ""))}" cx="170" cy="${y}" r="4.5"/>`);
    parts.push(`  <text x="180" y="${y + 3}" text-anchor="start" font-family="ui-monospace, monospace" font-size="8" fill="#263238">${esc(label)}</text>`);
    terminals[rid[7 - i]] = { x: 170, y };
  });
  // reorder so right-hand labels read 16 at the top: index i maps to row (7 - i)
  const body = [
    `  <rect x="4" y="6" width="252" height="248" rx="10" fill="#eceff1" stroke="#b0bec5"/>`,
    ...parts,
    `  <rect class="chip" x="${bx}" y="26" width="${bw}" height="208" rx="3"/>`,
    `  <path d="M${bx + bw / 2 - 8} 26 a8 8 0 0 0 16 0" fill="#3a3a3a"/>`,
    `  <circle cx="${bx + 12}" cy="44" r="3" fill="#555"/>`,
    `  <text class="label" x="${bx + bw / 2}" y="130" text-anchor="middle" font-size="12" font-weight="bold" transform="rotate(90 ${bx + bw / 2} 130)">L293D</text>`,
    `  <text class="label" x="${bx + bw / 2}" y="206" text-anchor="middle" font-size="7" opacity="0.7" transform="rotate(90 ${bx + bw / 2} 206)">DIP-16</text>`,
  ].join("\n");
  return {
    id: "module.driver.l293d",
    kind: "module",
    file: "modules/driver-l293d.svg",
    caption: "L293D dual H-bridge (DIP-16)",
    title: "L293D DIP-16 chip top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "DIP-16 with the notch at the top. Left leads top to bottom are pins 1-8, right leads are 16 down to 9.",
      "Terminals sit on the lead tips. Labels are on a light card behind the chip.",
    ],
    width: 260,
    height: 260,
    body,
    terminals,
  };
}

function tb6612() {
  const pitch = 20.3;
  const y0 = 42;
  const left = [
    { label: "VM", id: "VM" },
    { label: "VCC", id: "VCC" },
    { label: "GND", id: "GND" },
    { label: "AO1", id: "AO1" },
    { label: "AO2", id: "AO2" },
    { label: "BO2", id: "BO2" },
    { label: "BO1", id: "BO1" },
    { label: "GND" },
  ];
  const right = [
    { label: "PWMA", id: "PWMA" },
    { label: "AIN2", id: "AIN2" },
    { label: "AIN1", id: "AIN1" },
    { label: "STBY", id: "STBY" },
    { label: "BIN1", id: "BIN1" },
    { label: "BIN2", id: "BIN2" },
    { label: "PWMB", id: "PWMB" },
    { label: "GND" },
  ];
  const L = rowHeader({ pins: left, x: 24, y: y0, pitch, dir: "y", side: "right", plastic: false });
  const R = rowHeader({ pins: right, x: 146, y: y0, pitch, dir: "y", side: "left", plastic: false });
  const body = [
    `  <rect x="10" y="10" width="150" height="196" rx="4" fill="${RED[0]}" stroke="${RED[1]}" stroke-width="2"/>`,
    L.svg,
    R.svg,
    `  <rect class="chip" x="76" y="62" width="28" height="56" rx="2"/>`,
    `  <circle cx="82" cy="68" r="1.8" fill="#666"/>`,
    `  <text class="label" x="90" y="92" text-anchor="middle" font-size="7" transform="rotate(-90 90 92)">TB6612FNG</text>`,
    `  <rect x="74" y="130" width="14" height="14" rx="3" fill="#cfd8dc" stroke="#78909c"/>`,
    `  <rect x="74" y="130" width="14" height="4" fill="#546e7a"/>`,
    `  <rect class="smd" x="94" y="132" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="94" y="142" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="76" y="152" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="94" y="152" width="9" height="5" rx="1"/>`,
    `  <text class="label" x="90" y="190" text-anchor="middle" font-size="7">MOTOR DRIVER</text>`,
  ].join("\n");
  return {
    id: "module.driver.tb6612fng",
    kind: "module",
    file: "modules/driver-tb6612fng.svg",
    caption: "TB6612FNG dual motor driver",
    title: "TB6612FNG motor driver breakout top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Red breakout, 8 pins per side. Left top to bottom: VM VCC GND AO1 AO2 BO2 BO1 GND. Right: PWMA AIN2 AIN1 STBY BIN1 BIN2 PWMB GND.",
      "The catalog has one GND pin; it is wired to the first GND (left, third from top). The other GND pins are not wired.",
    ],
    width: 170,
    height: 216,
    body,
    terminals: { ...L.terminals, ...R.terminals },
  };
}

// ---------------------------------------------------------------- relays

const relayCube = (g, x, y, w, h, fs) =>
  [
    g.rect(x, y, w, h, "#2f86d9", { rx: 0.6, stroke: "#0d47a1", sw: 1.5 }),
    g.rect(x + 0.8, y + 0.8, w - 1.6, h - 1.6, "none", { rx: 0.4, stroke: "#1565c0", sw: 0.8 }),
    g.text(x + w / 2, y + h * 0.4, fs < 5 ? "SRD-05VDC" : "SRD-05VDC-SL-C", { size: fs, bold: true }),
    g.text(x + w / 2, y + h * 0.4 + fs * 1.5 / 6 * 1.0 + 1.0, fs < 5 ? "10A 250VAC" : "10A 250VAC 10A 30VDC", { size: fs - 1.6 }),
    g.text(x + w / 2, y + h * 0.4 + fs * 3 / 6 + 1.4, "SONGLE", { size: fs - 1.6 }),
  ].join("\n");

/** One-channel relay and SSR modules: header on the left, load terminal on the right. */
function sideRelay({ id, file, ssr }) {
  const k = 6;
  const g = kit(k, 10, 10);
  const { rect, circ, text, mount, hole, pt, block } = g;
  const col = ssr ? RED : BLUE;
  const out = [rect(0, 0, 50, 26, col[0], { rx: 1.2, stroke: col[1], sw: 2 })];
  for (const [x, y] of [
    [2.2, 2.2],
    [47.8, 2.2],
    [2.2, 23.8],
    [47.8, 23.8],
  ])
    out.push(mount(x, y));
  const terminals = {};
  [
    ["VCC", "VCC"],
    ["GND", "GND"],
    ["IN", "IN"],
  ].forEach(([label, pid], i) => {
    const y = 9.5 + i * 3.5;
    out.push(hole(4.6, y, label, 5));
    out.push(text(6.4, y + 0.55, label, { size: 6, anchor: "start" }));
    terminals[pid] = pt(4.6, y);
  });
  out.push(rect(3.0, 8.0, 3.2, 12.2, "#1b1b1b", { op: "0.0" }));
  if (ssr) {
    out.push(rect(14, 4.5, 21, 16, "#f5f5f5", { rx: 0.8, stroke: "#9e9e9e", sw: 1.5 }));
    out.push(rect(15.2, 5.7, 18.6, 13.6, "none", { rx: 0.5, stroke: "#cfcfcf", sw: 0.8 }));
    out.push(text(24.5, 10.5, "SSR-G3MB", { size: 6, bold: true, dark: true }));
    out.push(text(24.5, 13.2, "5VDC IN", { size: 4.8, dark: true }));
    out.push(text(24.5, 15.6, "240VAC 2A OUT", { size: 4.8, dark: true }));
    for (const px of [16.5, 21, 28, 32.5]) out.push(rect(px, 20.4, 0.8, 1.6, "#b0bec5"));
  } else {
    out.push(relayCube(g, 15, 4.5, 19, 15.5, 6));
  }
  // optocoupler, driver transistor, flyback diode
  out.push(g.chipK(9.4, 21.2, 4.6, 3.4, "817", { fs: 4 }));
  out.push(g.chipK(ssr ? 18 : 17, 21.4, 2.8, 2.3, "", {}));
  out.push(g.smdK(22, 22.2));
  out.push(g.smdK(24.5, 22.2));
  out.push(g.smdK(27, 22.2));
  // indicator LEDs
  out.push(g.ledK(31, 23.0, "#ff5252", ""));
  out.push(g.ledK(35.2, 23.0, ssr ? "#ff5252" : "#69f0ae", ""));
  const T = block(40.3, ssr ? 5.2 : 5.5, ssr ? 2 : 3, { vertical: true, edge: "right", depth: 8.6 });
  out.push(T.svg);
  const names = ssr ? ["LOAD1", "LOAD2"] : ["NO", "COM", "NC"];
  names.forEach((n, i) => {
    out.push(text(40.1, (T.poles[i].y - 10) / k + 0.6, n, { size: 5.4, anchor: "end" }));
    terminals[ssr ? ["LOAD1", "LOAD2"][i] : ["NO", "COM", "NC"][i]] = T.poles[i];
  });
  return {
    id,
    kind: "module",
    file,
    caption: ssr ? "Solid-state relay module" : "Relay module 1-channel (5 V)",
    title: ssr ? "Solid-state relay module top view (original simplified drawing, CC0)" : "1-channel relay module top view (original simplified drawing, CC0)",
    comment: ssr
      ? [
          "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
          "Red board, white SSR block, 3-pin control header (VCC GND IN) on the left, 2-pole load terminal on the right.",
        ]
      : [
          "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
          "Blue board, blue SRD-05VDC relay cube, optocoupler and LEDs. Control header on the left, top to bottom: VCC GND IN.",
          "Load screw terminal on the right, top to bottom: NO COM NC. Printed order varies a little between makers.",
        ],
    width: 320,
    height: 176,
    body: out.join("\n"),
    terminals,
  };
}

/** Two- and four-channel relay modules: terminals on top, relays below, header along the bottom. */
function multiRelay({ n, id, file, k, boardW, boardH, relW, relH, pitch, x0, relY, hdr, hdrY }) {
  const g = kit(k, 8, 8);
  const { rect, text, mount, hole, pt, block } = g;
  const out = [rect(0, 0, boardW, boardH, BLUE[0], { rx: 1.2, stroke: BLUE[1], sw: 2 })];
  for (const [x, y] of [
    [1.8, 1.8],
    [boardW - 1.8, 1.8],
    [1.8, boardH - 1.8],
    [boardW - 1.8, boardH - 1.8],
  ])
    out.push(mount(x, y));
  const terminals = {};
  for (let i = 0; i < n; i++) {
    const rx = x0 + i * pitch;
    const T = block(rx + relW / 2 - 7.5, 1.2, 3, { edge: "top", depth: 8.6 });
    out.push(T.svg);
    ["NO", "COM", "NC"].forEach((nm, j) => {
      out.push(text(rx + relW / 2 - 7.5 + 2.5 + j * 5, 11.2, nm, { size: k > 5 ? 5.4 : 4.6 }));
      terminals[`${nm}${i + 1}`] = T.poles[j];
    });
    out.push(relayCube(g, rx, relY, relW, relH, k > 5 ? 6 : 4.8));
    // optocoupler, transistor, LED under each relay
    const by = k > 5 ? relY + relH + 0.6 : relY + relH + 2.2;
    out.push(g.chipK(rx + 0.6, by, 4.6, k > 5 ? 2.8 : 3.4, "817", { fs: 3.2 }));
    out.push(g.chipK(rx + 7, by + 0.4, 2.8, 2.3, "", {}));
    out.push(g.smdK(rx + 11, by + 0.4));
    out.push(g.smdK(rx + 13, by + 0.4));
    out.push(g.ledK(rx + relW - 1.6, by + 1.7, "#ff5252", ""));
  }
  // control header along the bottom edge: pins then the 3-pin JD-VCC jumper
  let x = hdr.x;
  const fs = 4.6;
  out.push(rect(hdr.x - 1.5, hdrY - 1.5, 3.4 * (hdr.pins.length - 1) + 3, 3, "#1b1b1b"));
  hdr.pins.forEach((label, i) => {
    const px = hdr.x + i * 3.4;
    out.push(hole(px, hdrY, label, k > 5 ? 5 : 4.2));
    out.push(text(px, hdrY + 3.1, label, { size: fs }));
    terminals[label] = pt(px, hdrY);
  });
  x = hdr.x + 3.4 * hdr.pins.length + 3;
  const jd = ["JD-VCC", "VCC", "GND"];
  out.push(rect(x - 1.5, hdrY - 1.5, 3.4 * 2 + 3, 3, "#1b1b1b"));
  jd.forEach((label, i) => {
    const px = x + i * 3.4;
    out.push(hole(px, hdrY, label, k > 5 ? 5 : 4.2));
    out.push(text(px, hdrY + 3.1, label, { size: fs - 0.4 }));
    if (i === 0) terminals["JD-VCC"] = pt(px, hdrY);
  });
  out.push(rect(x - 1.3, hdrY - 1.3, 5.3, 2.6, "#ffd54f", { rx: 0.4, stroke: "#b28900", sw: 0.8, op: "0.9" }));
  const w = r1(boardW * k + 16);
  const h = r1(boardH * k + 16);
  return {
    id,
    kind: "module",
    file,
    caption: `Relay module ${n}-channel (5 V)`,
    title: `${n}-channel relay module top view (original simplified drawing, CC0)`,
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      `Blue board, ${n} blue SRD-05VDC relay cubes, optocouplers and LEDs. Screw terminals along the top edge, each NO COM NC.`,
      `Control header along the bottom, left to right: ${hdr.pins.join(" ")}, then the JD-VCC / VCC / GND jumper pins with the yellow jumper cap fitted on JD-VCC and VCC.`,
      "Printed pin order and terminal order differ a little between makers.",
    ],
    width: w,
    height: h,
    body: out.join("\n"),
    terminals,
  };
}

const relay1 = () => sideRelay({ id: "module.relay.1ch", file: "modules/relay-1ch.svg", ssr: false });
const relaySsr = () => sideRelay({ id: "module.relay.ssr", file: "modules/relay-ssr.svg", ssr: true });
const relay2 = () =>
  multiRelay({
    n: 2,
    id: "module.relay.2ch",
    file: "modules/relay-2ch.svg",
    k: 6.4,
    boardW: 50,
    boardH: 38,
    relW: 19,
    relH: 15.5,
    pitch: 23,
    x0: 3,
    relY: 12.8,
    hdr: { x: 4.5, pins: ["GND", "IN1", "IN2", "VCC"] },
    hdrY: 34.4,
  });
const relay4 = () =>
  multiRelay({
    n: 4,
    id: "module.relay.4ch",
    file: "modules/relay-4ch.svg",
    k: 4.5,
    boardW: 75,
    boardH: 55,
    relW: 15.5,
    relH: 19,
    pitch: 18.2,
    x0: 1.4,
    relY: 12.8,
    hdr: { x: 4.5, pins: ["GND", "IN1", "IN2", "IN3", "IN4", "VCC"] },
    hdrY: 49.6,
  });

// ---------------------------------------------------------------- audio

function pam8403() {
  const top = rowHeader({
    pins: [
      { label: "L+", id: "L+" },
      { label: "L-", id: "L-" },
      { label: "R+", id: "R+" },
      { label: "R-", id: "R-" },
    ],
    x: 44,
    y: 28,
    pitch: 22,
    dir: "x",
    side: "below",
    plastic: false,
  });
  const power = rowHeader({
    pins: [
      { label: "5V", id: "VCC" },
      { label: "GND", id: "GND" },
    ],
    x: 36,
    y: 176,
    pitch: 20,
    dir: "x",
    side: "above",
    plastic: false,
  });
  const audio = rowHeader({
    pins: [{ label: "L", id: "L" }, { label: "G" }, { label: "R", id: "R" }],
    x: 120,
    y: 176,
    pitch: 20,
    dir: "x",
    side: "above",
    plastic: false,
  });
  const pins = [];
  for (let i = 0; i < 8; i++) {
    pins.push(`  <rect class="smd" x="${70 + i * 5.6}" y="85" width="3" height="3"/>`);
    pins.push(`  <rect class="smd" x="${70 + i * 5.6}" y="107" width="3" height="3"/>`);
  }
  const body = [
    `  <rect x="10" y="10" width="190" height="180" rx="5" fill="${BLUE[0]}" stroke="${BLUE[1]}" stroke-width="2"/>`,
    top.svg,
    power.svg,
    audio.svg,
    ...pins,
    `  <rect class="chip" x="66" y="88" width="48" height="19" rx="2"/>`,
    `  <circle cx="71" cy="93" r="1.5" fill="#666"/>`,
    `  <text class="label" x="92" y="100" text-anchor="middle" font-size="7">8403</text>`,
    // volume potentiometer
    `  <circle cx="150" cy="104" r="26" fill="#263238" stroke="#000" stroke-width="1.5"/>`,
    `  <circle cx="150" cy="104" r="17" fill="#cfd8dc" stroke="#607d8b"/>`,
    `  <path d="M142 112 L158 96" stroke="#546e7a" stroke-width="3" stroke-linecap="round"/>`,
    `  <text class="label" x="150" y="140" text-anchor="middle" font-size="6">VOL</text>`,
    `  <rect class="smd" x="70" y="124" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="84" y="124" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="98" y="124" width="9" height="5" rx="1"/>`,
    `  <rect x="68" y="136" width="14" height="14" rx="3" fill="#263238" stroke="#000"/>`,
    `  <rect x="68" y="136" width="14" height="4" fill="#b0bec5"/>`,
  ].join("\n");
  return {
    id: "module.amp.pam8403",
    kind: "module",
    file: "modules/amp-pam8403.svg",
    caption: "PAM8403 stereo amplifier module",
    title: "PAM8403 amplifier module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Small blue board: speaker pads L+ L- R+ R- on the top edge, power 5V GND and audio L G R on the bottom edge, 8403 chip, round volume pot.",
      "The audio ground pad G is joined to GND on the real board, so only the power GND is wired.",
      "Pad order varies by board; this is the most common version.",
    ],
    width: 210,
    height: 200,
    body,
    terminals: { ...top.terminals, ...power.terminals, ...audio.terminals },
  };
}

function lm386() {
  const left = rowHeader({
    pins: [{ label: "VCC", id: "VCC" }, { label: "GND", id: "GND" }, { label: "IN", id: "IN" }],
    x: 28,
    y: 62,
    pitch: 20,
    dir: "y",
    side: "right",
    plastic: false,
  });
  const right = rowHeader({
    pins: [{ label: "OUT", id: "OUT" }, { label: "GND" }],
    x: 292,
    y: 72,
    pitch: 22,
    dir: "y",
    side: "left",
    plastic: false,
  });
  const legs = [];
  for (let i = 0; i < 4; i++) {
    legs.push(`  <rect class="metal" x="${126 + i * 16}" y="130" width="5" height="8"/>`);
    legs.push(`  <rect class="metal" x="${126 + i * 16}" y="86" width="5" height="8"/>`);
  }
  const body = [
    `  <rect x="10" y="10" width="300" height="150" rx="5" fill="${BLUE[0]}" stroke="${BLUE[1]}" stroke-width="2"/>`,
    left.svg,
    right.svg,
    // big blue multi-turn trimmer
    `  <rect x="96" y="24" width="76" height="40" rx="3" fill="#1e88e5" stroke="#0d47a1" stroke-width="1.5"/>`,
    `  <circle cx="132" cy="44" r="12" fill="#d4a84b" stroke="#8a6a1e" stroke-width="1.5"/>`,
    `  <path d="M124 44 H140 M132 36 V52" stroke="#7a5a14" stroke-width="2"/>`,
    `  <text class="label" x="184" y="48" font-size="6">VOL</text>`,
    // DIP-8 chip
    ...legs,
    `  <rect class="chip" x="120" y="92" width="62" height="40" rx="2"/>`,
    `  <path d="M120 104 a5 5 0 0 1 0 10" fill="${BLUE[0]}"/>`,
    `  <text class="label" x="153" y="115" text-anchor="middle" font-size="9" font-weight="bold">LM386</text>`,
    // two electrolytic capacitors seen from above, plus small parts
    `  <circle cx="232" cy="52" r="17" fill="#263238" stroke="#000" stroke-width="1.5"/>`,
    `  <path d="M232 35 a17 17 0 0 1 0 34 z" fill="#78909c" opacity="0.7"/>`,
    `  <circle cx="232" cy="108" r="17" fill="#263238" stroke="#000" stroke-width="1.5"/>`,
    `  <path d="M232 91 a17 17 0 0 1 0 34 z" fill="#78909c" opacity="0.7"/>`,
    `  <rect class="smd" x="72" y="128" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="86" y="128" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="196" y="76" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="196" y="136" width="9" height="5" rx="1"/>`,
    `  <text class="label" x="153" y="150" text-anchor="middle" font-size="6">AUDIO AMP</text>`,
  ].join("\n");
  return {
    id: "module.amp.lm386",
    kind: "module",
    file: "modules/amp-lm386.svg",
    caption: "LM386 mono amplifier module",
    title: "LM386 amplifier module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Blue board with the DIP-8 LM386, a big blue volume trimmer and two electrolytic caps.",
      "Left header top to bottom: VCC GND IN. Right speaker pads: OUT and GND (the module's GND is shared; only the left GND is wired).",
    ],
    width: 320,
    height: 170,
    body,
    terminals: { ...left.terminals, ...right.terminals },
  };
}

function dfplayer() {
  const left = [
    { label: "VCC", id: "VCC" },
    { label: "RX", id: "RX" },
    { label: "TX", id: "TX" },
    { label: "DAC_R", id: "DAC_R" },
    { label: "DAC_L", id: "DAC_L" },
    { label: "SPK_1", id: "SPK_1" },
    { label: "GND", id: "GND" },
    { label: "SPK_2", id: "SPK_2" },
  ];
  const right = [
    { label: "BUSY", id: "BUSY" },
    { label: "USB-", id: "USB-" },
    { label: "USB+", id: "USB+" },
    { label: "ADKEY2", id: "ADKEY2" },
    { label: "ADKEY1", id: "ADKEY1" },
    { label: "IO2", id: "IO2" },
    { label: "GND", id: "GND2" },
    { label: "IO1", id: "IO1" },
  ];
  const L = rowHeader({ pins: left, x: 24, y: 42, pitch: 22.9, dir: "y", side: "right", plastic: false });
  const R = rowHeader({ pins: right, x: 186, y: 42, pitch: 22.9, dir: "y", side: "left", plastic: false });
  const fix = (s) => s.replaceAll('class="hole gnd"', 'class="hole gnd" style="stroke:#9e9e9e"');
  const body = [
    `  <rect x="10" y="10" width="190" height="212" rx="4" fill="#1b1b1b" stroke="#000" stroke-width="2"/>`,
    fix(L.svg),
    fix(R.svg),
    // microSD holder
    `  <rect x="66" y="12" width="78" height="76" rx="2" fill="#cfd8dc" stroke="#78909c" stroke-width="1.5"/>`,
    `  <rect x="72" y="14" width="66" height="12" rx="1" fill="#37474f"/>`,
    `  <path d="M72 40 H138 M72 56 H138" stroke="#b0bec5" stroke-width="1"/>`,
    `  <text x="105" y="68" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" fill="#37474f">microSD</text>`,
    // controller, memory and passives
    `  <rect class="chip" x="82" y="104" width="42" height="42" rx="2" fill="#2a2a2a"/>`,
    `  <circle cx="89" cy="111" r="2" fill="#777"/>`,
    `  <text class="label" x="103" y="128" text-anchor="middle" font-size="6">DFPlayer</text>`,
    `  <rect class="chip" x="86" y="152" width="34" height="14" rx="1.5"/>`,
    `  <rect class="smd" x="70" y="170" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="84" y="170" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="98" y="170" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="112" y="170" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="70" y="182" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="126" y="182" width="9" height="5" rx="1"/>`,
    `  <text class="label" x="103" y="208" text-anchor="middle" font-size="8" font-weight="bold">DFPlayer</text>`,
    `  <text class="label" x="103" y="217" text-anchor="middle" font-size="6">MINI</text>`,
  ].join("\n");
  return {
    id: "module.mp3.dfplayer",
    kind: "module",
    file: "modules/mp3-dfplayer.svg",
    caption: "DFPlayer Mini MP3 module",
    title: "DFPlayer Mini MP3 module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Black 20 x 20 mm board with the microSD holder at the top and 8 pins per side.",
      "Left top to bottom: VCC RX TX DAC_R DAC_L SPK_1 GND SPK_2. Right: BUSY USB- USB+ ADKEY2 ADKEY1 IO2 GND IO1.",
      "Pin 1 (VCC) is at the top left when the microSD slot faces up.",
    ],
    width: 210,
    height: 232,
    body,
    terminals: { ...L.terminals, ...R.terminals },
  };
}

// ---------------------------------------------------------------- LED strips and lights

function ws2812bStrip() {
  const ledX = [150, 232, 314];
  const leds = ledX.map(
    (x) =>
      [
        `  <rect x="${x - 15}" y="44" width="30" height="30" rx="2" fill="#f5f5f5" stroke="#9e9e9e" stroke-width="1"/>`,
        `  <rect x="${x - 10}" y="49" width="20" height="20" rx="1" fill="#2b2b2b"/>`,
        `  <circle cx="${x - 5}" cy="56" r="2" fill="#e53935"/><circle cx="${x + 5}" cy="56" r="2" fill="#43a047"/><circle cx="${x}" cy="64" r="2" fill="#1e88e5"/>`,
        `  <rect class="smd" x="${x + 19}" y="81" width="8" height="5"/>`,
      ].join("\n"),
  );
  const cuts = [191, 273].map(
    (x) =>
      `  <path d="M${x} 38 V90" stroke="#9e9e9e" stroke-width="1" stroke-dasharray="3 3"/>` +
      [48, 59, 70].map((y) => `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#d9b44a" stroke="#a07d1c"/>`).join(""),
  );
  const body = [
    `  <rect x="86" y="36" width="272" height="56" rx="2" fill="#f1f1f1" stroke="#bdbdbd" stroke-width="1.5"/>`,
    ...leds,
    ...cuts,
    `  <text x="191" y="104" text-anchor="middle" font-family="ui-monospace, monospace" font-size="6" fill="#37474f">5V DIN GND</text>`,
    `  <path d="M118 108 H168 l-6 -4 m6 4 l-6 4" stroke="#37474f" stroke-width="1.4" fill="none"/>`,
    `  <text x="224" y="26" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" fill="#37474f">WS2812B  5V  data &gt;</text>`,
    // far end pads: 5V, DOUT, GND
    ...[
      [48, "5V"],
      [64, "DO"],
      [80, "GND"],
    ].map(
      ([y, l]) =>
        `  <rect x="341" y="${y - 5}" width="12" height="10" rx="1.5" fill="#d9b44a" stroke="#a07d1c"/><text x="338" y="${y + 3}" text-anchor="end" font-family="ui-monospace, monospace" font-size="6" fill="#37474f">${l}</text>`,
    ),
    `  <circle cx="347" cy="64" r="2.2" fill="#f5f5f5" stroke="#546e7a"/>`,
    // JST connector at the start with three wires
    `  <rect x="64" y="38" width="30" height="52" rx="3" fill="#f5f5f5" stroke="#9e9e9e" stroke-width="1.5"/>`,
    ...[48, 64, 80].map((y) => `  <rect x="68" y="${y - 3}" width="12" height="6" rx="1" fill="#bdbdbd"/>`),
    wire("M70 50 C50 50 40 46 12 46", "#d32f2f", [12, 46]),
    wire("M70 64 C50 64 40 64 12 64", "#43a047", [12, 64]),
    wire("M70 78 C50 78 40 82 12 82", "#f5f5f5", [12, 82]),
  ].join("\n");
  return {
    id: "module.led.strip.ws2812b",
    kind: "module",
    file: "modules/led-strip-ws2812b.svg",
    caption: "WS2812B addressable LED strip",
    title: "WS2812B LED strip segment top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified view of a WS2812B strip for HelpmeSolder wiring diagrams.",
      "Left: 3-pin JST connector with red (5V), green (DIN) and white (GND) wires, which are the wired terminals.",
      "Right end: solder pads 5V, DO (data out, the DOUT terminal) and GND. Data flows left to right.",
    ],
    width: 370,
    height: 120,
    body,
    terminals: { "5V": { x: 12, y: 46 }, DIN: { x: 12, y: 64 }, GND: { x: 12, y: 82 }, DOUT: { x: 347, y: 64 } },
  };
}

function rgbStrip12v() {
  const pads = [
    [32, "12V"],
    [46, "R"],
    [60, "G"],
    [74, "B"],
  ];
  const terminals = {};
  const padSvg = pads.map(([y, l], i) => {
    const id = ["V+", "R", "G", "B"][i];
    terminals[id] = { x: 36, y };
    return `  <rect x="26" y="${y - 5}" width="20" height="10" rx="1.5" fill="#d9b44a" stroke="#a07d1c"/><circle cx="36" cy="${y}" class="${holeClass(l)}" r="3.2"/><text x="54" y="${y + 2.5}" font-family="ui-monospace, monospace" font-size="7" fill="#37474f">${l}</text>`;
  });
  const leds = [130, 215, 300].map((x) =>
    [
      `  <rect x="${x - 17}" y="35" width="34" height="34" rx="2" fill="#f5f5f5" stroke="#9e9e9e"/>`,
      `  <rect x="${x - 12}" y="40" width="24" height="24" rx="1" fill="#2b2b2b"/>`,
      `  <circle cx="${x - 5}" cy="48" r="2.4" fill="#e53935"/><circle cx="${x + 5}" cy="48" r="2.4" fill="#43a047"/><circle cx="${x}" cy="58" r="2.4" fill="#1e88e5"/>`,
      `  <rect class="smd" x="${x + 22}" y="40" width="7" height="5"/><rect class="smd" x="${x + 22}" y="58" width="7" height="5"/>`,
    ].join("\n"),
  );
  const body = [
    `  <rect x="14" y="14" width="342" height="80" rx="3" fill="#f1f1f1" stroke="#bdbdbd" stroke-width="1.5"/>`,
    `  <path d="M92 14 V94 M258 14 V94" stroke="#9e9e9e" stroke-width="1" stroke-dasharray="3 3"/>`,
    ...padSvg,
    ...leds,
    // far end: matching pads (not wired)
    ...[32, 46, 60, 74].map((y) => `  <rect x="332" y="${y - 5}" width="14" height="10" rx="1.5" fill="#d9b44a" stroke="#a07d1c"/>`),
    `  <text x="185" y="106" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" fill="#37474f">RGB 12V  5050 x3</text>`,
  ].join("\n");
  return {
    id: "module.led.strip.rgb12v",
    kind: "module",
    file: "modules/led-strip-rgb12v.svg",
    caption: "RGB LED strip 12 V (4-wire)",
    title: "RGB 12 V LED strip segment top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified view of a 12 V analog RGB strip for HelpmeSolder wiring diagrams.",
      "One cuttable segment with three 5050 LEDs. The four solder pads at the left cut line are, top to bottom: 12V R G B.",
    ],
    width: 370,
    height: 116,
    body,
    terminals,
  };
}

function highPowerLed() {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const rr = i % 2 === 0 ? 86 : 62;
    pts.push(`${r1(110 + rr * Math.cos(a))},${r1(110 + rr * Math.sin(a))}`);
  }
  const body = [
    `  <polygon points="${pts.join(" ")}" fill="#cfd8dc" stroke="#90a4ae" stroke-width="14" stroke-linejoin="round"/>`,
    `  <polygon points="${pts.join(" ")}" fill="#cfd8dc" stroke="#cfd8dc" stroke-width="12" stroke-linejoin="round"/>`,
    // slots on the lobes
    ...[60, 120, 240, 300].map((a) => {
      const x = r1(110 + 78 * Math.cos((a * Math.PI) / 180));
      const y = r1(110 + 78 * Math.sin((a * Math.PI) / 180));
      return `  <circle cx="${x}" cy="${y}" r="5" fill="#f5f5f5" stroke="#78909c" stroke-width="1.5"/>`;
    }),
    // solder pads on the left (+) and right (-) lobes
    `  <rect x="20" y="96" width="38" height="28" rx="3" fill="#d9b44a" stroke="#a07d1c" stroke-width="1.5"/>`,
    `  <rect x="162" y="96" width="38" height="28" rx="3" fill="#d9b44a" stroke="#a07d1c" stroke-width="1.5"/>`,
    `  <circle class="hole pwr" cx="38" cy="110" r="5.5"/>`,
    `  <circle class="hole gnd" style="stroke:#9e9e9e" cx="182" cy="110" r="5.5"/>`,
    `  <text x="38" y="92" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" font-weight="bold" fill="#b71c1c">+</text>`,
    `  <text x="182" y="92" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" font-weight="bold" fill="#263238">-</text>`,
    // the emitter
    `  <circle cx="110" cy="110" r="40" fill="#fafafa" stroke="#b0bec5" stroke-width="1.5"/>`,
    `  <rect x="88" y="88" width="44" height="44" rx="4" fill="#f5f0e0" stroke="#bdb59a" stroke-width="1.5"/>`,
    `  <circle cx="110" cy="110" r="17" fill="#ffe066" stroke="#e0b800" stroke-width="1.5"/>`,
    `  <circle cx="104" cy="104" r="6" fill="#fff" opacity="0.6"/>`,
  ].join("\n");
  return {
    id: "module.led.highpower",
    kind: "module",
    file: "modules/led-highpower.svg",
    caption: "High-power LED on a star board",
    title: "High-power LED star board top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "20 mm aluminium star with a square emitter and a yellow phosphor dome; solder pads + (anode, left) and - (cathode, right).",
    ],
    width: 220,
    height: 220,
    body,
    terminals: { A: { x: 38, y: 110 }, K: { x: 182, y: 110 } },
  };
}

function laser650() {
  const board = rowHeaderBottom();
  const body = [
    // laser brass barrel pointing up, with its lens
    `  <rect x="64" y="12" width="46" height="130" rx="6" fill="#c9a24a" stroke="#8a6a1e" stroke-width="2"/>`,
    `  <rect x="68" y="16" width="8" height="122" fill="#fff" opacity="0.35"/>`,
    `  <path d="M64 56 H110 M64 60 H110" stroke="#8a6a1e" stroke-width="1"/>`,
    `  <circle cx="87" cy="22" r="14" fill="#263238" stroke="#8a6a1e" stroke-width="2"/>`,
    `  <circle cx="87" cy="22" r="8" fill="#e53935" opacity="0.85"/>`,
    // small driver board
    `  <rect x="12" y="100" width="150" height="104" rx="4" fill="#2e7d32" stroke="#1b4d20" stroke-width="2"/>`,
    `  <rect x="60" y="100" width="54" height="46" fill="#c9a24a" stroke="#8a6a1e" stroke-width="2"/>`,
    `  <rect x="64" y="104" width="8" height="38" fill="#fff" opacity="0.35"/>`,
    `  <rect class="smd" x="120" y="116" width="10" height="6" rx="1"/>`,
    `  <rect class="smd" x="120" y="128" width="10" height="6" rx="1"/>`,
    `  <text class="label" x="30" y="122" font-size="7">650nm</text>`,
    `  <text class="label" x="30" y="132" font-size="6">5mW</text>`,
    board.svg,
  ].join("\n");
  return {
    id: "module.laser.650nm",
    kind: "module",
    file: "modules/laser-650nm.svg",
    caption: "650 nm red laser module",
    title: "650 nm laser module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Brass laser barrel on a small green board with a 3-pin header along the bottom edge: S (signal), middle pin (+5V, unlabelled on the board) and - (GND).",
      "KY-008 style board; the middle pin is unlabelled on the real silkscreen.",
    ],
    width: 175,
    height: 215,
    body,
    terminals: board.terminals,
    pinExit: { dx: 0, dy: 1 },
  };
}

function rowHeaderBottom() {
  const x = 62;
  const y = 186;
  const pitch = 25;
  const terminals = {};
  const out = [`  <rect x="${x - 11}" y="${y - 9}" width="${pitch * 2 + 22}" height="18" rx="2" fill="#1b1b1b"/>`];
  [
    ["S", "S", "hole"],
    ["", "VCC", "hole pwr"],
    ["-", "GND", "hole gnd"],
  ].forEach(([label, id, cls], i) => {
    const px = x + i * pitch;
    terminals[id] = { x: px, y };
    out.push(`  <circle class="${cls}"${id === "GND" ? ` style="stroke:#9e9e9e"` : ""} cx="${px}" cy="${y}" r="6"/>`);
    if (label) out.push(`  <text class="label" x="${px}" y="${y - 12}" text-anchor="middle" font-size="9">${label}</text>`);
  });
  return { svg: out.join("\n"), terminals };
}

function ky016() {
  const x = 52;
  const y = 176;
  const pitch = 24;
  const names = [
    ["R", "R"],
    ["G", "G"],
    ["B", "B"],
    ["-", "GND"],
  ];
  const terminals = {};
  const hdr = [`  <rect x="${x - 11}" y="${y - 9}" width="${pitch * 3 + 22}" height="18" rx="2" fill="#1b1b1b"/>`];
  names.forEach(([label, id], i) => {
    const px = x + i * pitch;
    terminals[id] = { x: px, y };
    hdr.push(`  <circle class="${id === "GND" ? "hole gnd" : "hole"}"${id === "GND" ? ` style="stroke:#9e9e9e"` : ""} cx="${px}" cy="${y}" r="6"/>`);
    hdr.push(`  <text class="label" x="${px}" y="${y - 12}" text-anchor="middle" font-size="9">${label}</text>`);
  });
  const body = [
    `  <rect x="12" y="12" width="150" height="188" rx="5" fill="#2e7d32" stroke="#1b4d20" stroke-width="2"/>`,
    `  <circle cx="22" cy="22" r="5" fill="#f5f5f5" stroke="#c9a227" stroke-width="2"/>`,
    `  <circle cx="152" cy="22" r="5" fill="#f5f5f5" stroke="#c9a227" stroke-width="2"/>`,
    // clear 5 mm RGB LED
    `  <circle cx="87" cy="76" r="38" fill="#e8f1ee" stroke="#9db8b0" stroke-width="1.5" opacity="0.95"/>`,
    `  <path d="M52 94 V104 H122 V94" fill="none" stroke="#9db8b0" stroke-width="1.2"/>`,
    `  <rect x="60" y="62" width="10" height="28" fill="#cfd8dc" opacity="0.8"/>`,
    `  <rect x="104" y="62" width="10" height="28" fill="#cfd8dc" opacity="0.8"/>`,
    `  <circle cx="87" cy="70" r="6" fill="#e53935" opacity="0.7"/>`,
    `  <circle cx="75" cy="86" r="6" fill="#43a047" opacity="0.7"/>`,
    `  <circle cx="99" cy="86" r="6" fill="#1e88e5" opacity="0.7"/>`,
    // series resistors
    `  <rect class="smd" x="34" y="124" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="82" y="124" width="9" height="5" rx="1"/>`,
    `  <rect class="smd" x="130" y="124" width="9" height="5" rx="1"/>`,
    `  <text class="label" x="87" y="148" text-anchor="middle" font-size="9" font-weight="bold">KY-016</text>`,
    ...hdr,
  ].join("\n");
  return {
    id: "module.rgb.ky016",
    kind: "module",
    file: "modules/rgb-ky016.svg",
    caption: "KY-016 RGB LED module",
    title: "KY-016 RGB LED module top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Small green board with a clear 5 mm RGB LED and a 4-pin header along the bottom edge: R G B and - (common cathode GND).",
      "Some KY-016 boards print the order differently (for example G R B); follow the printed letters on your board.",
    ],
    width: 175,
    height: 212,
    body,
    terminals,
    pinExit: { dx: 0, dy: 1 },
  };
}

function tmp36() {
  const body = [
    `  <path d="M30 130 V100 A50 50 0 0 1 130 100 V130 Z" fill="#1d1d1d" stroke="#000" stroke-width="2"/>`,
    `  <path d="M38 126 V100 A42 42 0 0 1 60 62" fill="none" stroke="#555" stroke-width="3" opacity="0.6" stroke-linecap="round"/>`,
    `  <text class="label" x="80" y="94" text-anchor="middle" font-size="12" font-weight="bold">TMP36</text>`,
    `  <text class="label" x="80" y="112" text-anchor="middle" font-size="8" opacity="0.8">GZ  0A</text>`,
    ...[55, 80, 105].map((x) => `  <rect class="metal" x="${x - 3}" y="130" width="6" height="104" rx="1"/>`),
    ...[
      [55, "+Vs", "hole pwr"],
      [80, "Vout", "hole"],
      [105, "GND", "hole gnd"],
    ].map(
      ([x, l, c]) =>
        `  <circle class="${c}"${c.includes("gnd") ? ` style="stroke:#9e9e9e"` : ""} cx="${x}" cy="236" r="5"/><text x="${x}" y="258" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#37474f">${l}</text>`,
    ),
  ].join("\n");
  return {
    id: "module.tmp36",
    kind: "module",
    file: "modules/tmp36.svg",
    caption: "TMP36 temperature sensor (TO-92)",
    title: "TMP36 TO-92 sensor front view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified view for HelpmeSolder wiring diagrams.",
      "TO-92 with the flat face toward you and the legs down: +Vs, Vout, GND from the left.",
    ],
    width: 160,
    height: 266,
    body,
    terminals: { VS: { x: 55, y: 236 }, VOUT: { x: 80, y: 236 }, GND: { x: 105, y: 236 } },
    pinExit: { dx: 0, dy: 1 },
  };
}

const drawings = [
  dcMotor,
  vibrationMotor,
  fan5v,
  stepper28byj48,
  a4988,
  drv8825,
  l298n,
  l293d,
  tb6612,
  relay1,
  relay2,
  relay4,
  relaySsr,
  solenoid12v,
  speaker8ohm,
  pam8403,
  lm386,
  dfplayer,
  siren,
  ws2812bStrip,
  rgbStrip12v,
  highPowerLed,
  laser650,
  ky016,
  tmp36,
];

export default drawings;
