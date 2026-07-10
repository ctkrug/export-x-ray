export type ExportProvider = "google-takeout" | "facebook" | "spotify" | "unknown";

export interface ArchiveSummary {
  provider: ExportProvider;
  fileCount: number;
  topLevelEntries: string[];
}
