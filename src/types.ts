export type ExportProvider = "google-takeout" | "facebook" | "spotify" | "unknown";

/** Millisecond-epoch bounds of the records seen so far; null when nothing has been seen yet. */
export interface DateRange {
  earliestMs: number | null;
  latestMs: number | null;
}

export type CategoryKey = "location" | "photos" | "search" | "youtube";

export type CategoryStatus = "present" | "thin" | "missing";

export interface CategorySummary {
  key: CategoryKey;
  label: string;
  status: CategoryStatus;
  recordCount: number;
  dateRange: DateRange;
}

export interface ArchiveSummary {
  provider: ExportProvider;
  fileCount: number;
  topLevelEntries: string[];
  dateRange: DateRange;
  categories: CategorySummary[];
}
