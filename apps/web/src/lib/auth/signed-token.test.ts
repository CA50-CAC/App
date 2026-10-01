import { describe, expect, it } from "vitest";
import { isPlatformAdminEmail } from "./provider";
import { signToken, verifyToken } from "./signed-token";

const SECRET = "test-secret-that-is-long-enough-123456";

describe("signed tokens", () => {
  it("round-trips a payload", async () => {
    const token = await signToken({ schoolId: "a" }, 60, SECRET);
    expect(await verifyToken<{ schoolId: string }>(token, SECRET)).toMatchObject({ schoolId: "a" });
  });

  it("rejects a tampered payload (switching schools)", async () => {
    const token = await signToken({ schoolId: "a" }, 60, SECRET);
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ schoolId: "b", exp: 9999999999 })).toString("base64url");
    expect(await verifyToken(`${forged}.${sig}`, SECRET)).toBeNull();
  });

  it("rejects the wrong secret and expired tokens", async () => {
    const token = await signToken({ schoolId: "a" }, 60, SECRET);
    expect(await verifyToken(token, "another-secret-that-is-long-enough-0000")).toBeNull();
    const expired = await signToken({ schoolId: "a" }, -1, SECRET);
    expect(await verifyToken(expired, SECRET)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyToken("not-a-token", SECRET)).toBeNull();
    expect(await verifyToken("a.b", SECRET)).toBeNull();
  });
});

describe("platform admin list", () => {
  it("matches case-insensitively and ignores blanks", () => {
    expect(isPlatformAdminEmail("Admin@Example.com", " admin@example.com, ,other@x.org")).toBe(true);
    expect(isPlatformAdminEmail("nope@example.com", "admin@example.com")).toBe(false);
    expect(isPlatformAdminEmail("x@y.z", "")).toBe(false);
  });
});
