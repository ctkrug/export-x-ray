import { formatCategoryCount } from "./format";
import type { CategorySummary } from "../types";
import type { StatTile } from "./format";

/** Replaces the stat grid's contents with one tile per entry, each animating in. */
export function renderStatTiles(container: HTMLElement, tiles: StatTile[]): void {
  const nodes = tiles.map((tile) => {
    const el = document.createElement("div");
    el.className = "stat-tile";

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
