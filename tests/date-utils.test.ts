import { describe, expect, it } from "vitest";
import {
  EMPTY_DATE_RANGE,
  formatDate,
  formatDateRange,
  mergeTimestamp,
  parseTimestamp,
  unionDateRanges,
} from "../src/parsers/date-utils";

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

  it("returns null for empty, malformed, or non-finite input", () => {
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("not a date")).toBeNull();
    expect(parseTimestamp(Number.NaN)).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
    expect(parseTimestamp(null)).toBeNull();
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
});

describe("formatDate / formatDateRange", () => {
  it("formats a timestamp as an ISO date", () => {
    expect(formatDate(Date.parse("2020-03-01T12:00:00Z"))).toBe("2020-03-01");
  });

  it("formats a complete range as en-dash separated dates", () => {
    const range = { earliestMs: Date.parse("2012-01-01T00:00:00Z"), latestMs: Date.parse("2024-07-10T00:00:00Z") };
    expect(formatDateRange(range)).toBe("2012-01-01 – 2024-07-10");
  });

  it("returns null when the range is incomplete", () => {
    expect(formatDateRange(EMPTY_DATE_RANGE)).toBeNull();
    expect(formatDateRange({ earliestMs: 10, latestMs: null })).toBeNull();
  });
});
