/**
 * One record per catalog part describing every image asset we use for it.
 * The admin Catalog tab renders these.
 *
 * SERVER-ONLY: this module reads the disk (node:fs) to check thumbnail files,
 * so import it from server components / route handlers / tests only, never
 * from a "use client" file.
 *
 * How the app resolves assets today (this file mirrors that logic)
 * ---------------------------------------------------------------
 * Thumbnail (Parts tab, PrepParts.tsx): `resolvePartPhoto(photoHint)` from
 * part-media.ts. It looks the hint up in a static table, then the newer
 * BASIC_PART_MEDIA / MODULE_PART_MEDIA maps override it. There is no
 * disk-scan fallback in that path (WiringDiagram.tsx uses the older
 * `resolvePhotoPath`, which does scan public/photos, but the Parts tab does not).
 *
 * Diagram drawing (WokwiDiagram.tsx), first match wins:
 *   1. Breadboard (id contains "breadboard")  -> BreadboardVisual, a built-in
 *      React/SVG drawing. No file.
 *   2. Board / module SVG: getDiagramAsset(id) in board-assets.ts AND
 *      prefersDiagramAsset() -> a dedicated SVG under /assets/boards or
 *      /assets/modules. Pico, Pi, NodeMCU and the soil sensor always use it;
 *      other boards use it only when they have no Wokwi tag.
 *   3. Real Wokwi web element (`wokwi.tag` on the catalog part, rendered via
 *      @wokwi/elements, MIT) -> drawingRef is the tag, e.g. wokwi-pushbutton.
 *   4. Otherwise SkeletonPart, the generic fallback box.
 * Power sources (passive.power.*) are drawn outside that loop by
 * PowerSourceVisual: batteries from /assets/batteries/*.svg through
 * BatteryAssetVisual, the USB wall adapter by the inline UsbWallVisual SVG.
 *
 * GENERIC ASSETS the app uses (answer to "what assets do we use for generics")
 * --------------------------------------------------------------------------
 *  - SkeletonPart (src/components/wokwi/SkeletonPart.tsx): the diagram tile for
 *    any part with no breadboard / SVG / Wokwi drawing. It shows a name, a
 *    category label and up to 8 pin labels, plus a stroke glyph picked by
 *    partCategory(): PartGlyph "Board" (chip with legs), "Sensor" (signal
 *    arcs), "Display" (screen with text lines), "Output" (light bulb), "Input"
 *    (button), "Power" (battery), default "Basic part" (axial component).
 *    genericRef is "skeleton:<category>" in lower case, for example
 *    "skeleton:sensor". Today no catalog part needs it (every part has a
 *    Wokwi tag, SVG or built-in drawing), but it catches any new part added
 *    without art.
 *  - PrepParts.tsx also renders PartGlyph (the same glyphs) as the Parts-tab
 *    placeholder when a part has no thumbnail (thumbnailSource "none").
 *  - Shared thumbnails: /photos/pico.jpg is the thumbnail for 7 boards
 *    (Pico, Pico W, Pico 2, Pi Zero W, Pi 3B+, Pi 4B, Pi 5). For the Pi
 *    family it is a stand-in, so those records are "generic".
 *  - There is no category-generic thumbnail image file; public/*.svg
 *    (next, vercel, globe, file, window) are Next.js template leftovers and
 *    are not used for parts.
 *
 * Licences / attribution notes found
 * ----------------------------------
 *  - public/photos/README.md: reference photos are for identification;
 *    "several board/module references pulled from Wikimedia Commons". There is
 *    no per-file record, so jpg/png photos are flagged accordingly.
 *  - board-assets.ts / batteries.ts carry a license string per drawing
 *    (CC0 HelpmeSolder originals); public/assets/*\/README.md agree.
 *  - Wokwi elements are MIT (public/assets/boards/LICENSE-MIT-wokwi-elements.txt).
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { boards } from "./boards";
import { BATTERY_ASSETS, batteryRecordForPart, type BatteryKind } from "./batteries";
import { getDiagramAsset, prefersDiagramAsset } from "./board-assets";
import { modules } from "./modules";
import { partCategory, resolvePartPhoto } from "./part-media";
import { passives } from "./passives";
import type { CatalogPart } from "./types";

export type AssetSource = "photo" | "illustration" | "generic" | "none";
export type DrawingKind =
  | "board-svg" // dedicated board drawing under public/assets/boards
  | "wokwi-element" // real Wokwi web component
  | "builtin" // drawn by our own React component (breadboard, power sources...)
  | "skeleton"; // generic fallback box (SkeletonPart)

export type AssetRecord = {
  partId: string;
  name: string;
  category: string; // Board | Sensor | Display | Output | Input | Power | Basic part
  photoHint: string | null;
  /** Public URL of the Parts-tab thumbnail, or null when there is none. */
  thumbnailUrl: string | null;
  thumbnailFormat: "jpg" | "svg" | "png" | null;
  thumbnailSource: AssetSource;
  /** Public URL of a standalone diagram drawing we can preview (SVG), or null for web components / generics. */
  drawingUrl: string | null;
  drawingKind: DrawingKind;
  /** Wokwi element tag or component name that draws it in the diagram. */
  drawingRef: string | null;
  /** True when the part has no specific art and falls back to a category-generic one. */
  usesGeneric: boolean;
  /** Which generic asset stands in (e.g. "skeleton:sensor"), or null. */
  genericRef: string | null;
  /** Licence / attribution note when known. */
  license: string | null;
  /** Problems found by the audit, empty when fine. */
  issues: string[];
};

