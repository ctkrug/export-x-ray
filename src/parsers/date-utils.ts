import type { DateRange } from "../types";

export const EMPTY_DATE_RANGE: DateRange = { earliestMs: null, latestMs: null };

/**
 * Export timestamps show up as epoch seconds, epoch milliseconds, or ISO
 * strings depending on the field. Real seconds-epoch values won't reach 1e11
 * until the year 5138 and real ms-epoch values already exceed it as of 2001,
 * so that threshold reliably tells the two numeric scales apart.
 */
const SECONDS_TO_MS_THRESHOLD = 1e11;

export function parseTimestamp(value: unknown): number | null {
  const numeric = toFiniteNumber(value);
  if (numeric !== null) {
    return numeric < SECONDS_TO_MS_THRESHOLD ? numeric * 1000 : numeric;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function mergeTimestamp(range: DateRange, timestampMs: number | null): DateRange {
  if (timestampMs === null) return range;
  return {
    earliestMs: range.earliestMs === null ? timestampMs : Math.min(range.earliestMs, timestampMs),
    latestMs: range.latestMs === null ? timestampMs : Math.max(range.latestMs, timestampMs),
  };
}

export function unionDateRanges(ranges: readonly DateRange[]): DateRange {
  return ranges.reduce<DateRange>((acc, range) => {
    const withEarliest = mergeTimestamp(acc, range.earliestMs);
    return mergeTimestamp(withEarliest, range.latestMs);
  }, EMPTY_DATE_RANGE);
}

/** Formats a date range as e.g. "2012-03-01 – 2024-07-10", or null if empty. */
export function formatDateRange(range: DateRange): string | null {
  if (range.earliestMs === null || range.latestMs === null) return null;
  return `${formatDate(range.earliestMs)} – ${formatDate(range.latestMs)}`;
}

export function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}
