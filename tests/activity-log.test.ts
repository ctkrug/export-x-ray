import { describe, expect, it } from "vitest";
import { parseActivityLogFile } from "../src/parsers/activity-log";

describe("parseActivityLogFile", () => {
  it("parses a flat array of records using the default time field", () => {
    const text = JSON.stringify([
      { title: "Searched for cats", time: "2020-03-01T00:00:00Z" },
      { title: "Searched for dogs", time: "2020-04-01T00:00:00Z" },
    ]);

    const result = parseActivityLogFile(text);

    expect(result.recordCount).toBe(2);
    expect(result.timestamps).toEqual([
      Date.parse("2020-03-01T00:00:00Z"),
      Date.parse("2020-04-01T00:00:00Z"),
    ]);
  });

  it("honors a custom time field name", () => {
    const text = JSON.stringify([{ watchedAt: "2020-03-01T00:00:00Z" }]);
    const result = parseActivityLogFile(text, "watchedAt");
    expect(result.timestamps).toEqual([Date.parse("2020-03-01T00:00:00Z")]);
  });

  it("returns zero records for an empty array", () => {
    expect(parseActivityLogFile("[]")).toEqual({ recordCount: 0, timestamps: [] });
  });

  it("returns zero records when the top level isn't an array", () => {
    expect(parseActivityLogFile(JSON.stringify({ time: "2020-03-01" }))).toEqual({
      recordCount: 0,
      timestamps: [],
    });
  });

  it("returns zero records for malformed JSON without throwing", () => {
    expect(parseActivityLogFile("[not json")).toEqual({ recordCount: 0, timestamps: [] });
  });

  it("emits null for entries missing the time field, without dropping the record", () => {
    const result = parseActivityLogFile(JSON.stringify([{ title: "no timestamp" }]));
    expect(result.recordCount).toBe(1);
    expect(result.timestamps).toEqual([null]);
  });

  it("emits null instead of throwing for array entries that aren't objects", () => {
    const result = parseActivityLogFile(JSON.stringify([null, "garbage", 42, { time: "2020-03-01T00:00:00Z" }]));
    expect(result.recordCount).toBe(4);
    expect(result.timestamps).toEqual([null, null, null, Date.parse("2020-03-01T00:00:00Z")]);
  });
});
