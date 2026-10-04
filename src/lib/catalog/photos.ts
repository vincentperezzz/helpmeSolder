import { existsSync } from "node:fs";
import path from "node:path";

const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export function resolvePhotoPath(photoHint?: string): string | null {
  if (!photoHint) {
    return null;
  }

  for (const extension of EXTENSIONS) {
    const absolute = path.join(
      process.cwd(),
      "public",
      "photos",
      `${photoHint}${extension}`,
    );
    if (existsSync(absolute)) {
      return `/photos/${photoHint}${extension}`;
    }
  }

  return null;
}
