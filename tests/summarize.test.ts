import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { summarizeArchive } from "../src/parsers/summarize";

async function buildZip(entries: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(entries)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("summarizeArchive", () => {
  it("summarizes a Takeout-shaped archive end to end", async () => {
    const archive = await buildZip({
      "Takeout/Location History/Records.json": "[]",
      "Takeout/YouTube/history.json": "[]",
    });

    const summary = await summarizeArchive(archive);

    expect(summary.provider).toBe("google-takeout");
    expect(summary.fileCount).toBe(2);
    expect(summary.topLevelEntries).toEqual(["Takeout"]);
  });

  it("falls back to unknown for an unrecognized archive", async () => {
    const archive = await buildZip({ "notes.txt": "hello" });

    const summary = await summarizeArchive(archive);

    expect(summary.provider).toBe("unknown");
    expect(summary.fileCount).toBe(1);
    expect(summary.categories).toEqual([]);
  });

  it("produces per-category counts, date ranges, and an overall date range for a full Takeout archive", async () => {
    const archive = await buildZip({
      "Takeout/Location History (Timeline)/Records.json": JSON.stringify({
        locations: [{ timestampMs: "1577836800000" }],
      }),
      "Takeout/Google Photos/2020/a.jpg": "binary",
      "Takeout/Google Photos/2020/a.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "1583020800" },
      }),
      "Takeout/My Activity/Search/MyActivity.json": JSON.stringify([
        { time: "2019-01-01T00:00:00Z" },
      ]),
      "Takeout/YouTube and YouTube Music/history/watch-history.json": JSON.stringify([
        { time: "2021-06-01T00:00:00Z" },
      ]),
    });

    const summary = await summarizeArchive(archive);

    const byKey = Object.fromEntries(summary.categories.map((c) => [c.key, c]));
    expect(byKey.location?.recordCount).toBe(1);
    expect(byKey.photos?.recordCount).toBe(1);
    expect(byKey.search?.recordCount).toBe(1);
    expect(byKey.youtube?.recordCount).toBe(1);

    expect(summary.dateRange.earliestMs).toBe(Date.parse("2019-01-01T00:00:00Z"));
    expect(summary.dateRange.latestMs).toBe(Date.parse("2021-06-01T00:00:00Z"));
  });

  it("flags an entirely absent category as missing rather than omitting it", async () => {
    const archive = await buildZip({
      "Takeout/Location History (Timeline)/Records.json": JSON.stringify({ locations: [] }),
    });

    const summary = await summarizeArchive(archive);

    const byKey = Object.fromEntries(summary.categories.map((c) => [c.key, c]));
    expect(byKey.youtube?.status).toBe("missing");
    expect(byKey.search?.status).toBe("missing");
  });

  it("streams progress: the fast path-matching pass fires before any decompression completes", async () => {
    const archive = await buildZip({
      "Takeout/Google Photos/2020/a.jpg": "binary",
      "Takeout/Google Photos/2020/a.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "1583020800" },
      }),
    });

    const snapshots: number[] = [];
    await summarizeArchive(archive, {
      onProgress: (partial) => {
        const photos = partial.categories.find((c) => c.key === "photos");
        snapshots.push(photos ? photos.recordCount : -1);
      },
    });

    expect(snapshots.length).toBeGreaterThan(1);
    expect(snapshots[0]).toBe(1); // exact from path names alone, before any file is decompressed
  });

  it("rejects with SummarizeAbortError when the signal is already aborted", async () => {
    const archive = await buildZip({ "Takeout/YouTube/history.json": "[]" });
    const controller = new AbortController();
    controller.abort();

    await expect(summarizeArchive(archive, { signal: controller.signal })).rejects.toThrow(
      "archive parsing was cancelled",
    );
  });

  it("surfaces a clear error for a non-zip file instead of throwing JSZip's raw message", async () => {
    const notAZip = new TextEncoder().encode("plain text, not a zip").buffer;
    await expect(summarizeArchive(notAZip)).rejects.toThrow(
      "couldn't read this file as a zip archive",
    );
  });

  it("surfaces the same clear error for a truncated/corrupted zip", async () => {
    const validZip = await buildZip({ "notes.txt": "hello" });
    const truncated = validZip.slice(0, Math.floor(validZip.byteLength / 2));
    await expect(summarizeArchive(truncated)).rejects.toThrow(
      "couldn't read this file as a zip archive",
    );
  });
});
