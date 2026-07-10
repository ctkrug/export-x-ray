import { parseTimestamp } from "./date-utils";
import { isRecord } from "./json-utils";

/** Extracts the capture date from a Google Photos per-photo metadata sidecar. */
export function parsePhotoSidecar(text: string): number | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  if (!isRecord(data) || !isRecord(data.photoTakenTime)) return null;
  return parseTimestamp(data.photoTakenTime.timestamp);
}

const MEDIA_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "heic", "mp4", "mov", "webp"];

export function isPhotoMediaPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (!lower.includes("google photos")) return false;
  const extension = lower.split(".").pop();
  return extension !== undefined && MEDIA_EXTENSIONS.includes(extension);
}

export function isPhotoSidecarPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (!lower.includes("google photos") || !lower.endsWith(".json")) return false;
  const basename = lower.split("/").pop() ?? "";
  return basename !== "metadata.json";
}
