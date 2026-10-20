// RC522 RFID reader and the ESP32 family boards.
import { dualHeaderBoard, usbC, button, holeMount, holeClass, esc, r1 } from "./_lib.mjs";
import { smd } from "./_helpers.mjs";

function rc522() {
  // 40 x 60 mm board, header across the short top edge, antenna coil below.
  const width = 200;
  const height = 300;
  const pins = [
    ["SDA", "SDA"],
    ["SCK", "SCK"],
    ["MOSI", "MOSI"],
    ["MISO", "MISO"],
    ["IRQ", "IRQ"],
    ["GND", "GND"],
    ["RST", "RST"],
    ["3.3V", "3V3"],
  ];
  const pitch = 18;
  const x0 = 100 - (pitch * (pins.length - 1)) / 2;
  const pinY = 40;
  const terminals = {};
  const header = [`  <rect x="${x0 - 11}" y="${pinY - 9}" width="${pitch * (pins.length - 1) + 22}" height="18" rx="2" fill="#1b1b1b"/>`];
  pins.forEach(([label, id], i) => {
    const x = r1(x0 + i * pitch);
    terminals[id] = { x, y: pinY };
    header.push(`  <circle class="${holeClass(label)}" cx="${x}" cy="${pinY}" r="6"/>`);
    header.push(
      `  <text class="pinlbl" x="${x}" y="${pinY + 14}" transform="rotate(90 ${x} ${pinY + 14})" font-size="7.5">${esc(label)}</text>`,
    );
  });
  const coil = [];
  for (let i = 0; i < 4; i++) {
    const d = i * 6;
    coil.push(
      `  <rect x="${36 + d}" y="${120 + d}" width="${128 - 2 * d}" height="${140 - 2 * d}" rx="${10 - i * 2}" fill="none" stroke="#c9d8f2" stroke-width="2.2"/>`,
    );
  }
  const waves = [14, 24, 34, 44]
    .map((r) => `  <path d="M ${100 + r * 0.7} ${190 - r * 0.7} A ${r} ${r} 0 0 1 ${100 + r * 0.7} ${190 + r * 0.7}" fill="none" stroke="#eceff1" stroke-width="2"/>`)
    .concat(
      [14, 24, 34, 44].map(
        (r) => `  <path d="M ${100 - r * 0.7} ${190 - r * 0.7} A ${r} ${r} 0 0 0 ${100 - r * 0.7} ${190 + r * 0.7}" fill="none" stroke="#eceff1" stroke-width="2"/>`,
      ),
    );
  const smd = [
    [52, 72],
    [60, 72],
    [52, 82],
    [138, 72],
    [146, 72],
    [138, 82],
    [70, 104],
    [80, 104],
    [90, 104],
    [100, 104],
    [110, 104],
    [120, 104],
  ]
    .map(([x, y]) => `  <rect class="smd" x="${x}" y="${y}" width="6" height="4" rx="0.6"/>`)
    .join("\n");
  const body = [
    `  <rect x="20" y="22" width="160" height="262" rx="6" fill="#1f56b0" stroke="#143c80" stroke-width="2"/>`,
    holeMount(32, 104),
    holeMount(168, 104),
    holeMount(32, 272),
    holeMount(168, 272),
    ...header,
    smd,
    `  <rect class="chip" x="88" y="70" width="20" height="20" rx="1.5" transform="rotate(45 98 80)"/>`,
    `  <text class="label" x="98" y="98" text-anchor="middle" font-size="6">MFRC522</text>`,
    `  <rect class="metal" x="150" y="74" width="12" height="24" rx="6"/>`,
    ...coil,
    `  <circle cx="100" cy="190" r="4" fill="#eceff1"/>`,
    ...waves,
    `  <text class="label" x="100" y="252" text-anchor="middle" font-size="11" font-weight="bold">RFID-RC522</text>`,
  ].join("\n");
  return {
    id: "module.rfid.rc522",
    kind: "module",
    file: "modules/rc522-rfid.svg",
    caption: "RC522 RFID reader (13.56 MHz, 3.3 V)",
    title: "RC522 RFID reader top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Common blue MFRC522 board: 8-pin header on the short edge, printed antenna coil.",
      "Header left to right: SDA (SPI chip select), SCK, MOSI, MISO, IRQ, GND, RST, 3.3V.",
    ],
    width,
    height,
    body,
    terminals,
    pinExit: { dx: 0, dy: -1 },
  };
}

