/** Test fixtures shaped like the live Wikimedia and Openverse APIs. */

/**
 * Commons page shaped like the live API in 2026: thumbnails are served from
 * thumb.wikimedia.org (they used to be upload.wikimedia.org), and the
 * original file is on upload.wikimedia.org.
 */
export function page(
  title: string,
  over: {
    index?: number;
    mime?: string;
    license?: string | null;
    artist?: string;
    thumb?: string;
    url?: string;
    desc?: string;
    licenseUrl?: string;
  } = {},
) {
  return {
    title,
    index: over.index ?? 1,
    imageinfo: [
      {
        mime: over.mime ?? "image/jpeg",
        thumburl:
          over.thumb ??
          "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/x.jpg/500px-x.jpg?utm_source=commons.wikimedia.org",
        url: over.url ?? "https://upload.wikimedia.org/wikipedia/commons/a/ab/x.jpg",
        descriptionurl: over.desc ?? "https://commons.wikimedia.org/wiki/File:x.jpg",
        extmetadata: {
          ...(over.license === null
            ? {}
            : { LicenseShortName: { value: over.license ?? "CC BY-SA 4.0" } }),
          Artist: { value: over.artist ?? '<a href="//x">Jane Roe</a>' },
          LicenseUrl: {
            value: over.licenseUrl ?? "https://creativecommons.org/licenses/by-sa/4.0",
          },
        },
      },
    ],
  };
}

export const wrap = (...pages: unknown[]) => ({
  query: { pages: Object.fromEntries(pages.map((p, i) => [String(100 + i), p])) },
});

export function openverseItem(over: Record<string, unknown> = {}) {
  return {
    id: "a1b2c3d4-0000-4000-8000-123456789abc",
    title: "Arduino Uno board",
    creator: "Sam <b>Fox</b>",
    license: "by",
    license_version: "2.0",
    license_url: "https://creativecommons.org/licenses/by/2.0/",
    foreign_landing_url: "https://www.flickr.com/photos/1/2",
    source: "flickr",
    mature: false,
    ...over,
  };
}
