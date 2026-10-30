/** Who made HelpmeSolder; shown as a small credit in the footer, guides and link previews. */
export const CREATOR = {
  name: "Vincent Perez",
  github: { handle: "vincentperezzz", url: "https://github.com/vincentperezzz" },
  instagram: { handle: "_vincentperez", url: "https://instagram.com/_vincentperez" },
} as const;

/** Plain one-line credit for places that cannot render links (image cards, MCP). */
export const CREATOR_LINE = `Made by ${CREATOR.name} · github.com/${CREATOR.github.handle} · instagram.com/${CREATOR.instagram.handle}`;
