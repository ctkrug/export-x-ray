import { parseTimestamp } from "./date-utils";
import { isRecord } from "./json-utils";

export interface ParsedRecords {
  recordCount: number;
  timestamps: Array<number | null>;
}

const EMPTY: ParsedRecords = { recordCount: 0, timestamps: [] };

/**
 * Parses a Location History file, supporting both export shapes Google has
 * used: the flat Records.json ({ locations: [...] }) and the older
 * Semantic Location History monthly files ({ timelineObjects: [...] }).
 */
export function parseLocationHistoryFile(text: string): ParsedRecords {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return EMPTY;
  }

  if (!isRecord(data)) return EMPTY;

  if (Array.isArray(data.locations)) {
    const locations = data.locations;
    return {
      recordCount: locations.length,
      timestamps: locations.map((location) =>
        isRecord(location) ? parseTimestamp(location.timestampMs ?? location.timestamp) : null,
      ),
    };
  }

  if (Array.isArray(data.timelineObjects)) {
    const objects = data.timelineObjects;
    return {
      recordCount: objects.length,
      timestamps: objects.map((entry) => (isRecord(entry) ? parseSemanticTimestamp(entry) : null)),
    };
  }

  return EMPTY;
}

function parseSemanticTimestamp(entry: Record<string, unknown>): number | null {
  const segment = isRecord(entry.activitySegment) ? entry.activitySegment : undefined;
  const visit = isRecord(entry.placeVisit) ? entry.placeVisit : undefined;
  const container = segment ?? visit;
  const duration = container && isRecord(container.duration) ? container.duration : undefined;
  return duration ? parseTimestamp(duration.startTimestamp) : null;
}
