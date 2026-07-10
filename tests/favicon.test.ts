// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildFaviconDataUri, injectFavicon } from "../src/ui/favicon";

describe("buildFaviconDataUri", () => {
  it("encodes an SVG data URI carrying the given accent and background colors", () => {
    const uri = buildFaviconDataUri("#ff0000", "#000000");
    expect(uri).toMatch(/^data:image\/svg\+xml,/);
    const decoded = decodeURIComponent(uri.replace("data:image/svg+xml,", ""));
    expect(decoded).toContain("#ff0000");
    expect(decoded).toContain("#000000");
    expect(decoded).toContain("<svg");
  });

  it("defaults to the brand accent and lightbox surface colors", () => {
    const uri = buildFaviconDataUri();
    const decoded = decodeURIComponent(uri.replace("data:image/svg+xml,", ""));
    expect(decoded).toContain("#4dd8e8");
  });
});

describe("injectFavicon", () => {
  it("adds a favicon link when none exists", () => {
    document.head.innerHTML = "";
    injectFavicon(document, "data:image/svg+xml,test");
    const link = document.querySelector('link[rel="icon"]');
    expect(link?.getAttribute("href")).toBe("data:image/svg+xml,test");
    expect(link?.getAttribute("type")).toBe("image/svg+xml");
  });

  it("replaces an existing favicon link instead of duplicating it", () => {
    document.head.innerHTML = '<link rel="icon" href="/old.ico" />';
    injectFavicon(document, "data:image/svg+xml,new");
    const links = document.querySelectorAll('link[rel="icon"]');
    expect(links.length).toBe(1);
    expect(links[0]?.getAttribute("href")).toBe("data:image/svg+xml,new");
  });
});
