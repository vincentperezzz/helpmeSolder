const DEFAULT_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Days a guide is kept without being opened or updated (env GUIDE_RETENTION_DAYS). */
export function getRetentionDays(): number {
  const parsed = Number.parseInt(process.env.GUIDE_RETENTION_DAYS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
}

/** The moment an untouched guide becomes eligible for deletion. */
export function getExpiryDate(
  lastAccessedAt: string | Date,
  days: number = getRetentionDays(),
): Date {
  return new Date(new Date(lastAccessedAt).getTime() + days * DAY_MS);
}

/** Plain-language sentence used on the site and in tool responses. */
export function retentionNotice(days: number = getRetentionDays()): string {
  return `Guides are deleted automatically if nobody opens them for ${days} days. Opening or updating a guide resets the timer.`;
}
