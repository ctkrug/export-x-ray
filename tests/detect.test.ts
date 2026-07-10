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
});
