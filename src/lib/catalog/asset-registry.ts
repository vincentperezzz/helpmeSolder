/**
 * One record per catalog part describing every image asset we use for it.
 * The admin Catalog tab renders these. (Stub: filled in by the asset audit.)
 */
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

export function listAssetRecords(): AssetRecord[] {
  return [];
}