export type AssetSummary = {
  total: number;
  withPhoto: number;
  withIllustration: number;
  generic: number;
  missing: number;
  skeletonDrawings: number;
};

const PHOTO_LICENSE_NOTE =
  "Photo: public/photos/README.md (some from Wikimedia Commons; per-file licence not recorded)";
const WOKWI_LICENSE_NOTE = "Diagram: MIT (@wokwi/elements)";
/** Wokwi elements whose look is far from the photo we show as thumbnail. */
const STYLE_MISMATCH_TAGS = new Set([
  "wokwi-pushbutton",
  "wokwi-potentiometer",
  "wokwi-slide-switch",
  "wokwi-buzzer",
  "wokwi-led",
  "wokwi-rgb-led",
]);
/** A thumbnail file smaller than this is treated as empty/placeholder. */
const MIN_FILE_BYTES = 500;

function publicFile(url: string): string {
  return path.join(process.cwd(), "public", url);
}

function fileUsable(url: string): boolean {
  const file = publicFile(url);
  return existsSync(file) && statSync(file).size >= MIN_FILE_BYTES;
}

function formatOf(url: string): AssetRecord["thumbnailFormat"] {
  const ext = path.extname(url).slice(1).toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "svg") return "svg";
  if (ext === "png") return "png";
  return null;
}

/** True when the photo hint names this part (so a shared image is its own, not a stand-in). */
function hintOwnedBy(hint: string, id: string): boolean {
  const haystack = id.toLowerCase();
  return hint
    .toLowerCase()
    .split("-")
    .every((token) => haystack.includes(token));
}

function batteryKind(id: string): BatteryKind | null {
  const record = batteryRecordForPart(id);
  return record && record.id in BATTERY_ASSETS ? (record.id as BatteryKind) : null;
}

type Drawing = Pick<
  AssetRecord,
  "drawingUrl" | "drawingKind" | "drawingRef" | "usesGeneric" | "genericRef"
> & { license: string | null };

function resolveDrawing(part: CatalogPart, category: string): Drawing {
  const none = { usesGeneric: false, genericRef: null, license: null };
  if (part.id.includes("breadboard")) {
    return {
      drawingUrl: null,
      drawingKind: "builtin",
      drawingRef: "BreadboardVisual",
      ...none,
    };
  }
  if (part.id.startsWith("passive.power.")) {
    const kind = batteryKind(part.id);
    if (kind) {
      const asset = BATTERY_ASSETS[kind];
      return {
        drawingUrl: asset.src,
        drawingKind: "builtin",
        drawingRef: "BatteryAssetVisual",
        ...none,
        license: asset.license,
      };
    }
    return {
      drawingUrl: null,
      drawingKind: "builtin",
      drawingRef: "UsbWallVisual",
      ...none,
    };
  }
  const hasWokwi = Boolean(part.wokwi?.tag);
  const asset = getDiagramAsset(part.id);
  if (asset && prefersDiagramAsset(part.id, hasWokwi)) {
    return {
      drawingUrl: asset.src,
      drawingKind: "board-svg",
      drawingRef: path.basename(asset.src),
      ...none,
      license: asset.license,
    };
  }
  if (part.wokwi?.tag) {
    return {
      drawingUrl: null,
      drawingKind: "wokwi-element",
      drawingRef: part.wokwi.tag,
      ...none,
      license: WOKWI_LICENSE_NOTE,
    };
  }
  return {
    drawingUrl: null,
    drawingKind: "skeleton",
    drawingRef: "SkeletonPart",
    usesGeneric: true,
    genericRef: `skeleton:${category.toLowerCase()}`,
    license: null,
  };
}

