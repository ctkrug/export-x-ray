import { SummarizeAbortError, summarizeArchive } from "./parsers/summarize";
import { downloadReport } from "./ui/export-report";
import { injectFavicon } from "./ui/favicon";
import { buildStatTiles, formatProviderLabel } from "./ui/format";
import { renderCategoryChips, renderStatTiles } from "./ui/render";
import type { ArchiveSummary } from "./types";

function requireElement<T extends Element>(el: T | null, selector: string): T {
  if (!el) throw new Error(`missing expected element: ${selector}`);
  return el;
}

const APP_MARKUP = `
  <header class="hero-header">
    <h1 class="wordmark">Export<span class="wordmark-accent">X-Ray</span></h1>
    <p class="explainer">
      Drag in your Google Takeout, Facebook, or Spotify export. Nothing ever leaves your browser.
    </p>
  </header>
  <main class="lightbox" id="lightbox">
    <div class="scan-beam" aria-hidden="true"></div>
    <div
      id="dropzone"
      class="dropzone"
      tabindex="0"
      role="button"
      aria-label="Drop your export zip here, or press Enter to choose a file"
    >
      <svg
        class="dropzone-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path
          d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <p class="dropzone-title">Drop your export .zip here</p>
      <p class="dropzone-hint">or click, or press Enter, to choose a file</p>
      <input id="file-input" type="file" accept=".zip" hidden />
    </div>
    <div id="dashboard" class="dashboard" hidden>
      <div class="dashboard-toolbar">
        <span id="provider-chip" class="provider-chip"></span>
        <div class="toolbar-actions">
          <button id="export-button" class="ghost-button" type="button" hidden>
            Export summary
          </button>
          <button id="cancel-button" class="ghost-button is-danger" type="button" hidden>Cancel</button>
          <button id="reset-button" class="ghost-button" type="button" hidden>New file</button>
        </div>
      </div>
      <div id="stat-grid" class="stat-grid" role="status" aria-live="polite"></div>
      <div id="category-list" class="category-list"></div>
    </div>
    <div id="error-panel" class="error-panel" role="alert" hidden>
      <svg
        class="error-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path
          d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <p class="error-title">Couldn't read this archive</p>
      <p id="error-message" class="error-message"></p>
      <button id="error-retry-button" class="ghost-button" type="button">Try again</button>
    </div>
  </main>
`;

/** Wires the Export X-Ray UI into an existing root element. Exported for testing. */
export function initApp(app: HTMLElement): void {
  app.innerHTML = APP_MARKUP;

  const lightbox = requireElement(app.querySelector<HTMLDivElement>("#lightbox"), "#lightbox");
  const dropzone = requireElement(app.querySelector<HTMLDivElement>("#dropzone"), "#dropzone");
  const fileInput = requireElement(
    app.querySelector<HTMLInputElement>("#file-input"),
    "#file-input",
  );
  const dashboard = requireElement(app.querySelector<HTMLDivElement>("#dashboard"), "#dashboard");
  const providerChip = requireElement(
    app.querySelector<HTMLSpanElement>("#provider-chip"),
    "#provider-chip",
  );
  const statGrid = requireElement(app.querySelector<HTMLDivElement>("#stat-grid"), "#stat-grid");
  const categoryList = requireElement(
    app.querySelector<HTMLDivElement>("#category-list"),
    "#category-list",
  );
  const exportButton = requireElement(
    app.querySelector<HTMLButtonElement>("#export-button"),
    "#export-button",
  );
  const cancelButton = requireElement(
    app.querySelector<HTMLButtonElement>("#cancel-button"),
    "#cancel-button",
  );
  const resetButton = requireElement(
    app.querySelector<HTMLButtonElement>("#reset-button"),
    "#reset-button",
  );
  const errorPanel = requireElement(
    app.querySelector<HTMLDivElement>("#error-panel"),
    "#error-panel",
  );
  const errorMessage = requireElement(
    app.querySelector<HTMLParagraphElement>("#error-message"),
    "#error-message",
  );
  const errorRetryButton = requireElement(
    app.querySelector<HTMLButtonElement>("#error-retry-button"),
    "#error-retry-button",
  );

  let controller: AbortController | null = null;
  let activeToken = 0;
  let currentSummary: ArchiveSummary | null = null;

  function showIdle(): void {
    activeToken += 1;
    dropzone.hidden = false;
    dashboard.hidden = true;
    errorPanel.hidden = true;
    lightbox.classList.remove("is-scanning");
    exportButton.hidden = true;
    cancelButton.hidden = true;
    resetButton.hidden = true;
    statGrid.replaceChildren();
    categoryList.replaceChildren();
    fileInput.value = "";
    currentSummary = null;
  }

  function renderSummary(summary: ArchiveSummary, scanning: boolean): void {
    dropzone.hidden = true;
    dashboard.hidden = false;
    errorPanel.hidden = true;
    currentSummary = summary;
    providerChip.textContent = formatProviderLabel(summary.provider);
    renderStatTiles(statGrid, buildStatTiles(summary));
    renderCategoryChips(categoryList, summary.categories);
    exportButton.hidden = false;
    cancelButton.hidden = !scanning;
    resetButton.hidden = scanning;
  }

  function renderError(message: string): void {
    dropzone.hidden = true;
    dashboard.hidden = true;
    lightbox.classList.remove("is-scanning");
    errorPanel.hidden = false;
    errorMessage.textContent = message;
    exportButton.hidden = true;
    cancelButton.hidden = true;
  }

  async function handleFile(file: File): Promise<void> {
    controller?.abort();
    const token = (activeToken += 1);
    const localController = new AbortController();
    controller = localController;

    lightbox.classList.add("is-scanning");
    errorPanel.hidden = true;

    try {
      const summary = await summarizeArchive(file, {
        signal: localController.signal,
        onProgress: (partial) => {
          if (token === activeToken) renderSummary(partial, true);
        },
      });
      if (token !== activeToken) return;
      renderSummary(summary, false);
    } catch (err) {
      if (token !== activeToken) return;
      if (err instanceof SummarizeAbortError) {
        showIdle();
        return;
      }
      renderError(err instanceof Error ? err.message : "could not read this archive");
    } finally {
      if (token === activeToken) lightbox.classList.remove("is-scanning");
    }
  }

  dropzone.addEventListener("click", (event) => {
    // fileInput lives inside dropzone, so a programmatic click() on it would
    // otherwise bubble back up and re-trigger this same listener.
    if (event.target === fileInput) return;
    fileInput.click();
  });

  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

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

  cancelButton.addEventListener("click", () => {
    controller?.abort();
  });

  resetButton.addEventListener("click", showIdle);
  errorRetryButton.addEventListener("click", showIdle);

  exportButton.addEventListener("click", () => {
    if (currentSummary) downloadReport(currentSummary);
  });
}

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (appRoot) {
  injectFavicon();
  initApp(appRoot);
}
