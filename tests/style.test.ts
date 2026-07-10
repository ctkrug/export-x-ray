import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");

describe("style.css [hidden] reset", () => {
  it("forces display: none !important so component classes can't override the hidden attribute", () => {
    // Several elements toggle visibility via the `hidden` DOM property while also
    // carrying a component class (e.g. `.dashboard`, `.error-panel`) that sets its
    // own `display`. Without an !important override here, that class always wins
    // over the `hidden` attribute's UA-stylesheet rule, leaving the element visible.
    const match = css.match(/\[hidden\]\s*{([^}]*)}/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/display:\s*none\s*!important/);
  });
});
