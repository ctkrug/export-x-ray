import { parseTimestamp } from "./date-utils";
import { isRecord } from "./json-utils";
import type { ParsedRecords } from "./location-history";

/**
 * Parses a Takeout "My Activity"-shaped JSON file: a flat array of records
 * each carrying a timeKey field (ISO string by default). Search history and
 * YouTube watch/search history share this exact shape.
 */
export function parseActivityLogFile(text: string, timeKey = "time"): ParsedRecords {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { recordCount: 0, timestamps: [] };
  }

  if (!Array.isArray(data)) return { recordCount: 0, timestamps: [] };

  return {
    recordCount: data.length,
    timestamps: data.map((entry) => (isRecord(entry) ? parseTimestamp(entry[timeKey]) : null)),
  };
}
