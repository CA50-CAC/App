/**
 * EXIF stripping (CLAUDE.md Section 7, "never cut"). Builds a JPEG that
 * carries GPS coordinates and a camera serial number, runs it through the
 * upload pipeline, and checks nothing survives.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, processUpload } from "./images";

async function photoWithExif(width = 400, height = 300): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: "TestCam", Model: "Spy 3000", Artist: "Jane Student", Copyright: "SECRET-OWNER" },
      IFD2: { BodySerialNumber: "SN-123456" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "37/1 46/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "122/1 25/1 0/1" },
    })
    .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description>SECRET-XMP</rdf:Description></rdf:RDF></x:xmpmeta>')
    .toBuffer();
}

describe("processUpload", () => {
  it("the test photo really does carry EXIF, GPS, and XMP to begin with", async () => {
    const meta = await sharp(await photoWithExif()).metadata();
    expect(meta.exif).toBeDefined();
    expect(meta.xmp).toBeDefined();
    expect(meta.exif!.toString("latin1")).toContain("SECRET-OWNER");
  });

  it("strips all EXIF (including GPS), XMP, and ICC data", async () => {
    const result = await processUpload(await photoWithExif());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const meta = await sharp(result.jpeg).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.iptc).toBeUndefined();
    const raw = result.jpeg.toString("latin1");
    for (const secret of ["SECRET-OWNER", "SECRET-XMP", "SN-123456", "Spy 3000", "Jane Student", "GPS"]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("applies the EXIF orientation before dropping it, so photos stay upright", async () => {
    // Orientation 6 = "rotate 90° clockwise to display". A 400x300 stored image displays as 300x400.
    const rotated = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#336699" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const result = await processUpload(rotated);
    if (!result.ok) throw new Error("expected ok");
    const meta = await sharp(result.jpeg).metadata();
    expect([meta.width, meta.height]).toEqual([300, 400]);
    expect(meta.orientation).toBeUndefined();
  });

  it("shrinks big photos to 1600px on the long side", async () => {
    const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#888" } }).png().toBuffer();
    const result = await processUpload(big);
    if (!result.ok) throw new Error("expected ok");
    const meta = await sharp(result.jpeg).metadata();
    expect([meta.width, meta.height]).toEqual([1600, 1067]);
  });

  it("rejects files that aren't images, and files that are too big", async () => {
    expect(await processUpload(new TextEncoder().encode("<script>alert(1)</script>"))).toEqual({ ok: false, error: "not_image" });
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(await processUpload(svg)).toEqual({ ok: false, error: "not_image" });
    expect(await processUpload(new Uint8Array(MAX_UPLOAD_BYTES + 1))).toEqual({ ok: false, error: "too_big" });
  });
});
