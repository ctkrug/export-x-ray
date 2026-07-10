import { describe, expect, it } from "vitest";
import { detectProvider } from "../src/parsers/detect";

describe("detectProvider", () => {
  it("recognizes a Google Takeout archive", () => {
    expect(detectProvider(["Takeout"])).toBe("google-takeout");
  });

  it("recognizes a Facebook export", () => {
    expect(detectProvider(["your_activity_across_facebook"])).toBe("facebook");
  });

  it("recognizes a Spotify export", () => {
    expect(detectProvider(["MyData"])).toBe("spotify");
  });

  it("falls back to unknown for unrecognized layouts", () => {
    expect(detectProvider(["random_folder", "notes.txt"])).toBe("unknown");
  });

  it("falls back to unknown for an archive with no top-level entries", () => {
    expect(detectProvider([])).toBe("unknown");
  });

  it("recognizes a Facebook export named exactly 'facebook', case-insensitively", () => {
    expect(detectProvider(["FACEBOOK"])).toBe("facebook");
  });

  it("matches provider hints regardless of case", () => {
    expect(detectProvider(["TAKEOUT"])).toBe("google-takeout");
    expect(detectProvider(["mydata"])).toBe("spotify");
  });

  it("prefers Takeout when multiple providers' hints are present, since it's checked first", () => {
    expect(detectProvider(["Takeout", "MyData"])).toBe("google-takeout");
  });

  it("doesn't throw for unicode or emoji entry names", () => {
    expect(detectProvider(["📦 randomfolder", "notes_日本語.txt"])).toBe("unknown");
  });
});
