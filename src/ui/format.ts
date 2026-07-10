import { formatDate, formatDateRange } from "../parsers/date-utils";
import type { ArchiveSummary, CategoryKey, CategorySummary, ExportProvider } from "../types";

export interface StatTile {
  label: string;
  value: string;
}

const PROVIDER_LABELS: Record<ExportProvider, string> = {
  "google-takeout": "Google Takeout",
  facebook: "Facebook",
  spotify: "Spotify",
  unknown: "Unknown export",
};

const CATEGORY_NOUN: Record<CategoryKey, string> = {
  location: "points",
  photos: "photos",
  search: "searches",
  youtube: "videos",
};

export function formatProviderLabel(provider: ExportProvider): string {
  return PROVIDER_LABELS[provider];
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatCategoryCount(category: CategorySummary): string {
  return `${formatCount(category.recordCount)} ${CATEGORY_NOUN[category.key]}`;
}

function findCategory(summary: ArchiveSummary, key: CategoryKey): CategorySummary | undefined {
  return summary.categories.find((category) => category.key === key);
}

/** Builds the ordered list of headline stat tiles for the current summary snapshot. */
export function buildStatTiles(summary: ArchiveSummary): StatTile[] {
  const tiles: StatTile[] = [
    { label: "Files found", value: formatCount(summary.fileCount) },
    { label: "Date range", value: formatDateRange(summary.dateRange) ?? "—" },
  ];

  const location = findCategory(summary, "location");
  if (location && location.status !== "missing") {
    tiles.push({ label: "Location points", value: formatCount(location.recordCount) });
  }

  const photos = findCategory(summary, "photos");
  if (photos && photos.status !== "missing") {
    tiles.push({ label: "Photos", value: formatCount(photos.recordCount) });
    tiles.push({
      label: "Oldest photo",
      value: photos.dateRange.earliestMs === null ? "—" : formatDate(photos.dateRange.earliestMs),
    });
    tiles.push({
      label: "Newest photo",
      value: photos.dateRange.latestMs === null ? "—" : formatDate(photos.dateRange.latestMs),
    });
  }

  if (summary.categories.length === 0) {
    tiles.push({
      label: "Top-level entries",
      value: summary.topLevelEntries.length > 0 ? summary.topLevelEntries.join(", ") : "—",
    });
  }

  return tiles;
}
