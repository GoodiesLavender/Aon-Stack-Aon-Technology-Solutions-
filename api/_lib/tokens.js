import { randomBytes, timingSafeEqual } from "node:crypto";

/** High-entropy capability token for agreement receipt access (not a password). */
export function createAgreementAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function tokensMatch(a, b) {
  if (!a || !b || typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}