function esp32S3DevkitC() {
  const gpio = (n, extra = {}) => ({ label: `GPIO${n}`, id: `GPIO${n}`, ...extra });
  const unwired = (n, muted = false) => ({ label: `GPIO${n}`, muted });
  const left = [
    { label: "3V3", id: "3V3.1" },
    { label: "3V3", id: "3V3.2" },
    { label: "RST", id: "EN" },
    gpio(4),
    gpio(5),
    gpio(6),
    gpio(7),
    gpio(15),
    gpio(16),
    gpio(17),
    gpio(18),
    gpio(8),
    unwired(3),
    unwired(46),
    gpio(9),
    gpio(10),
    gpio(11),
    gpio(12),
    gpio(13),
    gpio(14),
    { label: "5V", id: "5V" },
    { label: "GND", id: "GND.1" },
  ];
  const right = [
    { label: "GND", id: "GND.2" },
    { label: "TX", id: "TX" },
    { label: "RX", id: "RX" },
    gpio(1),
    gpio(2),
    gpio(42),
    gpio(41),
    gpio(40),
    gpio(39),
    gpio(38),
    unwired(37, true),
    unwired(36, true),
    unwired(35, true),
    unwired(0),
    unwired(45),
    unwired(48),
    gpio(47),
    gpio(21),
    unwired(20, true),
    unwired(19, true),
    { label: "GND", id: "GND.3" },
    { label: "GND" },
  ];
  const decorations = [
    holeMount(46, 56),
    holeMount(234, 56),
    `  <path d="M112 50 V64 H128 V52 H144 V64 H160 V52 H168 V70" fill="none" stroke="#9e9e9e" stroke-width="2"/>`,
    `  <rect class="metal" x="104" y="72" width="72" height="104" rx="3"/>`,
    `  <text x="140" y="120" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="#263238">ESP32-S3</text>`,
    `  <text x="140" y="134" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="#37474f">WROOM-1</text>`,
    `  <circle cx="140" cy="220" r="6" fill="#ffffff" stroke="#9e9e9e"/>`,
    `  <text class="label" x="140" y="238" text-anchor="middle" font-size="7">RGB</text>`,
    `  <text class="label" x="140" y="330" text-anchor="middle" font-size="8" transform="rotate(-90 140 330)">ESP32-S3-DevKitC-1</text>`,
    button(120, 508, "BOOT"),
    button(160, 508, "RST"),
    usbC(112, 556, 30, 14, "UART"),
    usbC(168, 556, 30, 14, "USB"),
  ].join("\n");
  const art = dualHeaderBoard({
    width: 280,
    height: 580,
    board: { x: 30, y: 40, w: 220, h: 524, fill: "#1d2026", stroke: "#0b0c0f" },
    left,
    right,
    pitch: 21,
    firstY: 92,
    decorations,
  });
  return {
    id: "board.esp32.s3.devkitc1",
    kind: "board",
    file: "boards/esp32-s3-devkitc.svg",
    caption: "ESP32-S3-DevKitC-1",
    title: "ESP32-S3-DevKitC-1 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Module and antenna at the top, the two USB-C ports (UART, USB) at the bottom.",
      "Header order from Espressif's published J1 / J3 pinout. Grey labels are pins",
      "the board reserves (USB data GPIO19/20, octal PSRAM GPIO35-37).",
    ],
    ...art,
  };
}

