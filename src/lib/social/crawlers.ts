/**
 * Link-preview ("unfurl") bots. They fetch a shared URL once to read its
 * meta tags. They are allowed to fetch /guides/ in robots.txt (the page stays
 * noindex), and must never count as a person opening the guide.
 */
export const UNFURL_BOT_TOKENS = [
  "facebookexternalhit",
  "meta-externalagent",
  "Twitterbot",
  "Slackbot",
  "Slack-ImgProxy",
  "Discordbot",
  "TelegramBot",
  "WhatsApp",
  "LinkedInBot",
  "Applebot",
  "SkypeUriPreview",
  "Mastodon",
] as const;

const UNFURL_BOT_PATTERN = new RegExp(UNFURL_BOT_TOKENS.join("|"), "i");

export function isLinkPreviewBot(userAgent: string | null | undefined): boolean {
  return !!userAgent && UNFURL_BOT_PATTERN.test(userAgent);
}
