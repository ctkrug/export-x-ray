import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  TAKEOUT_CATEGORY_DEFINITIONS,
  accumulateCategory,
  flagCategoryStatus,
  initialCategorySummary,
} from "../src/parsers/categories";

function getDefinition(key: string) {
  const def = TAKEOUT_CATEGORY_DEFINITIONS.find((d) => d.key === key);
  if (!def) throw new Error(`no category definition for ${key}`);
  return def;
}

async function buildZip(entries: Record<string, string>): Promise<JSZip> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(entries)) {
    zip.file(path, content);
  }
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return JSZip.loadAsync(buffer);
}

describe("flagCategoryStatus", () => {
  it("is missing when no files matched", () => {
    expect(flagCategoryStatus(0, 0, 10)).toBe("missing");
  });

  it("is missing when files matched but zero records parsed", () => {
    expect(flagCategoryStatus(1, 0, 10)).toBe("missing");
  });

  it("is thin when below the threshold", () => {
    expect(flagCategoryStatus(1, 5, 10)).toBe("thin");
  });

  it("is present at or above the threshold", () => {
    expect(flagCategoryStatus(1, 10, 10)).toBe("present");
  });
});

describe("initialCategorySummary", () => {
  it("reports missing for a category with no matching paths", () => {
    const summary = initialCategorySummary(getDefinition("location"), [
      "Takeout/YouTube/history.json",
    ]);
    expect(summary.status).toBe("missing");
    expect(summary.recordCount).toBe(0);
  });

  it("reports an exact count for Photos from path names alone", () => {
    const summary = initialCategorySummary(getDefinition("photos"), [
      "Takeout/Google Photos/2020/a.jpg",
      "Takeout/Google Photos/2020/b.jpg",
    ]);
    expect(summary.recordCount).toBe(2);
    expect(summary.status).toBe("thin");
  });

  it("reports a provisional present for Location before any decompression", () => {
    const summary = initialCategorySummary(getDefinition("location"), [
      "Takeout/Location History (Timeline)/Records.json",
    ]);
    expect(summary.status).toBe("present");
    expect(summary.recordCount).toBe(0);
  });
});

describe("accumulateCategory", () => {
  it("accumulates Location History record count and date range from a real archive", async () => {
    const zip = await buildZip({
      "Takeout/Location History (Timeline)/Records.json": JSON.stringify({
        locations: Array.from({ length: 60 }, (_, i) => ({
          timestampMs: String(1583020800000 + i * 1000),
        })),
      }),
    });
    const paths = Object.keys(zip.files);
    const updates: number[] = [];

    const result = await accumulateCategory(getDefinition("location"), zip, paths, (summary) => {
      updates.push(summary.recordCount);
    });

    expect(result.recordCount).toBe(60);
    expect(result.status).toBe("present");
    expect(result.dateRange.earliestMs).toBe(1583020800000);
    expect(result.dateRange.latestMs).toBe(1583020800000 + 59_000);
    expect(updates.length).toBeGreaterThan(0);
  });

  it("reports missing when the archive has no location files at all", async () => {
    const zip = await buildZip({ "Takeout/YouTube/history.json": "[]" });
    const paths = Object.keys(zip.files);
    const result = await accumulateCategory(getDefinition("location"), zip, paths, () => {});
    expect(result.status).toBe("missing");
    expect(result.recordCount).toBe(0);
  });

  it("counts Photos from media files while sourcing dates only from sidecars", async () => {
    const zip = await buildZip({
      "Takeout/Google Photos/2020/a.jpg": "binary",
      "Takeout/Google Photos/2020/a.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "1583020800" },
      }),
      "Takeout/Google Photos/2020/b.jpg": "binary",
    });
    const paths = Object.keys(zip.files);
    const result = await accumulateCategory(getDefinition("photos"), zip, paths, () => {});

    expect(result.recordCount).toBe(2);
    expect(result.dateRange.earliestMs).toBe(1583020800000);
    expect(result.dateRange.latestMs).toBe(1583020800000);
  });

  it("throttles onUpdate to one per-file emit plus a final forced emit when the clock is frozen", async () => {
    const zip = await buildZip({
      "Takeout/Google Photos/2020/a.jpg": "binary",
      "Takeout/Google Photos/2020/a.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "1" },
      }),
      "Takeout/Google Photos/2020/b.jpg": "binary",
      "Takeout/Google Photos/2020/b.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "2" },
      }),
      "Takeout/Google Photos/2020/c.jpg": "binary",
      "Takeout/Google Photos/2020/c.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "3" },
      }),
    });
    const paths = Object.keys(zip.files);
    let updates = 0;

    await accumulateCategory(
      getDefinition("photos"),
      zip,
      paths,
      () => {
        updates += 1;
      },
      undefined,
      () => 0,
    );

    // Three sidecar files decompress, but with the clock frozen only the very
    // first per-file emit clears the throttle window; the rest are
    // coalesced away until the loop's own final (forced) emit.
    expect(updates).toBe(2);
  });

  it("emits every update when the clock clears the throttle window each time", async () => {
    const zip = await buildZip({
      "Takeout/Google Photos/2020/a.jpg": "binary",
      "Takeout/Google Photos/2020/a.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "1" },
      }),
      "Takeout/Google Photos/2020/b.jpg": "binary",
      "Takeout/Google Photos/2020/b.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "2" },
      }),
    });
    const paths = Object.keys(zip.files);
    let clock = 0;
    let updates = 0;

    await accumulateCategory(
      getDefinition("photos"),
      zip,
      paths,
      () => {
        updates += 1;
      },
      undefined,
      () => (clock += 200),
    );

    expect(updates).toBe(3);
  });

  it("stops decompressing further sidecar files once the abort signal fires", async () => {
    const zip = await buildZip({
      "Takeout/Google Photos/2020/a.jpg": "binary",
      "Takeout/Google Photos/2020/a.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "1583020800" },
      }),
      "Takeout/Google Photos/2020/b.jpg": "binary",
      "Takeout/Google Photos/2020/b.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "1583020800" },
      }),
    });
    const paths = Object.keys(zip.files);
    const controller = new AbortController();
    controller.abort();

    const result = await accumulateCategory(
      getDefinition("photos"),
      zip,
      paths,
      () => {},
      controller.signal,
    );

    // countPaths (the media files themselves) are still counted immediately —
    // only the sidecar decompression loop is short-circuited by the signal.
    expect(result.recordCount).toBe(2);
    expect(result.dateRange).toEqual({ earliestMs: null, latestMs: null });
  });
});
