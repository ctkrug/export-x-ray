import JSZip from "jszip";
import { detectProvider } from "./detect";
import type { ArchiveSummary } from "../types";

/** Reads an export zip entirely client-side and produces a headline summary. */
export async function summarizeArchive(file: Blob | ArrayBuffer): Promise<ArchiveSummary> {
  const zip = await JSZip.loadAsync(file);
  const paths = Object.keys(zip.files);

  const topLevelEntries = [
    ...new Set(
      paths.map((path) => path.split("/")[0]).filter((entry): entry is string => Boolean(entry)),
    ),
  ];

  return {
    provider: detectProvider(topLevelEntries),
    fileCount: paths.filter((path) => !zip.files[path]?.dir).length,
    topLevelEntries,
  };
}