function esp32C3DevkitM() {
  const io = (n) => ({ label: `GPIO${n}`, id: `GPIO${n}` });
  const left = [
    { label: "GND", id: "GND.1" },
    { label: "3V3", id: "3V3" },
    { label: "3V3" },
    io(2),
    io(3),
    { label: "GND" },
    { label: "RST", id: "RST" },
    { label: "GND" },
    io(0),
    io(1),
    io(10),
    { label: "GND" },
    { label: "5V", id: "5V" },
    { label: "5V" },
    { label: "GND" },
  ];
  const right = [
    { label: "GND", id: "GND.2" },
    { label: "TX", id: "TX" },
    { label: "RX", id: "RX" },
    { label: "GND" },
    io(9),
    io(8),
    { label: "GND" },
    io(7),
    io(6),
    io(5),
    io(4),
    { label: "GND" },
    { label: "GPIO18", muted: true },
    { label: "GPIO19", muted: true },
    { label: "GND" },
  ];
  const decorations = [
    `  <path d="M106 50 V62 H118 V52 H130 V62 H142 V52 H154 V66" fill="none" stroke="#9e9e9e" stroke-width="2"/>`,
    `  <rect class="metal" x="98" y="68" width="64" height="74" rx="3"/>`,
    `  <text x="130" y="104" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#263238">ESP32-C3</text>`,
    `  <text x="130" y="117" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" fill="#37474f">MINI-1</text>`,
    `  <circle cx="130" cy="170" r="5" fill="#ffffff" stroke="#9e9e9e"/>`,
    `  <text class="label" x="130" y="186" text-anchor="middle" font-size="7">RGB</text>`,
    `  <text class="label" x="130" y="270" text-anchor="middle" font-size="8" transform="rotate(-90 130 270)">ESP32-C3-DevKitM-1</text>`,
    button(112, 370, "BOOT"),
    button(148, 370, "RST"),
    `  <rect class="usb" x="114" y="402" width="32" height="14" rx="3"/>`,
    `  <text class="label" x="130" y="398" text-anchor="middle" font-size="7">USB</text>`,
  ].join("\n");
  const art = dualHeaderBoard({
    width: 260,
    height: 424,
    board: { x: 30, y: 40, w: 200, h: 370, fill: "#1d2026", stroke: "#0b0c0f" },
    left,
    right,
    pitch: 21,
    firstY: 82,
    decorations,
  });
  return {
    id: "board.esp32.c3.devkitm1",
    kind: "board",
    file: "boards/esp32-c3-devkitm1.svg",
    caption: "ESP32-C3-DevKitM-1",
    title: "ESP32-C3-DevKitM-1 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "ESP32-C3-MINI-1 module at the top, micro-USB at the bottom.",
      "Header order from Espressif's published J1 / J3 pinout. GPIO18/19 (grey) are USB data.",
    ],
    ...art,
  };
}

function esp32C3SuperMini() {
  const io = (n) => ({ label: String(n), id: `GPIO${n}` });
  // Chip-side view with USB-C up, as on the board: the left column is 5..10, 20, 21
  // and the right column is 5V, GND, 3V3, 4..0. The board has one GND pad, so both
  // catalog grounds end on it.
  const left = [io(5), io(6), io(7), io(8), io(9), io(10), { label: "20", id: "RX" }, { label: "21", id: "TX" }];
  const right = [
    { label: "5V", id: "5V" },
    { label: "GND", id: ["GND.1", "GND.2"] },
    { label: "3.3", id: "3V3" },
    io(4),
    io(3),
    io(2),
    io(1),
    io(0),
  ];
  const tact = (x, y, label) =>
    [
      `  <rect x="${x - 7}" y="${y - 6}" width="14" height="12" rx="1.5" fill="#cfd3d6" stroke="#7d868c"/>`,
      `  <circle cx="${x}" cy="${y}" r="3.4" fill="#263238"/>`,
      `  <text class="label" x="${x}" y="${y + 15}" text-anchor="middle" font-size="5.5">${label}</text>`,
    ].join("\n");
  const decorations = [
    // USB-C shell on the top edge
    `  <rect x="88" y="26" width="44" height="40" rx="6" fill="#d5d9dc" stroke="#7d868c" stroke-width="1.4"/>`,
    `  <rect x="95" y="32" width="30" height="12" rx="6" fill="#9aa3a8"/>`,
    `  <rect x="102" y="36" width="16" height="4" rx="2" fill="#5f686d"/>`,
    // BOOT and RST buttons flank the connector, red power LED between them
    tact(80, 88, "BOOT"),
    tact(140, 88, "RST"),
    `  <circle cx="110" cy="96" r="2.6" fill="#ff5252" stroke="#7f0000" stroke-width="0.5"/>`,
    `  <text class="label" x="110" y="108" text-anchor="middle" font-size="5">LED</text>`,
    // 40 MHz crystal and the ESP32-C3FH4 (QFN32) in the middle
    `  <rect x="94" y="116" width="32" height="12" rx="2" fill="#c8ccd0" stroke="#7d868c"/>`,
    `  <rect x="95" y="138" width="30" height="30" rx="1.5" fill="#1a1a1a" stroke="#000"/>`,
    `  <circle cx="100" cy="143" r="1.6" fill="#555"/>`,
    `  <text class="label" x="110" y="153" text-anchor="middle" font-size="5">ESP32</text>`,
    `  <text class="label" x="110" y="161" text-anchor="middle" font-size="5">C3FH4</text>`,
    // a few resistors and capacitors
    smd(72, 128),
    smd(72, 136),
    smd(142, 128),
    smd(142, 136),
    smd(78, 172),
    smd(136, 172),
    // antenna end: ceramic antenna and the red C3 mark
    `  <rect x="80" y="196" width="60" height="9" rx="2" fill="#e0d8c8" stroke="#8a7f68"/>`,
    `  <rect x="88" y="208" width="44" height="16" rx="2" fill="#d32f2f"/>`,
    `  <text x="110" y="220" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" font-weight="bold" fill="#ffffff">C3</text>`,
  ].join("\n");
  const art = dualHeaderBoard({
    width: 220,
    height: 270,
    board: { x: 30, y: 44, w: 160, h: 206, fill: "#16181c", stroke: "#000", rx: 6 },
    left,
    right,
    pitch: 22,
    firstY: 72,
    decorations,
  });
  return {
    id: "board.esp32.c3.supermini",
    kind: "board",
    file: "boards/esp32-c3-supermini.svg",
    caption: "ESP32-C3 SuperMini",
    title: "ESP32-C3 SuperMini top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Chip side, USB-C up: BOOT and RST buttons beside the connector, ESP32-C3FH4 in the middle,",
      "ceramic antenna and the red C3 mark at the bottom end. Left column 5-10, 20, 21; right column",
      "5V, G (GND), 3.3, 4-0. Clones can differ; check the silkscreen.",
    ],
    ...art,
  };
}

