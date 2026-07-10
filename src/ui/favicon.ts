const ACCENT = "#4dd8e8";
const BG = "#12161f";

/** Builds an inline-SVG data URI: a crosshair X monogram on the lightbox surface color. */
export function buildFaviconDataUri(accent: string = ACCENT, bg: string = BG): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${bg}"/>` +
    `<path d="M18 18 L46 46 M46 18 L18 46" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Injects (or replaces) the page's favicon link with the generated SVG. */
export function injectFavicon(
  doc: Document = document,
  dataUri: string = buildFaviconDataUri(),
): void {
  let link = doc.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = doc.createElement("link");
    link.rel = "icon";
    doc.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = dataUri;
}
