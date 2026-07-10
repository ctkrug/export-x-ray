import { describe, expect, it } from "vitest";
import {
  buildStatTiles,
  formatCategoryCount,
  formatCount,
  formatProviderLabel,
} from "../src/ui/format";
import type { ArchiveSummary, CategorySummary } from "../src/types";

function makeCategory(overrides: Partial<CategorySummary>): CategorySummary {
  return {
    key: "location",
    label: "Location History",
    status: "present",
    recordCount: 0,
    dateRange: { earliestMs: null, latestMs: null },
    ...overrides,
  };
}

describe("formatCount", () => {
  it("adds thousands separators", () => {
    expect(formatCount(220412)).toBe("220,412");
  });

  it("handles zero", () => {
    expect(formatCount(0)).toBe("0");
  });
});

describe("formatProviderLabel", () => {
  it("maps every provider to a human label", () => {
    expect(formatProviderLabel("google-takeout")).toBe("Google Takeout");
    expect(formatProviderLabel("facebook")).toBe("Facebook");
    expect(formatProviderLabel("spotify")).toBe("Spotify");
    expect(formatProviderLabel("unknown")).toBe("Unknown export");
  });
});

describe("formatCategoryCount", () => {
  it("pairs the count with the category's noun", () => {
    const photos = makeCategory({ key: "photos", label: "Photos", recordCount: 42 });
    expect(formatCategoryCount(photos)).toBe("42 photos");
  });
});

describe("buildStatTiles", () => {
  const baseSummary: ArchiveSummary = {
    provider: "google-takeout",
    fileCount: 1200,
    topLevelEntries: ["Takeout"],
    dateRange: {
      earliestMs: Date.parse("2012-01-01T00:00:00Z"),
      latestMs: Date.parse("2024-07-10T00:00:00Z"),
    },
    categories: [],
  };

  it("always includes files found and the overall date range", () => {
    const tiles = buildStatTiles(baseSummary);
    expect(tiles[0]).toEqual({ label: "Files found", value: "1,200" });
    expect(tiles[1]).toEqual({ label: "Date range", value: "2012-01-01 – 2024-07-10" });
  });

  it("shows an em dash for an unresolved date range", () => {
    const tiles = buildStatTiles({
      ...baseSummary,
      dateRange: { earliestMs: null, latestMs: null },
    });
    expect(tiles[1]?.value).toBe("—");
  });

  it("adds a location points tile only when location data is present", () => {
    const withLocation = buildStatTiles({
      ...baseSummary,
      categories: [makeCategory({ key: "location", recordCount: 220000, status: "present" })],
    });
    expect(withLocation.some((t) => t.label === "Location points" && t.value === "220,000")).toBe(
      true,
    );

    const withoutLocation = buildStatTiles({
      ...baseSummary,
      categories: [makeCategory({ key: "location", recordCount: 0, status: "missing" })],
    });
    expect(withoutLocation.some((t) => t.label === "Location points")).toBe(false);
  });

  it("adds photo count and oldest/newest tiles when photos are present", () => {
    const tiles = buildStatTiles({
      ...baseSummary,
      categories: [
        makeCategory({
          key: "photos",
          label: "Photos",
          recordCount: 5,
          status: "present",
          dateRange: {
            earliestMs: Date.parse("2012-03-01T00:00:00Z"),
            latestMs: Date.parse("2020-01-01T00:00:00Z"),
          },
        }),
      ],
    });

    expect(tiles.find((t) => t.label === "Photos")).toEqual({ label: "Photos", value: "5" });
    expect(tiles.find((t) => t.label === "Oldest photo")).toEqual({
      label: "Oldest photo",
      value: "2012-03-01",
    });
    expect(tiles.find((t) => t.label === "Newest photo")).toEqual({
      label: "Newest photo",
      value: "2020-01-01",
    });
  });

  it("falls back to a top-level entries tile when there are no categories at all", () => {
    const tiles = buildStatTiles({ ...baseSummary, provider: "unknown", categories: [] });
    expect(tiles.find((t) => t.label === "Top-level entries")).toEqual({
      label: "Top-level entries",
      value: "Takeout",
    });
  });
});
