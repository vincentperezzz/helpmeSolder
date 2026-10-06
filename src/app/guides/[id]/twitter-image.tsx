import { renderSocialCard } from "@/lib/social/card";

// Generic by design: guide links are secret, so this card never reads the
// guide (no database access, no params) and cannot leak its contents.
export const alt = "A HelpmeSolder wiring guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderSocialCard({
    title: ["A HelpmeSolder", "wiring guide"],
    titleSize: 64,
    subtitle: ["Wiring and solder steps", "for your build"],
  });
}
