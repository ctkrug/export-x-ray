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

  it("summarizes a genuinely empty zip (zero entries) without throwing", async () => {
    const archive = await buildZip({});

    const summary = await summarizeArchive(archive);

    expect(summary.provider).toBe("unknown");
    expect(summary.fileCount).toBe(0);
    expect(summary.topLevelEntries).toEqual([]);
    expect(summary.categories).toEqual([]);
  });

  it("rejects a zero-byte input with the same clear error as any unreadable file", async () => {
    await expect(summarizeArchive(new ArrayBuffer(0))).rejects.toThrow(
      "couldn't read this file as a zip archive",
    );
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

  it("rejects with SummarizeAbortError when aborted mid-parse, between categories", async () => {
    const archive = await buildZip({
      "Takeout/Location History (Timeline)/Records.json": JSON.stringify({ locations: [] }),
      "Takeout/YouTube and YouTube Music/history/watch-history.json": "[]",
    });
    const controller = new AbortController();
    let onProgressCalls = 0;

    await expect(
      summarizeArchive(archive, {
        signal: controller.signal,
        onProgress: () => {
          onProgressCalls += 1;
          // Abort partway through, after the fast initial pass has already
          // fired but before every category has finished accumulating.
          if (onProgressCalls === 2) controller.abort();
        },
      }),
    ).rejects.toThrow("archive parsing was cancelled");
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

  it("summarizes a Facebook-shaped archive end to end", async () => {
    const archive = await buildZip({
      "your_activity_across_facebook/posts/your_posts_1.json": JSON.stringify([
        { timestamp: 1577836800 },
        { timestamp: 1583020800 },
      ]),
      "messages/inbox/friend_123/message_1.json": JSON.stringify({
        messages: [{ sender_name: "A", timestamp_ms: 1590000000000 }],
      }),
      "photos_and_videos/your_photos.json": JSON.stringify([
        { uri: "a.jpg", creation_timestamp: 1583020800 },
      ]),
    });

    const summary = await summarizeArchive(archive);

    expect(summary.provider).toBe("facebook");
    const byKey = Object.fromEntries(summary.categories.map((c) => [c.key, c]));
    expect(byKey.posts?.recordCount).toBe(2);
    expect(byKey.messages?.recordCount).toBe(1);
    expect(byKey.photos?.recordCount).toBe(1);
    expect(summary.dateRange.earliestMs).toBe(1577836800000);
    expect(summary.dateRange.latestMs).toBe(1590000000000);
  });

  it("summarizes a Spotify-shaped archive end to end", async () => {
    const archive = await buildZip({
      "MyData/StreamingHistory0.json": JSON.stringify([
        { endTime: "2021-06-01 12:00", artistName: "A", trackName: "T", msPlayed: 1000 },
      ]),
      "MyData/Playlist1.json": JSON.stringify({
        playlists: [{ name: "Road trip", items: [{ addedDate: "2020-01-01" }] }],
      }),
      "MyData/YourLibrary.json": JSON.stringify({ tracks: [{ trackName: "T1" }] }),
    });

    const summary = await summarizeArchive(archive);

    expect(summary.provider).toBe("spotify");
    const byKey = Object.fromEntries(summary.categories.map((c) => [c.key, c]));
    expect(byKey.streaming?.recordCount).toBe(1);
    expect(byKey.playlists?.recordCount).toBe(1);
    expect(byKey.library?.recordCount).toBe(1);
    expect(byKey.library?.dateRange).toEqual({ earliestMs: null, latestMs: null });
  });

  it("handles a large number of small Photos files without hanging or losing counts", async () => {
    const entries: Record<string, string> = {};
    const fileCount = 500;
    for (let i = 0; i < fileCount; i += 1) {
      entries[`Takeout/Google Photos/2020/IMG_${i}.jpg`] = "binary";
      entries[`Takeout/Google Photos/2020/IMG_${i}.jpg.json`] = JSON.stringify({
        photoTakenTime: { timestamp: String(1583020800 + i) },
      });
    }
    const archive = await buildZip(entries);

    const progressSnapshots: number[] = [];
    const summary = await summarizeArchive(archive, {
      onProgress: (partial) => {
        progressSnapshots.push(partial.categories.length);
      },
    });

    const photos = summary.categories.find((c) => c.key === "photos");
    expect(photos?.recordCount).toBe(fileCount);
    expect(photos?.status).toBe("present");
    // The emit throttle (categories.ts) should coalesce updates well below one
    // per file — this is the exact mechanism that keeps the UI thread free
    // enough for Cancel to stay responsive on a large archive.
    expect(progressSnapshots.length).toBeLessThan(fileCount);
  });

  it("produces the same ArchiveSummary shape across all three providers", async () => {
    const takeout = await summarizeArchive(
      await buildZip({ "Takeout/YouTube/history.json": "[]" }),
    );
    const facebook = await summarizeArchive(
      await buildZip({ "your_activity_across_facebook/posts/your_posts_1.json": "[]" }),
    );
    const spotify = await summarizeArchive(await buildZip({ "MyData/YourLibrary.json": "{}" }));

    for (const summary of [takeout, facebook, spotify]) {
      expect(Object.keys(summary).sort()).toEqual(
        ["categories", "dateRange", "fileCount", "provider", "topLevelEntries"].sort(),
      );
      expect(typeof summary.fileCount).toBe("number");
      expect(Array.isArray(summary.categories)).toBe(true);
      expect(Object.keys(summary.dateRange).sort()).toEqual(["earliestMs", "latestMs"]);
      for (const category of summary.categories) {
        expect(Object.keys(category).sort()).toEqual(
          ["dateRange", "key", "label", "recordCount", "status"].sort(),
        );
      }
    }
  });
});
