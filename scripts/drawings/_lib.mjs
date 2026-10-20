// Shared pieces for the part-drawing scripts: colours, SVG wrapper and the header-board helper.
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const r1 = (n) => Math.round(n * 10) / 10;

export const STYLE = `
      .hole { fill: #f5f5f5; stroke: #37474f; stroke-width: 1.2; }
      .gnd { fill: #212121; stroke: #000; }
      .pwr { fill: #c62828; stroke: #8e0000; }
      .v3 { fill: #ef6c00; stroke: #e65100; }
      .usb { fill: #cfd8dc; stroke: #546e7a; stroke-width: 1.2; }
      .metal { fill: #b0bec5; stroke: #607d8b; stroke-width: 1; }
      .btn { fill: #eceff1; stroke: #607d8b; stroke-width: 1; }
      .chip { fill: #1a1a1a; stroke: #000; stroke-width: 0.8; }
      .smd { fill: #d7ccc8; stroke: #6d4c41; stroke-width: 0.5; }
      .label { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9px; fill: #eceff1; }
      .pinlbl { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8px; fill: #eceff1; }
      .muted { fill: #90a4ae; }`;

/** Hole colour by what the pin carries, read from its printed label. */
export function holeClass(label) {
  if (/^GND$/i.test(label)) return "hole gnd";
  if (/^(5V|VBUS|VIN)$/i.test(label)) return "hole pwr";
  if (/^(3V3|3\.3V)$/i.test(label)) return "hole v3";
  return "hole";
}

export function svgDoc({ width, height, title, comment, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  <!--
${comment.map((line) => `    ${line}`).join("\n")}
  -->
  <defs>
    <style type="text/css"><![CDATA[${STYLE}
    ]]></style>
  </defs>
${body}
</svg>
`;
}

/**
 * A board with one header down each long side. `left` / `right` list the pins
 * top to bottom as { label, id?, muted? }; `id` is the catalog pin id whose wire
 * ends on that hole (a hole without id is drawn but not wired).
 */
export function dualHeaderBoard(spec) {
  const { width, height, board, left, right, pitch, firstY, inset = 14, castellated = false } = spec;
  const lx = board.x + inset;
  const rx = board.x + board.w - inset;
  const terminals = {};
  const holes = [];
  const add = (pins, x, side) => {
    pins.forEach((p, i) => {
      const y = firstY + i * pitch;
      if (castellated) {
        // Gold edge pad cut through by a half hole, as on XIAO-style boards.
        const padX = side === "left" ? board.x - 2 : x - 4;
        holes.push(`    <rect x="${padX}" y="${y - 7}" width="${inset + 6}" height="14" rx="3" fill="#d9b44a" stroke="#a07d1c" stroke-width="0.8"/>`);
        holes.push(`    <circle class="${holeClass(p.label)}" cx="${x}" cy="${y}" r="4.5"/>`);
      } else {
        holes.push(`    <circle class="${holeClass(p.label)}" cx="${x}" cy="${y}" r="6"/>`);
      }
      const tx = side === "left" ? x + 11 : x - 11;
      const anchor = side === "left" ? "start" : "end";
      holes.push(
        `    <text class="pinlbl${p.muted ? " muted" : ""}" x="${tx}" y="${y + 3}" text-anchor="${anchor}">${esc(p.label)}</text>`,
      );
      for (const id of [].concat(p.id ?? [])) terminals[id] = { x, y };
    });
  };
  add(left, lx, "left");
  add(right, rx, "right");
  const body = [
    `  <rect x="${board.x}" y="${board.y}" width="${board.w}" height="${board.h}" rx="${board.rx ?? 8}" fill="${board.fill}" stroke="${board.stroke}" stroke-width="2"/>`,
    spec.decorations,
    `  <g id="headers">`,
    ...holes,
    `  </g>`,
  ].join("\n");
  return { width, height, body, terminals };
}

export const usbC = (cx, y, w = 34, h = 14, label) =>
  [
    `  <rect class="usb" x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`,
    `  <rect x="${cx - w / 2 + 6}" y="${y + h / 2 - 2}" width="${w - 12}" height="4" rx="2" fill="#78909c"/>`,
    label ? `  <text class="label" x="${cx}" y="${y - 4}" text-anchor="middle" font-size="7">${esc(label)}</text>` : "",
  ].join("\n");

export const button = (x, y, label) =>
  [
    `  <rect class="btn" x="${x - 8}" y="${y - 6}" width="16" height="12" rx="2"/>`,
    `  <circle cx="${x}" cy="${y}" r="3" fill="#90a4ae"/>`,
    `  <text class="label" x="${x}" y="${y + 16}" text-anchor="middle" font-size="7">${esc(label)}</text>`,
  ].join("\n");

export const holeMount = (x, y, r = 5) =>
  `  <circle cx="${x}" cy="${y}" r="${r}" fill="#f5f5f5" stroke="#c9a227" stroke-width="2.5"/>`;

