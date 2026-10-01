import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** A long random token for links (invites). Only its hash is stored. */
export function newLinkToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
