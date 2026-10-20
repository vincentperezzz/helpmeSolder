// More building blocks for the part drawings. Import alongside ./_lib.mjs.
import { esc, holeClass, r1 } from "./_lib.mjs";

/**
 * A single row of header pins. `pins` is [{ label, id?, muted? }] in drawing order
 * (`id` is the catalog pin id whose wire ends there, an array when several catalog
 * pins share one pad). The row runs along x (`dir: "x"`, labels rotated and written
 * on `side`) or along y (`dir: "y"`, labels beside the pins). Returns svg lines and
 * the terminals it created.
 */
export function rowHeader({ pins, x, y, pitch = 18, dir = "x", side = "below", r = 6, plastic = true }) {
  const terminals = {};
  const out = [];
  const n = pins.length;
  if (plastic) {
    if (dir === "x") out.push(`  <rect x="${x - 11}" y="${y - 9}" width="${pitch * (n - 1) + 22}" height="18" rx="2" fill="#1b1b1b"/>`);
    else out.push(`  <rect x="${x - 9}" y="${y - 11}" width="18" height="${pitch * (n - 1) + 22}" rx="2" fill="#1b1b1b"/>`);
  }
  pins.forEach((p, i) => {
    const px = dir === "x" ? r1(x + i * pitch) : x;
    const py = dir === "x" ? y : r1(y + i * pitch);
    out.push(`  <circle class="${holeClass(p.label)}" cx="${px}" cy="${py}" r="${r}"/>`);
    const cls = `pinlbl${p.muted ? " muted" : ""}`;
    if (dir === "x") {
      const ty = side === "below" ? py + 14 : py - 14;
      out.push(
        `  <text class="${cls}" x="${px}" y="${ty}" transform="rotate(${side === "below" ? 90 : -90} ${px} ${ty})" text-anchor="${side === "below" ? "start" : "end"}" dy="3" font-size="7.5">${esc(p.label)}</text>`,
      );
    } else {
      const tx = side === "right" ? px + 12 : px - 12;
      out.push(`  <text class="${cls}" x="${tx}" y="${py + 3}" text-anchor="${side === "right" ? "start" : "end"}">${esc(p.label)}</text>`);
    }
    for (const id of [].concat(p.id ?? [])) terminals[id] = { x: px, y: py };
  });
  return { svg: out.join("\n"), terminals };
}

/** A black IC (or module) body with an optional printed marking. */
export const chip = (x, y, w, h, label, { rot = 0, fs = 6 } = {}) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const tr = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : "";
  return [
    `  <g${tr}>`,
    `    <rect class="chip" x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"/>`,
    `    <circle cx="${x + 4}" cy="${y + 4}" r="1.3" fill="#555"/>`,
    label ? `    <text class="label" x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="${fs}">${esc(label)}</text>` : "",
    `  </g>`,
  ].join("\n");
};

/** A surface-mount part (resistor, capacitor) drawn as a small tan block. */
export const smd = (x, y, w = 6, h = 4) => `  <rect class="smd" x="${x}" y="${y}" width="${w}" height="${h}" rx="0.6"/>`;

/** A round LED lamp with an optional tiny label under it. */
export const led = (x, y, color = "#ef5350", label) =>
  [
    `  <circle cx="${x}" cy="${y}" r="3.2" fill="${color}" stroke="#00000055" stroke-width="0.6"/>`,
    label ? `  <text class="label" x="${x}" y="${y + 11}" text-anchor="middle" font-size="6">${esc(label)}</text>` : "",
  ].join("\n");

/** A screw terminal block with `n` poles; returns svg and the pole centres in order. */
export const screwTerminal = (x, y, n, { pitch = 20, h = 22, color = "#1565c0", horizontal = true } = {}) => {
  const poles = [];
  const out = [];
  const w = pitch * n;
  if (horizontal) out.push(`  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${color}" stroke="#0d3c7a"/>`);
  else out.push(`  <rect x="${x}" y="${y}" width="${h}" height="${w}" rx="2" fill="${color}" stroke="#0d3c7a"/>`);
  for (let i = 0; i < n; i++) {
    const cx = horizontal ? x + pitch * i + pitch / 2 : x + h / 2;
    const cy = horizontal ? y + h / 2 : y + pitch * i + pitch / 2;
    out.push(`  <circle cx="${cx}" cy="${cy}" r="${h * 0.3}" fill="#cfd8dc" stroke="#546e7a"/>`);
    out.push(`  <path d="M${cx - h * 0.2} ${cy} H${cx + h * 0.2}" stroke="#546e7a" stroke-width="1.2"/>`);
    poles.push({ x: r1(cx), y: r1(cy) });
  }
  return { svg: out.join("\n"), poles };
};