function esp32Cam() {
  const io = (n, label = `IO${n}`) => ({ label, id: `IO${n}` });
  // Camera end at the top; both headers start with their supply pin there.
  const left = [{ label: "5V", id: "5V" }, { label: "GND", id: "GND.1" }, io(12), io(13), io(15), io(14), io(2), io(4)];
  const right = [
    { label: "3V3", id: "3V3" },
    { label: "IO16", muted: true },
    io(0),
    { label: "GND", id: "GND.2" },
    { label: "VCC" },
    { label: "U0R", id: "U0R" },
    { label: "U0T", id: "U0T" },
    { label: "GND", id: "GND.3" },
  ];
  const decorations = [
    // microSD socket (metal) under the camera
    `  <rect class="metal" x="82" y="50" width="66" height="92" rx="3" opacity="0.85"/>`,
    // camera: square lens holder with the lens
    `  <rect x="90" y="56" width="50" height="50" rx="5" fill="#141414" stroke="#000"/>`,
    `  <circle cx="115" cy="81" r="17" fill="#1f1f1f" stroke="#3a3a3a" stroke-width="2"/>`,
    `  <circle cx="115" cy="81" r="8" fill="#0b0f2e"/>`,
    `  <circle cx="113" cy="79" r="3" fill="#3949ab"/>`,
    // orange camera ribbon running down to the white FPC connector
    `  <path d="M104 106 H126 V150 H104 Z" fill="#e0912e" stroke="#b86e12" stroke-width="0.8"/>`,
    `  <rect x="80" y="150" width="70" height="26" rx="2" fill="#ece7dc" stroke="#9e9a90"/>`,
    `  <rect x="86" y="158" width="58" height="10" fill="#2b2b2b"/>`,
    // flash LED near the far end, board name under it
    `  <rect x="134" y="262" width="16" height="16" rx="2" fill="#fffde7" stroke="#bdb76b"/>`,
    `  <circle cx="142" cy="270" r="4.5" fill="#fff59d"/>`,
    `  <text class="label" x="142" y="290" text-anchor="middle" font-size="6">FLASH</text>`,
    `  <text class="label" x="104" y="306" text-anchor="middle" font-size="12" font-weight="bold">ESP32-CAM</text>`,
  ].join("\n");
  const art = dualHeaderBoard({
    width: 230,
    height: 340,
    board: { x: 30, y: 40, w: 170, h: 286, fill: "#111214", stroke: "#000", rx: 6 },
    left,
    right,
    pitch: 26,
    firstY: 64,
    decorations,
  });
  return {
    id: "board.esp32.cam",
    kind: "board",
    file: "boards/esp32-cam.svg",
    caption: "ESP32-CAM (AI-Thinker)",
    title: "ESP32-CAM top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "Camera end at the top; 5V (left) and 3V3 (right) are the header pins nearest the camera.",
      "Header order from the AI-Thinker ESP32-CAM pinout. IO16 (grey) is used by PSRAM;",
      "VCC is a supply output whose voltage depends on a solder jumper.",
    ],
    ...art,
  };
}

