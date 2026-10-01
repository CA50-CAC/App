/**
 * Signed tokens for cookies (staff sessions and student "joined school" sessions).
 *
 * A token is `payload.signature`, where the payload is base64url JSON and the
 * signature is an HMAC-SHA256 of the payload using SESSION_SECRET. Anyone can
 * read the payload, but nobody can change it (for example, swap in another
 * school's id) without the secret, because the signature would no longer match.
 *
 * So: put ids in here, never secrets.
 */

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signToken<T extends object>(payload: T, ttlSeconds: number, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyToken<T extends object>(token: string, secret: string): Promise<T | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    Buffer.from(sig, "base64url"),
    encoder.encode(body),
  );
  if (!ok) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number };
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}
