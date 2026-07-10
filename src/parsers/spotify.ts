import { parseTimestamp } from "./date-utils";
import { isRecord } from "./json-utils";
import { parseActivityLogFile } from "./activity-log";
import type { ParsedRecords } from "./location-history";

const EMPTY: ParsedRecords = { recordCount: 0, timestamps: [] };

/**
 * Parses a Spotify streaming history file ("StreamingHistory0.json"-shaped):
 * a flat array of play records, each with an "endTime" date-time string.
 */
export function parseSpotifyStreamingHistoryFile(text: string): ParsedRecords {
  return parseActivityLogFile(text, "endTime");
}

/**
 * Parses a Spotify playlists export ("Playlist1.json"-shaped): an object
 * wrapping a "playlists" array. Record count is the number of playlists;
 * dates come from each track's "addedDate" across all playlists.
 */
export function parseSpotifyPlaylistsFile(text: string): ParsedRecords {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return EMPTY;
  }

  if (!isRecord(data) || !Array.isArray(data.playlists)) return EMPTY;

  const timestamps: Array<number | null> = [];
  for (const playlist of data.playlists) {
    if (!isRecord(playlist) || !Array.isArray(playlist.items)) continue;
    for (const item of playlist.items) {
      timestamps.push(isRecord(item) ? parseTimestamp(item.addedDate) : null);
    }
  }

  return { recordCount: data.playlists.length, timestamps };
}

/**
 * Parses Spotify's saved-library export ("YourLibrary.json"-shaped): an
 * object with a "tracks" array. The library format carries no per-track
 * date, so only a record count is available.
 */
export function parseSpotifyLibraryFile(text: string): ParsedRecords {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return EMPTY;
  }

  if (!isRecord(data) || !Array.isArray(data.tracks)) return EMPTY;

  return { recordCount: data.tracks.length, timestamps: [] };
}

function basename(path: string): string {
  return path.toLowerCase().split("/").pop() ?? "";
}

export function isSpotifyStreamingHistoryPath(path: string): boolean {
  const name = basename(path);
  return name.startsWith("streaminghistory") && name.endsWith(".json");
}

export function isSpotifyPlaylistsPath(path: string): boolean {
  const name = basename(path);
  return name.startsWith("playlist") && name.endsWith(".json");
}

export function isSpotifyLibraryPath(path: string): boolean {
  return basename(path) === "yourlibrary.json";
}
