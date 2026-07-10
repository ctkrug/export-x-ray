import { formatCategoryCount } from "./format";
import type { CategorySummary } from "../types";
import type { StatTile } from "./format";

/**
 * Renders one tile per entry, leaving an already-correctly-positioned tile's
 * element completely untouched rather than recreating (or even just moving)
 * it. A fresh archive parse re-renders the grid on every progress tick; a
 * browser restarts an element's CSS animation whenever it's detached and
 * reattached to the DOM, which `replaceChildren`/`insertBefore` both do even
 * when the node ends up back in the same spot. Without this, a tile's
 * 220ms pop-in animation keeps restarting every ~150ms on a large archive
 * and the tile never finishes fading in -- exactly during the wow-moment
 * live fill this is meant to showcase.
 */
export function renderStatTiles(container: HTMLElement, tiles: StatTile[]): void {
  const existingByLabel = new Map<string, HTMLElement>();
  for (const child of Array.from(container.children)) {
    const label = child.getAttribute("data-label");
    if (label) existingByLabel.set(label, child as HTMLElement);
  }

  let cursor = container.firstChild;
  for (const tile of tiles) {
    const existing = existingByLabel.get(tile.label);
    let el: HTMLElement;

    if (existing) {
      const value = existing.querySelector<HTMLElement>(".stat-value");
      if (value) value.textContent = tile.value;
      existingByLabel.delete(tile.label);
      el = existing;
    } else {
      el = document.createElement("div");
      el.className = "stat-tile";
      el.setAttribute("data-label", tile.label);

      const label = document.createElement("span");
      label.className = "stat-label";
      label.textContent = tile.label;

      const value = document.createElement("span");
      value.className = "stat-value";
      value.textContent = tile.value;

      el.append(label, value);
    }

    if (cursor === el) {
      cursor = cursor.nextSibling;
    } else {
      container.insertBefore(el, cursor);
    }
  }

  for (const stale of existingByLabel.values()) {
    stale.remove();
  }
}

/**
 * Replaces the category list's contents with one status chip per category.
 * An empty list means the archive didn't match a known provider layout (an
 * unrecognized export still has a non-empty file list, just no categories to
 * break it down into) -- render an explanatory empty state instead of
 * leaving a blank gap under the stat tiles.
 */
export function renderCategoryChips(container: HTMLElement, categories: CategorySummary[]): void {
  if (categories.length === 0) {
    container.classList.add("is-empty");
    const empty = document.createElement("p");
    empty.className = "category-empty-state";
    empty.textContent =
      "This doesn't match a known Google Takeout, Facebook, or Spotify layout, so there's no " +
      "category breakdown -- see the top-level entries above for what was found.";
    container.replaceChildren(empty);
    return;
  }
  container.classList.remove("is-empty");

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
