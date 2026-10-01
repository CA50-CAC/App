import { describe, expect, it } from "vitest";
import { isSafePhotoPath, signLocalPhoto, verifyLocalPhoto } from "./photos";

const SECRET = "x".repeat(40);
const PATH = "6f1d1c3e-2c55-4c2f-9d63-1c8a8f2f3b11/1b0e7c1e-4a6e-4a59-9a8d-0f0b9e9b6a11.jpg";

describe("local photo URLs", () => {
  it("accept a valid signature before it expires", () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    expect(verifyLocalPhoto(PATH, exp, signLocalPhoto(PATH, exp, SECRET), SECRET)).toBe(true);
  });

  it("reject expired, tampered, or wrong-path signatures", () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const sig = signLocalPhoto(PATH, exp, SECRET);
    expect(verifyLocalPhoto(PATH, exp - 120, signLocalPhoto(PATH, exp - 120, SECRET), SECRET)).toBe(false);
    expect(verifyLocalPhoto(PATH, exp + 1, sig, SECRET)).toBe(false);
    expect(verifyLocalPhoto(PATH.replace("6f1d", "0000"), exp, sig, SECRET)).toBe(false);
    expect(verifyLocalPhoto(PATH, exp, sig, "y".repeat(40))).toBe(false);
    expect(verifyLocalPhoto(PATH, exp, "", SECRET)).toBe(false);
  });

  it("only allow '<school uuid>/<name>.jpg|svg' paths (no ../ tricks)", () => {
    expect(isSafePhotoPath(PATH)).toBe(true);
    expect(isSafePhotoPath("6f1d1c3e-2c55-4c2f-9d63-1c8a8f2f3b11/demo-bag-blue-0.svg")).toBe(true);
    expect(isSafePhotoPath("../../etc/passwd")).toBe(false);
    expect(isSafePhotoPath("6f1d1c3e-2c55-4c2f-9d63-1c8a8f2f3b11/../x.jpg")).toBe(false);
    expect(isSafePhotoPath("6f1d1c3e-2c55-4c2f-9d63-1c8a8f2f3b11/x.html")).toBe(false);
  });
});
