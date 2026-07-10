import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  EMPTY_DATE_RANGE,
  formatDate,
  formatDateRange,
  mergeTimestamp,
  parseTimestamp,
  unionDateRanges,
} from "../src/parsers/date-utils";

/** Mirrors date-utils.ts's private SECONDS_TO_MS_THRESHOLD, which isn't exported. */
const SECONDS_TO_MS_THRESHOLD = 1e11;

describe("parseTimestamp", () => {
  it("treats a numeric string under the seconds threshold as epoch seconds", () => {
    expect(parseTimestamp("1583020800")).toBe(1583020800000);
  });

  it("treats a numeric string at or above the threshold as epoch milliseconds", () => {
    expect(parseTimestamp("1583020800000")).toBe(1583020800000);
  });

  it("treats a raw number the same way as its string form", () => {
    expect(parseTimestamp(1583020800)).toBe(1583020800000);
    expect(parseTimestamp(1583020800000)).toBe(1583020800000);
  });

  it("parses ISO 8601 strings", () => {
    expect(parseTimestamp("2020-03-01T00:00:00Z")).toBe(Date.parse("2020-03-01T00:00:00Z"));
  });

  it("parses Spotify's space-separated date-time format as UTC", () => {
    expect(parseTimestamp("2021-06-01 12:00")).toBe(Date.parse("2021-06-01T12:00:00Z"));
    expect(parseTimestamp("2021-06-01 12:00:30")).toBe(Date.parse("2021-06-01T12:00:30Z"));
  });

  it("returns null for empty, malformed, or non-finite input", () => {
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("not a date")).toBeNull();
    expect(parseTimestamp(Number.NaN)).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
    expect(parseTimestamp(null)).toBeNull();
  });

  it("returns null for a digit string so large it overflows to Infinity", () => {
    expect(parseTimestamp("1".padEnd(400, "0"))).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(parseTimestamp("   ")).toBeNull();
  });

  it("[property] scales any integer under the seconds threshold to milliseconds, as a number or a string", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: SECONDS_TO_MS_THRESHOLD - 1 }), (seconds) => {
        expect(parseTimestamp(seconds)).toBe(seconds * 1000);
        expect(parseTimestamp(String(seconds))).toBe(seconds * 1000);
      }),
    );
  });

  it("[property] passes any integer at or above the threshold through unchanged, as a number or a string", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: SECONDS_TO_MS_THRESHOLD, max: Number.MAX_SAFE_INTEGER }),
        (ms) => {
          expect(parseTimestamp(ms)).toBe(ms);
          expect(parseTimestamp(String(ms))).toBe(ms);
        },
      ),
    );
  });

  it("[property] never throws, for any input shape", () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        expect(() => parseTimestamp(value)).not.toThrow();
      }),
    );
  });
});

describe("mergeTimestamp", () => {
  it("seeds an empty range from the first timestamp", () => {
    expect(mergeTimestamp(EMPTY_DATE_RANGE, 100)).toEqual({ earliestMs: 100, latestMs: 100 });
  });

  it("widens earliest and latest as new timestamps arrive", () => {
    let range = mergeTimestamp(EMPTY_DATE_RANGE, 100);
    range = mergeTimestamp(range, 50);
    range = mergeTimestamp(range, 200);
    expect(range).toEqual({ earliestMs: 50, latestMs: 200 });
  });

  it("ignores a null timestamp", () => {
    const range = mergeTimestamp(EMPTY_DATE_RANGE, null);
    expect(range).toEqual(EMPTY_DATE_RANGE);
  });

  it("[property] keeps every merged timestamp within the resulting [earliestMs, latestMs] bounds", () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (timestamps) => {
        const range = timestamps.reduce(mergeTimestamp, EMPTY_DATE_RANGE);
        for (const t of timestamps) {
          expect(range.earliestMs).not.toBeNull();
          expect(range.latestMs).not.toBeNull();
          expect(range.earliestMs as number).toBeLessThanOrEqual(t);
          expect(range.latestMs as number).toBeGreaterThanOrEqual(t);
        }
      }),
    );
  });
});

describe("unionDateRanges", () => {
  it("combines multiple category ranges into their overall bounds", () => {
    const union = unionDateRanges([
      { earliestMs: 200, latestMs: 300 },
      { earliestMs: 50, latestMs: 150 },
    ]);
    expect(union).toEqual({ earliestMs: 50, latestMs: 300 });
  });

  it("returns the empty range for an empty list", () => {
    expect(unionDateRanges([])).toEqual(EMPTY_DATE_RANGE);
  });

  it("skips ranges that are themselves empty", () => {
    const union = unionDateRanges([EMPTY_DATE_RANGE, { earliestMs: 10, latestMs: 20 }]);
    expect(union).toEqual({ earliestMs: 10, latestMs: 20 });
  });

  it("[property] spans the min earliest and max latest across any set of non-empty ranges", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.integer(), fc.integer())), (pairs) => {
        const ranges = pairs.map(([a, b]) => ({
          earliestMs: Math.min(a, b),
          latestMs: Math.max(a, b),
        }));
        const union = unionDateRanges(ranges);
        if (ranges.length === 0) {
          expect(union).toEqual(EMPTY_DATE_RANGE);
          return;
        }
        expect(union.earliestMs).toBe(Math.min(...ranges.map((r) => r.earliestMs)));
        expect(union.latestMs).toBe(Math.max(...ranges.map((r) => r.latestMs)));
      }),
    );
  });
});

describe("formatDate / formatDateRange", () => {
  it("formats a timestamp as an ISO date", () => {
    expect(formatDate(Date.parse("2020-03-01T12:00:00Z"))).toBe("2020-03-01");
  });

  it("formats a complete range as en-dash separated dates", () => {
    const range = {
      earliestMs: Date.parse("2012-01-01T00:00:00Z"),
      latestMs: Date.parse("2024-07-10T00:00:00Z"),
    };
    expect(formatDateRange(range)).toBe("2012-01-01 – 2024-07-10");
  });

  it("returns null when the range is incomplete", () => {
    expect(formatDateRange(EMPTY_DATE_RANGE)).toBeNull();
    expect(formatDateRange({ earliestMs: 10, latestMs: null })).toBeNull();
  });
});
