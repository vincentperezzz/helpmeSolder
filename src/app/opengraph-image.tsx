import { renderSocialCard } from "@/lib/social/card";

export const alt = "HelpmeSolder: Soldering guides you can just follow.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderSocialCard({
    title: ["HelpmeSolder"],
    titleSize: 88,
    subtitle: ["Soldering guides", "you can just follow."],
  });
}
