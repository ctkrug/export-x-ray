import { describe, expect, it } from "vitest";
import {
  isSpotifyLibraryPath,
  isSpotifyPlaylistsPath,
  isSpotifyStreamingHistoryPath,
  parseSpotifyLibraryFile,
  parseSpotifyPlaylistsFile,
  parseSpotifyStreamingHistoryFile,
} from "../src/parsers/spotify";

describe("parseSpotifyStreamingHistoryFile", () => {
  it("counts plays and reads their endTime", () => {
    const result = parseSpotifyStreamingHistoryFile(
      JSON.stringify([
        { endTime: "2021-06-01 12:00", artistName: "A", trackName: "T", msPlayed: 1000 },
      ]),
    );
    expect(result.recordCount).toBe(1);
    expect(result.timestamps).toEqual([Date.parse("2021-06-01T12:00:00Z")]);
  });

  it("returns empty for an empty array", () => {
    expect(parseSpotifyStreamingHistoryFile("[]")).toEqual({ recordCount: 0, timestamps: [] });
  });
});

describe("parseSpotifyPlaylistsFile", () => {
  it("counts playlists and pulls dates from every item across all playlists", () => {
    const result = parseSpotifyPlaylistsFile(
      JSON.stringify({
        playlists: [
          { name: "Road trip", items: [{ track: { trackName: "T1" }, addedDate: "2020-01-01" }] },
          { name: "Chill", items: [{ track: { trackName: "T2" }, addedDate: "2021-05-05" }] },
        ],
      }),
    );
    expect(result.recordCount).toBe(2);
    expect(result.timestamps).toEqual([Date.parse("2020-01-01"), Date.parse("2021-05-05")]);
  });

  it("returns empty when the file has no playlists array", () => {
    expect(parseSpotifyPlaylistsFile("{}")).toEqual({ recordCount: 0, timestamps: [] });
  });

  it("returns empty for malformed JSON instead of throwing", () => {
    expect(parseSpotifyPlaylistsFile("not json")).toEqual({ recordCount: 0, timestamps: [] });
  });

  it("skips non-object playlists and playlists without an items array, without throwing", () => {
    const result = parseSpotifyPlaylistsFile(
      JSON.stringify({
        playlists: [
          null,
          { name: "No items field" },
          { name: "Real", items: [null, { addedDate: "2020-01-01" }] },
        ],
      }),
    );
    expect(result.recordCount).toBe(3);
    expect(result.timestamps).toEqual([null, Date.parse("2020-01-01")]);
  });
});

describe("parseSpotifyLibraryFile", () => {
  it("counts saved tracks with no date range", () => {
    const result = parseSpotifyLibraryFile(
      JSON.stringify({ tracks: [{ trackName: "T1" }, { trackName: "T2" }] }),
    );
    expect(result.recordCount).toBe(2);
    expect(result.timestamps).toEqual([]);
  });

  it("returns empty when the file has no tracks array", () => {
    expect(parseSpotifyLibraryFile("{}")).toEqual({ recordCount: 0, timestamps: [] });
  });

  it("returns empty for malformed JSON instead of throwing", () => {
    expect(parseSpotifyLibraryFile("not json")).toEqual({ recordCount: 0, timestamps: [] });
  });
});

describe("Spotify path matchers", () => {
  it("recognizes numbered streaming history files", () => {
    expect(isSpotifyStreamingHistoryPath("MyData/StreamingHistory0.json")).toBe(true);
    expect(isSpotifyStreamingHistoryPath("MyData/StreamingHistory12.json")).toBe(true);
    expect(isSpotifyStreamingHistoryPath("MyData/YourLibrary.json")).toBe(false);
  });

  it("recognizes numbered playlist files", () => {
    expect(isSpotifyPlaylistsPath("MyData/Playlist1.json")).toBe(true);
    expect(isSpotifyPlaylistsPath("MyData/StreamingHistory0.json")).toBe(false);
  });

  it("recognizes the library file", () => {
    expect(isSpotifyLibraryPath("MyData/YourLibrary.json")).toBe(true);
    expect(isSpotifyLibraryPath("MyData/Playlist1.json")).toBe(false);
  });
});
