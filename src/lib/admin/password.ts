import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with scrypt. Stored as
 * `scrypt$N$r$p$saltB64$hashB64`; the leading tag and the embedded parameters
 * let the cost change later without breaking old hashes.
 */
const TAG = "scrypt";
const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const SALT_BYTES = 16;
const KEY_LENGTH = 64;
// Bounds for hashes read back from storage, so a bad row cannot make us burn memory.
const MAX_N = 1 << 20;
const MAX_R = 32;
const MAX_P = 16;
const MAX_MEM = 256 * 1024 * 1024;

function derive(
  password: string,
  salt: Buffer,
  N: number,
  r: number,
  p: number,
  keylen: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      keylen,
      { N, r, p, maxmem: MAX_MEM },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, PARAMS.N, PARAMS.r, PARAMS.p, KEY_LENGTH);
  return [
    TAG,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

type ParsedHash = { N: number; r: number; p: number; salt: Buffer; key: Buffer };

function parseHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== TAG) return null;
  const [N, r, p] = [parts[1], parts[2], parts[3]].map((v) =>
    /^\d{1,8}$/.test(v) ? Number(v) : NaN,
  );
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return null;
  if (N < 2 || N > MAX_N || (N & (N - 1)) !== 0) return null;
  if (r < 1 || r > MAX_R || p < 1 || p > MAX_P) return null;
  const salt = Buffer.from(parts[4], "base64");
  const key = Buffer.from(parts[5], "base64");
  if (salt.length < 8 || key.length < 16 || key.length > 128) return null;
  return { N, r, p, salt, key };
}

/** True only when the password matches. Bad formats and errors return false. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  try {
    const key = await derive(password, parsed.salt, parsed.N, parsed.r, parsed.p, parsed.key.length);
    return key.length === parsed.key.length && timingSafeEqual(key, parsed.key);
  } catch {
    return false;
  }
}

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

export type PasswordProblem = "mismatch" | "short" | "long" | "common" | "same";

/** Rules for a new admin password. Returns the first problem, or null when fine. */
export function validateNewPassword(input: {
  current: string;
  next: string;
  confirm: string;
}): PasswordProblem | null {
  if (input.next !== input.confirm) return "mismatch";
  if (input.next.trim().toLowerCase() === "admin") return "common";
  if (input.next.length < MIN_PASSWORD_LENGTH) return "short";
  if (input.next.length > MAX_PASSWORD_LENGTH) return "long";
  if (input.next === input.current) return "same";
  return null;
}
