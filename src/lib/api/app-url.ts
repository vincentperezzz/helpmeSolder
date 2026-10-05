function isLocalOrigin(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(value);
}

/**
 * Public base URL: the configured value, else the origin the request came in
 * on. A localhost value is ignored when the request is served from a real host.
 */
export function getAppUrl(request: Request): string {
  const origin = new URL(request.url).origin;
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured || (isLocalOrigin(configured) && !isLocalOrigin(origin))) {
    return origin;
  }
  return configured.replace(/\/$/, "");
}
