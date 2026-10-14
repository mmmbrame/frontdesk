import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "atlas_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function secret(): string {
  const value = process.env.ATLAS_SESSION_SECRET;
  if (!value) throw new Error("ATLAS_SESSION_SECRET is not set on the server.");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function sameText(a: string, b: string): boolean {
  // Compare fixed-length digests so the check does not leak the length of the secret.
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ATLAS_USERNAME;
  const expectedPassword = process.env.ATLAS_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    throw new Error("Sign-in is not configured. Set ATLAS_USERNAME and ATLAS_PASSWORD.");
  }
  const userOk = sameText(username, expectedUser);
  const passOk = sameText(password, expectedPassword);
  return userOk && passOk;
}

export function createSessionToken(user: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: user, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSession(cookieHeader: string | undefined): { user: string } | null {
  const token = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u: string; exp: number };
    if (typeof data.exp !== "number" || data.exp * 1000 < Date.now()) return null;
    return { user: data.u };
  } catch {
    return null;
  }
}

export function sessionCookie(value: string, maxAge: number): string {
  const secure = process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}
