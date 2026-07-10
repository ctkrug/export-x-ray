import { summarizeArchive } from "./parsers/summarize";
import type { ArchiveSummary } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("missing #app root element");

app.innerHTML = `
  <h1>Export X-Ray</h1>
  <p>Drag in a Takeout, Facebook, or Spotify export zip. Nothing leaves your browser.</p>
  <div id="dropzone">Drop your export .zip here, or click to choose a file</div>
  <input id="file-input" type="file" accept=".zip" hidden />
  <div id="summary"></div>
`;

const dropzone = app.querySelector<HTMLDivElement>("#dropzone");
const fileInput = app.querySelector<HTMLInputElement>("#file-input");
const summaryEl = app.querySelector<HTMLDivElement>("#summary");
if (!dropzone || !fileInput || !summaryEl) throw new Error("missing expected UI elements");

function renderSummary(summary: ArchiveSummary): void {
  summaryEl.textContent = [
    `Provider: ${summary.provider}`,
    `Files: ${summary.fileCount}`,
    `Top-level entries: ${summary.topLevelEntries.join(", ")}`,
  ].join("\n");
}

function renderError(message: string): void {
  summaryEl.textContent = `Error: ${message}`;
}

async function handleFile(file: File): Promise<void> {
  summaryEl.textContent = "Reading archive...";
  try {
    const summary = await summarizeArchive(file);
    renderSummary(summary);
  } catch (err) {
    renderError(err instanceof Error ? err.message : "could not read this archive");
  }
}

dropzone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void handleFile(file);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  const file = event.dataTransfer?.files[0];
  if (file) void handleFile(file);
});
