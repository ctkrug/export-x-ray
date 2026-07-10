// @vitest-environment jsdom
import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initApp } from "../src/main";

async function buildZipFile(entries: Record<string, string>, name = "export.zip"): Promise<File> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(entries)) {
    zip.file(path, content);
  }
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buffer], name, { type: "application/zip" });
}

function dropEvent(file: File): Event {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { files: [file] } });
  return event;
}

function mount() {
  const root = document.createElement("div");
  document.body.appendChild(root);
  initApp(root);
  return {
    root,
    dropzone: root.querySelector<HTMLDivElement>("#dropzone")!,
    dashboard: root.querySelector<HTMLDivElement>("#dashboard")!,
    errorPanel: root.querySelector<HTMLDivElement>("#error-panel")!,
    errorRetryButton: root.querySelector<HTMLButtonElement>("#error-retry-button")!,
    providerChip: root.querySelector<HTMLSpanElement>("#provider-chip")!,
    statGrid: root.querySelector<HTMLDivElement>("#stat-grid")!,
    exportButton: root.querySelector<HTMLButtonElement>("#export-button")!,
    cancelButton: root.querySelector<HTMLButtonElement>("#cancel-button")!,
    resetButton: root.querySelector<HTMLButtonElement>("#reset-button")!,
    fileInput: root.querySelector<HTMLInputElement>("#file-input")!,
  };
}

