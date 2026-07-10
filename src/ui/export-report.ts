import type { ArchiveSummary } from "../types";

/** Structured, machine-readable form of the on-screen summary. */
export function buildSummaryReport(summary: ArchiveSummary): string {
  return JSON.stringify(
    {
      provider: summary.provider,
      fileCount: summary.fileCount,
      topLevelEntries: summary.topLevelEntries,
      dateRange: summary.dateRange,
      categories: summary.categories,
    },
    null,
    2,
  );
}

export function buildReportFilename(summary: ArchiveSummary): string {
  return `export-x-ray-summary-${summary.provider}.json`;
}

/** Triggers a browser download of the summary as JSON via a throwaway object URL. */
export function downloadReport(summary: ArchiveSummary): void {
  const blob = new Blob([buildSummaryReport(summary)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildReportFilename(summary);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
