// @vitest-environment jsdom
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initApp } from "../src/main";

async function buildZipFile(entries: Record<string, string>): Promise<File> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(entries)) {
    zip.file(path, content);
  }
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buffer], "export.zip", { type: "application/zip" });
}

function dropEvent(file: File): Event {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { files: [file] } });
  return event;
}

const originalFetch = globalThis.fetch;
const originalXhrOpen = XMLHttpRequest.prototype.open;

describe("privacy: no network calls during a drop-to-summary run", () => {
  let fetchCallCount = 0;
  let xhrOpenCallCount = 0;

  beforeEach(() => {
    document.body.innerHTML = "";
    fetchCallCount = 0;
    xhrOpenCallCount = 0;

    if (typeof originalFetch === "function") {
      globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
        fetchCallCount += 1;
        return originalFetch.apply(globalThis, args);
      }) as typeof fetch;
    }

    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]) {
      xhrOpenCallCount += 1;
      return (originalXhrOpen as (...a: unknown[]) => void).apply(this, args);
    } as typeof XMLHttpRequest.prototype.open;
  });

  afterEach(() => {
    if (typeof originalFetch === "function") globalThis.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXhrOpen;
  });

  it("never calls fetch or XMLHttpRequest while parsing a full Takeout-shaped archive", async () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    initApp(root);

    const file = await buildZipFile({
      "Takeout/Location History (Timeline)/Records.json": JSON.stringify({
        locations: [{ timestampMs: "1583020800000" }],
      }),
      "Takeout/Google Photos/2020/a.jpg": "binary",
      "Takeout/Google Photos/2020/a.jpg.json": JSON.stringify({
        photoTakenTime: { timestamp: "1583020800" },
      }),
      "Takeout/My Activity/Search/MyActivity.json": JSON.stringify([
        { time: "2019-01-01T00:00:00Z" },
      ]),
    });

    const dropzone = root.querySelector<HTMLDivElement>("#dropzone")!;
    const resetButton = root.querySelector<HTMLButtonElement>("#reset-button")!;
    dropzone.dispatchEvent(dropEvent(file));

    // Wait for the run to fully settle (Cancel replaced by New file) so no
    // JSZip decompression is still in flight when the test environment tears down.
    await vi.waitFor(() => expect(resetButton.hidden).toBe(false), { timeout: 5000 });

    expect(fetchCallCount).toBe(0);
    expect(xhrOpenCallCount).toBe(0);
  });
});