export function listAssetRecords(): AssetRecord[] {
  const parts: CatalogPart[] = [...boards, ...modules, ...passives];

  const hintUsers = new Map<string, number>();
  for (const part of parts) {
    if (part.photoHint) {
      hintUsers.set(part.photoHint, (hintUsers.get(part.photoHint) ?? 0) + 1);
    }
  }

  return parts.map((part): AssetRecord => {
    const category = partCategory(part);
    const issues: string[] = [];
    const registered = resolvePartPhoto(part.photoHint);
    const usable = registered !== null && fileUsable(registered);
    const thumbnailUrl = usable ? registered : null;
    const thumbnailFormat = thumbnailUrl ? formatOf(thumbnailUrl) : null;
    const sharedBy = part.photoHint ? (hintUsers.get(part.photoHint) ?? 1) : 1;
    const standIn =
      thumbnailUrl !== null &&
      sharedBy > 1 &&
      !hintOwnedBy(part.photoHint ?? "", part.id);

    let thumbnailSource: AssetSource;
    if (!thumbnailUrl) thumbnailSource = "none";
    else if (standIn) thumbnailSource = "generic";
    else if (thumbnailFormat === "svg") thumbnailSource = "illustration";
    else thumbnailSource = "photo";

    if (!part.photoHint) {
      issues.push("no thumbnail (part has no photoHint)");
    } else if (!registered) {
      issues.push(`no thumbnail registered for "${part.photoHint}"`);
    } else if (!usable) {
      issues.push(`thumbnail file missing/empty (${registered})`);
    }
    if (standIn) {
      issues.push(
        `thumbnail is a generic stand-in (${thumbnailUrl} is shared with ${sharedBy - 1} other part${sharedBy - 1 === 1 ? "" : "s"})`,
      );
    } else if (thumbnailUrl && sharedBy > 1) {
      issues.push(`thumbnail shared with ${sharedBy - 1} other part${sharedBy - 1 === 1 ? "" : "s"}`);
    }

    const drawing = resolveDrawing(part, category);
    if (drawing.drawingKind === "skeleton") {
      issues.push("no dedicated diagram drawing (skeleton)");
    }
    if (thumbnailFormat === "jpg") {
      if (drawing.drawingKind === "wokwi-element" && STYLE_MISMATCH_TAGS.has(drawing.drawingRef ?? "")) {
        issues.push("thumbnail style (jpg photo) differs from the diagram drawing");
      } else if (drawing.drawingKind === "board-svg") {
        issues.push("thumbnail style (jpg photo) differs from the board SVG drawing");
      }
    }
    if (thumbnailUrl && thumbnailFormat !== "svg" && !standIn) {
      issues.push("photo licence not recorded per file");
    }

    const licenseParts = [
      thumbnailUrl && thumbnailFormat !== "svg" ? PHOTO_LICENSE_NOTE : null,
      drawing.license,
    ].filter((value): value is string => Boolean(value));

    return {
      partId: part.id,
      name: part.name,
      category,
      photoHint: part.photoHint ?? null,
      thumbnailUrl,
      thumbnailFormat,
      thumbnailSource,
      drawingUrl: drawing.drawingUrl,
      drawingKind: drawing.drawingKind,
      drawingRef: drawing.drawingRef,
      usesGeneric: drawing.usesGeneric || thumbnailSource === "generic",
      genericRef: drawing.genericRef ?? (standIn ? `thumbnail:${thumbnailUrl}` : null),
      license: licenseParts.length ? licenseParts.join("; ") : null,
      issues,
    };
  });
}

export function summarizeAssets(records: AssetRecord[]): AssetSummary {
  const count = (test: (record: AssetRecord) => boolean) => records.filter(test).length;
  return {
    total: records.length,
    withPhoto: count((r) => r.thumbnailSource === "photo"),
    withIllustration: count((r) => r.thumbnailSource === "illustration"),
    generic: count((r) => r.thumbnailSource === "generic"),
    missing: count((r) => r.thumbnailSource === "none"),
    skeletonDrawings: count((r) => r.drawingKind === "skeleton"),
  };
}
