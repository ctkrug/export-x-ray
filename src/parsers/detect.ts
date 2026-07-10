import type { ExportProvider } from "../types";

/**
 * Guesses which export provider produced an archive from its top-level entry
 * names. Detection is heuristic: real exports vary by locale and product
 * selection, so this looks for characteristic folder names rather than an
 * exact structure.
 */
export function detectProvider(topLevelEntries: string[]): ExportProvider {
  const names = topLevelEntries.map((name) => name.toLowerCase());

  if (names.some((name) => name.includes("takeout"))) {
    return "google-takeout";
  }
  if (names.some((name) => name.includes("your_activity_across_facebook") || name === "facebook")) {
    return "facebook";
  }
  if (names.some((name) => name.includes("mydata") || name.includes("spotify"))) {
    return "spotify";
  }
  return "unknown";
}
