import { describe, expect, it } from "vitest";
import { isPhotoMediaPath, isPhotoSidecarPath, parsePhotoSidecar } from "../src/parsers/photos";

describe("parsePhotoSidecar", () => {
  it("extracts the capture timestamp from a sidecar", () => {
    const text = JSON.stringify({
      photoTakenTime: { timestamp: "1583020800", formatted: "Mar 1, 2020" },
    });
    expect(parsePhotoSidecar(text)).toBe(1583020800000);
  });

  it("returns null when photoTakenTime is missing", () => {
    expect(
      parsePhotoSidecar(JSON.stringify({ creationTime: { timestamp: "1583020800" } })),
    ).toBeNull();
  });

  it("returns null for malformed JSON without throwing", () => {
    expect(parsePhotoSidecar("not json")).toBeNull();
  });
});

describe("isPhotoMediaPath", () => {
  it("matches media files under a Google Photos folder", () => {
    expect(isPhotoMediaPath("Takeout/Google Photos/2020/IMG_0001.jpg")).toBe(true);
    expect(isPhotoMediaPath("Takeout/Google Photos/2020/clip.MP4")).toBe(true);
  });

  it("rejects sidecar JSON and files outside the Photos folder", () => {
    expect(isPhotoMediaPath("Takeout/Google Photos/2020/IMG_0001.jpg.json")).toBe(false);
    expect(isPhotoMediaPath("Takeout/YouTube/IMG_0001.jpg")).toBe(false);
  });
});

describe("isPhotoSidecarPath", () => {
  it("matches per-photo metadata JSON", () => {
    expect(isPhotoSidecarPath("Takeout/Google Photos/2020/IMG_0001.jpg.json")).toBe(true);
  });

  it("excludes the album-level metadata.json", () => {
    expect(isPhotoSidecarPath("Takeout/Google Photos/2020/metadata.json")).toBe(false);
  });

  it("rejects non-JSON and files outside the Photos folder", () => {
    expect(isPhotoSidecarPath("Takeout/Google Photos/2020/IMG_0001.jpg")).toBe(false);
    expect(isPhotoSidecarPath("Takeout/YouTube/history.json")).toBe(false);
  });
});
