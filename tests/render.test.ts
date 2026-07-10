// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderCategoryChips, renderStatTiles } from "../src/ui/render";
import type { CategorySummary } from "../src/types";

describe("renderStatTiles", () => {
  it("renders one .stat-tile per entry with label and value text", () => {
    const container = document.createElement("div");
    renderStatTiles(container, [
      { label: "Files found", value: "1,200" },
      { label: "Date range", value: "2012-01-01 – 2024-07-10" },
    ]);

    const tiles = container.querySelectorAll(".stat-tile");
    expect(tiles.length).toBe(2);
    expect(tiles[0]?.querySelector(".stat-label")?.textContent).toBe("Files found");
    expect(tiles[0]?.querySelector(".stat-value")?.textContent).toBe("1,200");
  });

  it("clears previous tiles instead of appending", () => {
    const container = document.createElement("div");
    renderStatTiles(container, [{ label: "A", value: "1" }]);
    renderStatTiles(container, [{ label: "B", value: "2" }]);
    expect(container.querySelectorAll(".stat-tile").length).toBe(1);
    expect(container.querySelector(".stat-label")?.textContent).toBe("B");
  });

  it("reuses the same element for a label that persists across renders", () => {
    const container = document.createElement("div");
    renderStatTiles(container, [{ label: "Files found", value: "1" }]);
    const firstEl = container.querySelector(".stat-tile");

    renderStatTiles(container, [{ label: "Files found", value: "2" }]);
    const secondEl = container.querySelector(".stat-tile");

    expect(secondEl).toBe(firstEl);
    expect(secondEl?.querySelector(".stat-value")?.textContent).toBe("2");
  });

  it("animates in only the tiles that are new, leaving persisted tiles alone", () => {
    const container = document.createElement("div");
    renderStatTiles(container, [{ label: "Files found", value: "1" }]);
    const persistedEl = container.querySelector(".stat-tile");

    renderStatTiles(container, [
      { label: "Files found", value: "1" },
      { label: "Location points", value: "50" },
    ]);

    const tiles = container.querySelectorAll(".stat-tile");
    expect(tiles.length).toBe(2);
    expect(tiles[0]).toBe(persistedEl);
  });

  it("renders an empty grid for an empty tile list", () => {
    const container = document.createElement("div");
    renderStatTiles(container, []);
    expect(container.children.length).toBe(0);
  });

  it("treats a folder name containing markup as plain text, never as HTML", () => {
    const container = document.createElement("div");
    renderStatTiles(container, [
      { label: "Top-level entries", value: "<img src=x onerror=alert(1)>" },
    ]);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".stat-value")?.textContent).toBe(
      "<img src=x onerror=alert(1)>",
    );
  });
});

describe("renderCategoryChips", () => {
  const photos: CategorySummary = {
    key: "photos",
    label: "Photos",
    status: "thin",
    recordCount: 3,
    dateRange: { earliestMs: null, latestMs: null },
  };

  it("renders a chip per category with its status class and pill text", () => {
    const container = document.createElement("div");
    renderCategoryChips(container, [photos]);

    const chip = container.querySelector(".category-chip");
    expect(chip?.classList.contains("status-thin")).toBe(true);
    expect(chip?.querySelector(".category-label")?.textContent).toBe("Photos");
    expect(chip?.querySelector(".category-count")?.textContent).toBe("3 photos");
    expect(chip?.querySelector(".status-pill")?.textContent).toBe("thin");
  });

  it("clears previous chips instead of appending", () => {
    const container = document.createElement("div");
    renderCategoryChips(container, [photos]);
    renderCategoryChips(container, []);
    expect(container.querySelectorAll(".category-chip").length).toBe(0);
  });
});