describe("initApp", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a live dashboard when a Takeout archive is dropped", async () => {
    const ui = mount();
    const file = await buildZipFile({
      "Takeout/Location History (Timeline)/Records.json": JSON.stringify({
        locations: [{ timestampMs: "1583020800000" }],
      }),
    });

    ui.dropzone.dispatchEvent(dropEvent(file));

    await vi.waitFor(() => expect(ui.dashboard.hidden).toBe(false));
    expect(ui.dropzone.hidden).toBe(true);
    expect(ui.providerChip.textContent).toBe("Google Takeout");

    await vi.waitFor(() => {
      const labels = [...ui.statGrid.querySelectorAll(".stat-label")].map((el) => el.textContent);
      expect(labels).toContain("Files found");
    });
  });

  it("explains itself instead of showing a blank category list for an unrecognized archive", async () => {
    const ui = mount();
    const file = await buildZipFile({ "random/notes.txt": "hello" });

    ui.dropzone.dispatchEvent(dropEvent(file));

    await vi.waitFor(() => expect(ui.providerChip.textContent).toBe("Unknown export"));
    const categoryList = ui.root.querySelector<HTMLDivElement>("#category-list")!;
    await vi.waitFor(() => {
      expect(categoryList.querySelector(".category-empty-state")).not.toBeNull();
    });
  });

  it("shows an inline error instead of crashing when a non-zip file is dropped", async () => {
    const ui = mount();
    const file = new File(["not a zip"], "notes.txt", { type: "text/plain" });

    ui.dropzone.dispatchEvent(dropEvent(file));

    await vi.waitFor(() => expect(ui.errorPanel.hidden).toBe(false));
    expect(ui.errorPanel.textContent).toContain("couldn't read this file as a zip archive");
    expect(ui.dashboard.hidden).toBe(true);
    expect(ui.exportButton.hidden).toBe(true);
  });

  it("returns to the idle dropzone when Try again is clicked from an error", async () => {
    const ui = mount();
    const file = new File(["not a zip"], "notes.txt", { type: "text/plain" });

    ui.dropzone.dispatchEvent(dropEvent(file));
    await vi.waitFor(() => expect(ui.errorPanel.hidden).toBe(false));

    ui.errorRetryButton.click();

    expect(ui.errorPanel.hidden).toBe(true);
    expect(ui.dropzone.hidden).toBe(false);
  });

  it("reveals Export summary once a result is in and downloads the current summary on click", async () => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url") as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const ui = mount();
    const file = await buildZipFile({ "Takeout/YouTube/history.json": "[]" });

    expect(ui.exportButton.hidden).toBe(true);
    ui.dropzone.dispatchEvent(dropEvent(file));
    await vi.waitFor(() => expect(ui.exportButton.hidden).toBe(false));

    ui.exportButton.click();

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("returns to the idle dropzone when Cancel is invoked mid-parse", async () => {
    const ui = mount();
    const file = await buildZipFile({
      "Takeout/Location History (Timeline)/Records.json": JSON.stringify({ locations: [] }),
    });

    // handleFile runs synchronously up to its first await (JSZip.loadAsync),
    // so the AbortController is already wired up by the time dispatchEvent
    // returns — clicking Cancel here doesn't need to race the parse.
    ui.dropzone.dispatchEvent(dropEvent(file));
    ui.cancelButton.click();

    await vi.waitFor(() => expect(ui.dropzone.hidden).toBe(false));
    expect(ui.dashboard.hidden).toBe(true);
  });

  it("lets a second drop win when it lands before the first parse settles, without the stale run clobbering it", async () => {
    const ui = mount();
    const fileA = await buildZipFile(
      { "Takeout/Location History (Timeline)/Records.json": JSON.stringify({ locations: [] }) },
      "a.zip",
    );
    const fileB = await buildZipFile({ "Takeout/YouTube/history.json": "[]" }, "b.zip");

    // Both dispatchEvent calls run handleFile synchronously up to its first
    // await, so dropping B immediately after A reliably aborts A's in-flight
    // parse before it resolves — exercising the stale-token guard rather
    // than a real, timing-dependent race.
    ui.dropzone.dispatchEvent(dropEvent(fileA));
    ui.dropzone.dispatchEvent(dropEvent(fileB));

    await vi.waitFor(() => expect(ui.dashboard.hidden).toBe(false));
    expect(ui.providerChip.textContent).toBe("Google Takeout");
    expect(ui.dropzone.hidden).toBe(true);

    // Give A's aborted parse a chance to settle too; it must not have reset
    // the UI back to idle out from under B's rendered result.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ui.dashboard.hidden).toBe(false);
    expect(ui.dropzone.hidden).toBe(true);
  });

  it("returns to the idle dropzone when New file is clicked after a successful parse", async () => {
    const ui = mount();
    const file = await buildZipFile({ "notes.txt": "hello" });

    ui.dropzone.dispatchEvent(dropEvent(file));
    await vi.waitFor(() => expect(ui.resetButton.hidden).toBe(false));

    ui.resetButton.click();

    expect(ui.dropzone.hidden).toBe(false);
    expect(ui.dashboard.hidden).toBe(true);
  });

  it("triggers the hidden file input on Enter and Space, but not on other keys", () => {
    const ui = mount();
    const clickSpy = vi.spyOn(ui.fileInput, "click");

    ui.dropzone.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
    ui.dropzone.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }),
    );
    ui.dropzone.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }),
    );

    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it("opens the file picker on a direct dropzone click, but not when the click originates from the input itself", () => {
    const ui = mount();
    const clickSpy = vi.spyOn(ui.fileInput, "click");

    ui.dropzone.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockClear();
    const bubbledFromInput = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(bubbledFromInput, "target", { value: ui.fileInput });
    ui.dropzone.dispatchEvent(bubbledFromInput);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("parses the file chosen via the file input's change event, not just drag-and-drop", async () => {
    const ui = mount();
    const file = await buildZipFile({ "Takeout/YouTube/history.json": "[]" });

    Object.defineProperty(ui.fileInput, "files", { value: [file], configurable: true });
    ui.fileInput.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(ui.dashboard.hidden).toBe(false));
    expect(ui.providerChip.textContent).toBe("Google Takeout");
  });

  it("toggles the dragover class on dragover/dragleave", () => {
    const ui = mount();

    ui.dropzone.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
    expect(ui.dropzone.classList.contains("dragover")).toBe(true);

    ui.dropzone.dispatchEvent(new Event("dragleave", { bubbles: true, cancelable: true }));
    expect(ui.dropzone.classList.contains("dragover")).toBe(false);
  });
});
