import { formatCategoryCount } from "./format";
import type { CategorySummary } from "../types";
import type { StatTile } from "./format";

/**
 * Renders one tile per entry, reusing an existing element for a label that's
 * already on screen (updating just its value) rather than recreating it. A
 * fresh archive parse re-renders the grid on every progress tick, and a tile
 * that's rebuilt from scratch each time restarts its pop-in animation -- for
 * long-lived tiles like "Files found" that update many times a second, that
 * reads as a flicker instead of a value ticking up in place.
 */
export function renderStatTiles(container: HTMLElement, tiles: StatTile[]): void {
  const existingByLabel = new Map<string, HTMLElement>();
  for (const child of Array.from(container.children)) {
    const label = child.getAttribute("data-label");
    if (label) existingByLabel.set(label, child as HTMLElement);
  }

  const nodes = tiles.map((tile) => {
    const reused = existingByLabel.get(tile.label);
    if (reused) {
      const value = reused.querySelector<HTMLElement>(".stat-value");
      if (value) value.textContent = tile.value;
      return reused;
    }

    const el = document.createElement("div");
    el.className = "stat-tile";
    el.setAttribute("data-label", tile.label);

    const label = document.createElement("span");
    label.className = "stat-label";
    label.textContent = tile.label;

    const value = document.createElement("span");
    value.className = "stat-value";
    value.textContent = tile.value;

    el.append(label, value);
    return el;
  });

  container.replaceChildren(...nodes);
}

/** Replaces the category list's contents with one status chip per category. */
export function renderCategoryChips(container: HTMLElement, categories: CategorySummary[]): void {
  const nodes = categories.map((category) => {
    const chip = document.createElement("div");
    chip.className = `category-chip status-${category.status}`;

    const label = document.createElement("span");
    label.className = "category-label";
    label.textContent = category.label;

    const meta = document.createElement("div");
    meta.className = "category-meta";

    const count = document.createElement("span");
    count.className = "category-count";
    count.textContent = formatCategoryCount(category);

    const pill = document.createElement("span");
    pill.className = `status-pill status-${category.status}`;
    pill.textContent = category.status;

    meta.append(count, pill);
    chip.append(label, meta);
    return chip;
  });

  container.replaceChildren(...nodes);
}
