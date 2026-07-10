// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildReportFilename, buildSummaryReport, downloadReport } from "../src/ui/export-report";
import type { ArchiveSummary } from "../src/types";

const summary: ArchiveSummary = {
  provider: "google-takeout",
  fileCount: 1200,
  topLevelEntries: ["Takeout"],
  dateRange: { earliestMs: 1577836800000, latestMs: 1583020800000 },
  categories: [
    {
      key: "location",
      label: "Location History",
      status: "present",
      recordCount: 220000,
      dateRange: { earliestMs: 1577836800000, latestMs: 1583020800000 },
    },
  ],
};

describe("buildSummaryReport", () => {
  it("serializes the full summary as pretty-printed JSON", () => {
    const report = buildSummaryReport(summary);
    expect(JSON.parse(report)).toEqual({
      provider: "google-takeout",
      fileCount: 1200,
      topLevelEntries: ["Takeout"],
      dateRange: summary.dateRange,
      categories: summary.categories,
    });
    expect(report).toContain("\n");
  });

  it("round-trips a summary with no categories", () => {
    const empty: ArchiveSummary = { ...summary, categories: [] };
    expect(JSON.parse(buildSummaryReport(empty)).categories).toEqual([]);
  });
});

describe("buildReportFilename", () => {
  it("names the file after the detected provider", () => {
    expect(buildReportFilename(summary)).toBe("export-x-ray-summary-google-takeout.json");
    expect(buildReportFilename({ ...summary, provider: "spotify" })).toBe(
      "export-x-ray-summary-spotify.json",
    );
  });
});

describe("downloadReport", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a Blob URL, clicks a temporary link, then cleans up", () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadReport(summary);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(document.querySelectorAll("a[download]").length).toBe(0);
  });
});
