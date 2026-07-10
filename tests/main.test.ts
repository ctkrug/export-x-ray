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
    providerChip: root.querySelector<HTMLSpanElement>("#provider-chip")!,
    statGrid: root.querySelector<HTMLDivElement>("#stat-grid")!,
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

  it("shows an inline error instead of crashing when a non-zip file is dropped", async () => {
    const ui = mount();
    const file = new File(["not a zip"], "notes.txt", { type: "text/plain" });

    ui.dropzone.dispatchEvent(dropEvent(file));

    await vi.waitFor(() => expect(ui.errorPanel.hidden).toBe(false));
    expect(ui.errorPanel.textContent).toContain("couldn't read this file as a zip archive");
    expect(ui.dashboard.hidden).toBe(true);
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

  it("toggles the dragover class on dragover/dragleave", () => {
    const ui = mount();

    ui.dropzone.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
    expect(ui.dropzone.classList.contains("dragover")).toBe(true);

    ui.dropzone.dispatchEvent(new Event("dragleave", { bubbles: true, cancelable: true }));
    expect(ui.dropzone.classList.contains("dragover")).toBe(false);
  });
});
