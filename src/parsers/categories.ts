import type JSZip from "jszip";
import { forEachChunked } from "./chunked";
import { EMPTY_DATE_RANGE, mergeTimestamp } from "./date-utils";
import { parseActivityLogFile } from "./activity-log";
import { parseLocationHistoryFile } from "./location-history";
import { isPhotoMediaPath, isPhotoSidecarPath, parsePhotoSidecar } from "./photos";
import type { CategoryKey, CategoryStatus, CategorySummary, DateRange } from "../types";

interface ParsedRecords {
  recordCount: number;
  timestamps: Array<number | null>;
}

interface CategoryDefinition {
  key: CategoryKey;
  label: string;
  /** Minimum record count to be flagged "present" instead of "thin". */
  thinThreshold: number;
  /** Files that each represent exactly one record (Photos: one media file = one photo). */
  countPaths(paths: readonly string[]): string[];
  /** Files to decompress and parse for record counts/timestamps. */
  dateSourcePaths(paths: readonly string[]): string[];
  parseDateSource(text: string): ParsedRecords;
}

function isUnder(path: string, folderHint: string): boolean {
  return path.toLowerCase().includes(folderHint);
}

export const TAKEOUT_CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
  {
    key: "location",
    label: "Location History",
    thinThreshold: 50,
    countPaths: () => [],
    dateSourcePaths: (paths) =>
      paths.filter(
        (path) =>
          (isUnder(path, "location history") || isUnder(path, "semantic location history")) &&
          path.toLowerCase().endsWith(".json"),
      ),
    parseDateSource: parseLocationHistoryFile,
  },
  {
    key: "photos",
    label: "Photos",
    thinThreshold: 20,
    countPaths: (paths) => paths.filter(isPhotoMediaPath),
    dateSourcePaths: (paths) => paths.filter(isPhotoSidecarPath),
    parseDateSource: (text) => ({ recordCount: 0, timestamps: [parsePhotoSidecar(text)] }),
  },
  {
    key: "search",
    label: "Search History",
    thinThreshold: 10,
    countPaths: () => [],
    dateSourcePaths: (paths) =>
      paths.filter(
        (path) =>
          isUnder(path, "my activity") &&
          isUnder(path, "search") &&
          path.toLowerCase().endsWith(".json"),
      ),
    parseDateSource: (text) => parseActivityLogFile(text),
  },
  {
    key: "youtube",
    label: "YouTube History",
    thinThreshold: 10,
    countPaths: () => [],
    dateSourcePaths: (paths) =>
      paths.filter(
        (path) =>
          isUnder(path, "youtube") &&
          (isUnder(path, "watch-history") || isUnder(path, "search-history")) &&
          path.toLowerCase().endsWith(".json"),
      ),
    parseDateSource: (text) => parseActivityLogFile(text),
  },
];

export function flagCategoryStatus(
  matchedFileCount: number,
  recordCount: number,
  thinThreshold: number,
): CategoryStatus {
  if (matchedFileCount === 0 || recordCount === 0) return "missing";
  return recordCount < thinThreshold ? "thin" : "present";
}

/**
 * Fast, decompression-free first pass: what each category looks like from
 * path names alone. Categories where a matched file *is* a record (Photos)
 * get an exact count immediately; categories where a matched file *contains*
 * many records (Location/Search/YouTube) get a provisional "present" until
 * accumulateCategory decompresses and counts them for real.
 */
export function initialCategorySummary(
  def: CategoryDefinition,
  paths: readonly string[],
): CategorySummary {
  const directPaths = def.countPaths(paths);
  const dateSources = def.dateSourcePaths(paths);
  const matchedFiles = directPaths.length + dateSources.length;

  const status: CategoryStatus =
    matchedFiles === 0
      ? "missing"
      : directPaths.length > 0
        ? flagCategoryStatus(matchedFiles, directPaths.length, def.thinThreshold)
        : "present";

  return {
    key: def.key,
    label: def.label,
    status,
    recordCount: directPaths.length,
    dateRange: EMPTY_DATE_RANGE,
  };
}

/**
 * Decompresses and parses a category's matched files in chunks, reporting
 * back an updated CategorySummary as it goes so the caller can stream
 * progress without waiting for the whole category to finish.
 */
export async function accumulateCategory(
  def: CategoryDefinition,
  zip: JSZip,
  paths: readonly string[],
  onUpdate: (summary: CategorySummary) => void,
  signal?: AbortSignal,
): Promise<CategorySummary> {
  const directPaths = def.countPaths(paths);
  const dateSources = def.dateSourcePaths(paths);

  let recordCount = directPaths.length;
  let dateRange: DateRange = EMPTY_DATE_RANGE;

  const emit = (): void => {
    const matchedFiles = directPaths.length + dateSources.length;
    onUpdate({
      key: def.key,
      label: def.label,
      status: flagCategoryStatus(matchedFiles, recordCount, def.thinThreshold),
      recordCount,
      dateRange,
    });
  };

  await forEachChunked(dateSources, async (path) => {
    if (signal?.aborted) return;
    const entry = zip.files[path];
    if (!entry) return;
    const text = await entry.async("string");
    const parsed = def.parseDateSource(text);
    recordCount += parsed.recordCount;
    for (const timestamp of parsed.timestamps) {
      dateRange = mergeTimestamp(dateRange, timestamp);
    }
    emit();
  });

  emit();
  const matchedFiles = directPaths.length + dateSources.length;
  return {
    key: def.key,
    label: def.label,
    status: flagCategoryStatus(matchedFiles, recordCount, def.thinThreshold),
    recordCount,
    dateRange,
  };
}
