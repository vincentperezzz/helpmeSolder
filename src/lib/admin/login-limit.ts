/**
 * Failed-login throttle: 5 failures per 15 minutes per client address.
 * In-memory and per server instance (best effort), same approach as
 * src/lib/api/rate-limit.ts.
 */
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60_000;
const MAX_KEYS = 5_000;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  return (failures.get(key) ?? []).filter((t) => t > now - LOGIN_WINDOW_MS);
}

export function isLoginBlocked(key: string, now: number = Date.now()): boolean {
  return recent(key, now).length >= LOGIN_MAX_FAILURES;
}

export function recordLoginFailure(key: string, now: number = Date.now()): void {
  const list = recent(key, now);
  list.push(now);
  if (!failures.has(key) && failures.size >= MAX_KEYS) {
    const oldest = failures.keys().next().value;
    if (oldest !== undefined) failures.delete(oldest);
  }
  failures.set(key, list);
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}

export function resetLoginLimits(): void {
  failures.clear();
}

/** First x-forwarded-for entry, else x-real-ip, else "unknown". */
export function clientKeyFromHeaders(get: (name: string) => string | null): string {
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || get("x-real-ip") || "unknown";
}
