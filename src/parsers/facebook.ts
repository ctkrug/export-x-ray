import { parseTimestamp } from "./date-utils";
import { isRecord } from "./json-utils";
import { parseActivityLogFile } from "./activity-log";
import type { ParsedRecords } from "./location-history";

const EMPTY: ParsedRecords = { recordCount: 0, timestamps: [] };

/**
 * Parses a Facebook posts export file ("your_posts_1.json"-shaped): a flat
 * array of post objects, each with an epoch-seconds "timestamp" field.
 */
export function parseFacebookPostsFile(text: string): ParsedRecords {
  return parseActivityLogFile(text, "timestamp");
}

/**
 * Parses a Facebook photos/videos export file, which shares the posts file's
 * flat-array shape but keys its date off "creation_timestamp".
 */
export function parseFacebookPhotosFile(text: string): ParsedRecords {
  return parseActivityLogFile(text, "creation_timestamp");
}

/**
 * Parses a single Facebook Messenger thread file ("message_1.json"-shaped):
 * an object wrapping a "messages" array, each with an epoch-ms "timestamp_ms".
 */
export function parseFacebookMessagesFile(text: string): ParsedRecords {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return EMPTY;
  }

  if (!isRecord(data) || !Array.isArray(data.messages)) return EMPTY;

  return {
    recordCount: data.messages.length,
    timestamps: data.messages.map((message) =>
      isRecord(message) ? parseTimestamp(message.timestamp_ms) : null,
    ),
  };
}

function inFolder(path: string, folder: string): boolean {
  return path.toLowerCase().split("/").includes(folder);
}

export function isFacebookPostsPath(path: string): boolean {
  return inFolder(path, "posts") && path.toLowerCase().endsWith(".json");
}

export function isFacebookMessagesPath(path: string): boolean {
  return (
    inFolder(path, "messages") && inFolder(path, "inbox") && path.toLowerCase().endsWith(".json")
  );
}

export function isFacebookPhotosPath(path: string): boolean {
  return inFolder(path, "photos_and_videos") && path.toLowerCase().endsWith(".json");
}
