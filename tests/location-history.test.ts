import { describe, expect, it } from "vitest";
import { parseLocationHistoryFile } from "../src/parsers/location-history";

describe("parseLocationHistoryFile", () => {
  it("parses a Records.json-shaped file", () => {
    const text = JSON.stringify({
      locations: [
        { timestampMs: "1583020800000", latitudeE7: 407128000, longitudeE7: -740060000 },
        { timestampMs: "1600000000000", latitudeE7: 407128000, longitudeE7: -740060000 },
      ],
    });

    const result = parseLocationHistoryFile(text);

    expect(result.recordCount).toBe(2);
    expect(result.timestamps).toEqual([1583020800000, 1600000000000]);
  });

  it("parses a Semantic Location History-shaped file", () => {
    const text = JSON.stringify({
      timelineObjects: [
        { activitySegment: { duration: { startTimestamp: "2020-03-01T00:00:00Z" } } },
        { placeVisit: { duration: { startTimestamp: "2020-04-01T00:00:00Z" } } },
      ],
    });

    const result = parseLocationHistoryFile(text);

    expect(result.recordCount).toBe(2);
    expect(result.timestamps).toEqual([
      Date.parse("2020-03-01T00:00:00Z"),
      Date.parse("2020-04-01T00:00:00Z"),
    ]);
  });

  it("returns zero records for an empty locations array", () => {
    expect(parseLocationHistoryFile(JSON.stringify({ locations: [] }))).toEqual({
      recordCount: 0,
      timestamps: [],
    });
  });

  it("returns zero records for malformed JSON without throwing", () => {
    expect(parseLocationHistoryFile("{not json")).toEqual({ recordCount: 0, timestamps: [] });
  });

  it("returns zero records for well-formed JSON in an unrecognized shape", () => {
    expect(parseLocationHistoryFile(JSON.stringify({ unrelated: true }))).toEqual({
      recordCount: 0,
      timestamps: [],
    });
  });

  it("emits null for a record whose timestamp field is missing or unparsable", () => {
    const text = JSON.stringify({
      locations: [{ latitudeE7: 1 }, { timestampMs: "not a number" }],
    });
    const result = parseLocationHistoryFile(text);
    expect(result.recordCount).toBe(2);
    expect(result.timestamps).toEqual([null, null]);
  });

  it("emits null instead of throwing for non-object entries in locations", () => {
    const text = JSON.stringify({ locations: [null, "garbage", { timestampMs: "1583020800000" }] });
    const result = parseLocationHistoryFile(text);
    expect(result.recordCount).toBe(3);
    expect(result.timestamps).toEqual([null, null, 1583020800000]);
  });

  it("emits null instead of throwing for non-object entries in timelineObjects", () => {
    const text = JSON.stringify({ timelineObjects: [null, 7] });
    const result = parseLocationHistoryFile(text);
    expect(result.recordCount).toBe(2);
    expect(result.timestamps).toEqual([null, null]);
  });

  it("emits null for a timeline object with neither activitySegment nor placeVisit", () => {
    const text = JSON.stringify({ timelineObjects: [{ unrelated: true }] });
    const result = parseLocationHistoryFile(text);
    expect(result.timestamps).toEqual([null]);
  });

  it("emits null for a timeline object whose segment has no duration", () => {
    const text = JSON.stringify({ timelineObjects: [{ activitySegment: { distance: 100 } }] });
    const result = parseLocationHistoryFile(text);
    expect(result.timestamps).toEqual([null]);
  });

  it("prefers activitySegment's duration when a timeline object carries both fields", () => {
    const text = JSON.stringify({
      timelineObjects: [
        {
          activitySegment: { duration: { startTimestamp: "2020-03-01T00:00:00Z" } },
          placeVisit: { duration: { startTimestamp: "2020-04-01T00:00:00Z" } },
        },
      ],
    });
    const result = parseLocationHistoryFile(text);
    expect(result.timestamps).toEqual([Date.parse("2020-03-01T00:00:00Z")]);
  });
});
