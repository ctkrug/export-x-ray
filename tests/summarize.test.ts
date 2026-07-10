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
  });
});
