import JSZip from "jszip";
import { detectProvider } from "./detect";
import {
  FACEBOOK_CATEGORY_DEFINITIONS,
  SPOTIFY_CATEGORY_DEFINITIONS,
  TAKEOUT_CATEGORY_DEFINITIONS,
  accumulateCategory,
  initialCategorySummary,
} from "./categories";
import { EMPTY_DATE_RANGE, unionDateRanges } from "./date-utils";
import type { ArchiveSummary, CategorySummary, ExportProvider } from "../types";

const CATEGORY_DEFINITIONS_BY_PROVIDER: Partial<
  Record<ExportProvider, typeof TAKEOUT_CATEGORY_DEFINITIONS>
> = {
  "google-takeout": TAKEOUT_CATEGORY_DEFINITIONS,
  facebook: FACEBOOK_CATEGORY_DEFINITIONS,
  spotify: SPOTIFY_CATEGORY_DEFINITIONS,
};

export interface SummarizeOptions {
  /** Called with a snapshot of the summary every time new data becomes available. */
  onProgress?: (summary: ArchiveSummary) => void;
  /** Abort an in-flight parse; a pending summarizeArchive call rejects with SummarizeAbortError. */
  signal?: AbortSignal;
}

export class SummarizeAbortError extends Error {
  constructor() {
    super("archive parsing was cancelled");
    this.name = "SummarizeAbortError";
  }
}

function checkAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new SummarizeAbortError();
}

function cloneSummary(summary: ArchiveSummary): ArchiveSummary {
  return {
    ...summary,
    dateRange: { ...summary.dateRange },
    categories: summary.categories.map((category) => ({
      ...category,
      dateRange: { ...category.dateRange },
    })),
  };
}

/** Reads an export zip entirely client-side and produces a headline summary. */
export async function summarizeArchive(
  file: Blob | ArrayBuffer,
  options: SummarizeOptions = {},
): Promise<ArchiveSummary> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("couldn't read this file as a zip archive");
  }

  checkAborted(options.signal);

  const paths = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir);
  const topLevelEntries = [
    ...new Set(
      paths.map((path) => path.split("/")[0]).filter((entry): entry is string => Boolean(entry)),
    ),
  ];
  const provider = detectProvider(topLevelEntries);
  const categoryDefs = CATEGORY_DEFINITIONS_BY_PROVIDER[provider] ?? [];

  const summary: ArchiveSummary = {
    provider,
    fileCount: paths.length,
    topLevelEntries,
    dateRange: EMPTY_DATE_RANGE,
    categories: categoryDefs.map((def) => initialCategorySummary(def, paths)),
  };
  options.onProgress?.(cloneSummary(summary));

  if (categoryDefs.length === 0) {
    return summary;
  }

  for (const def of categoryDefs) {
    checkAborted(options.signal);

    const updated = await accumulateCategory(
      def,
      zip,
      paths,
      (partial: CategorySummary) => {
        summary.categories = summary.categories.map((category) =>
          category.key === def.key ? partial : category,
        );
        summary.dateRange = unionDateRanges(
          summary.categories.map((category) => category.dateRange),
        );
        options.onProgress?.(cloneSummary(summary));
      },
      options.signal,
    );

    summary.categories = summary.categories.map((category) =>
      category.key === def.key ? updated : category,
    );
    summary.dateRange = unionDateRanges(summary.categories.map((category) => category.dateRange));
  }

  checkAborted(options.signal);
  return summary;
}