function xiaoEsp32C3() {
  const left = [
    { label: "D0", id: "D0" },
    { label: "D1", id: "D1" },
    { label: "D2", id: "D2" },
    { label: "D3", id: "D3" },
    { label: "D4", id: "D4" },
    { label: "D5", id: "D5" },
    { label: "D6", id: "D6" },
  ];
  const right = [
    { label: "5V", id: "5V" },
    { label: "GND", id: "GND" },
    { label: "3V3", id: "3V3" },
    { label: "D10", id: "D10" },
    { label: "D9", id: "D9" },
    { label: "D8", id: "D8" },
    { label: "D7", id: "D7" },
  ];
  const mono = `font-family="ui-monospace, monospace"`;
  const decorations = [
    // USB-C shell standing over the top edge, charge LED beside it
    `  <rect x="92" y="26" width="56" height="50" rx="8" fill="#d5d9dc" stroke="#7d868c" stroke-width="1.5"/>`,
    `  <rect x="100" y="34" width="40" height="16" rx="8" fill="#9aa3a8"/>`,
    `  <rect x="108" y="40" width="24" height="4" rx="2" fill="#5f686d"/>`,
    `  <rect x="154" y="38" width="6" height="4" rx="1" fill="#ef9a9a"/>`,
    `  <text class="label" x="164" y="44" font-size="7">CH</text>`,
    // shielded module with Seeed's marking
    `  <rect x="80" y="84" width="80" height="102" rx="3" fill="#f4f5f5" stroke="#b0b6ba" stroke-width="1.2"/>`,
    `  <text x="120" y="106" text-anchor="middle" ${mono} font-size="10" font-weight="bold" fill="#263238">seeed</text>`,
    `  <text x="120" y="118" text-anchor="middle" ${mono} font-size="8" fill="#263238">studio</text>`,
    `  <text x="120" y="138" text-anchor="middle" ${mono} font-size="6" fill="#455a64">XIAO-ESP32-C3</text>`,
    `  <text x="104" y="168" text-anchor="middle" ${mono} font-size="9" font-weight="bold" fill="#263238">FC</text>`,
    `  <text x="136" y="168" text-anchor="middle" ${mono} font-size="9" font-weight="bold" fill="#263238">CE</text>`,
    // BOOT button, U.FL antenna socket, RESET button along the bottom edge
    `  <rect x="82" y="196" width="22" height="20" rx="2" fill="#cfd3d6" stroke="#7d868c"/>`,
    `  <circle cx="93" cy="206" r="5" fill="#263238"/>`,
    `  <circle cx="120" cy="206" r="9" fill="#cfd3d6" stroke="#7d868c"/>`,
    `  <circle cx="120" cy="206" r="3.5" fill="#b8860b"/>`,
    `  <rect x="136" y="196" width="22" height="20" rx="2" fill="#cfd3d6" stroke="#7d868c"/>`,
    `  <circle cx="147" cy="206" r="5" fill="#263238"/>`,
    `  <text class="label" x="93" y="228" text-anchor="middle" font-size="7">B</text>`,
    `  <text class="label" x="147" y="228" text-anchor="middle" font-size="7">R</text>`,
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
  return {
    id: "board.xiao.esp32c3",
    kind: "board",
    file: "boards/xiao-esp32c3.svg",
    caption: "Seeed Studio XIAO ESP32C3",
    title: "Seeed Studio XIAO ESP32C3 top view (original simplified drawing, CC0)",
    comment: [
      "Original CC0 simplified top view for HelpmeSolder wiring diagrams.",
      "USB-C at the top; D0-D6 down the left side, 5V, GND, 3V3 and D10-D7 down the right.",
      "Pad order from Seeed's published XIAO pinout.",
    ],
    ...art,
  };
}

const drawings = [rc522, esp32S3DevkitC, esp32C3DevkitM, esp32C3SuperMini, esp32Cam, xiaoEsp32C3];

export default drawings;
