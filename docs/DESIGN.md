# Design direction

## 1. Aesthetic direction

**Soft-depth glassy dark — an X-ray lightbox.** Export X-Ray reveals what's hidden inside an
export archive, so the product itself should feel like a darkened radiology reading room: a
near-black surface with a single luminous panel — the "lightbox" — where the archive's contents
glow into view like film held up to backlight. Frosted glass panels, soft cyan glow, and a
horizontal scan-beam sweep that reveals stats as the archive parses, echoing the literal act of
X-raying something.

This is deliberately different from the recent portfolio: Chronofuzz used a flat blueprint/grid
technical-drawing look (dark, but graph-paper flat, mono-only type); PDF Mailmerge and Syntax
Sprint both went warm/light paper aesthetics. This direction is dark like Chronofuzz but reads
completely differently in execution — depth and glow instead of flat grid lines, a glass/light
metaphor instead of a drafting-table one — and no recent ship has used a backlit-glass treatment
or a scan-beam signature motif.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0d12` | page background — darkened room |
| `--surface-1` | `#12161f` | primary panel (the lightbox), frosted glass over `--bg` |
| `--surface-2` | `#1a2029` | recessed/nested panels, input controls |
| `--text` | `#e9edf3` | primary text |
| `--text-muted` | `#8b95a5` | secondary labels, captions |
| `--accent` | `#4dd8e8` | X-ray cyan — glow, primary actions, active states |
| `--accent-support` | `#f2a93b` | amber — warnings, "thin/missing category" flags |
| `--success` | `#4ecb8f` | category present and healthy |
| `--danger` | `#e8607a` | parse error, unreadable archive |

- **Type pairing:** Display — [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)
  (geometric, slightly technical, used for the wordmark and headings), system sans-serif
  fallback. UI/data — [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) for body
  copy, labels, AND the headline stat figures (a monospace readout reinforces "this is raw data
  being measured," not marketing copy), falling back to ui-monospace/Menlo/Consolas.
- **Spacing unit:** 8px scale (8/16/24/32/48/64).
- **Corner radius:** 12px for panels, 8px for controls, 999px (pill) for the mute/status chips.
- **Shadow/glow:** panels get a soft outer glow in `--accent` at low opacity (`0 0 32px rgba(77,
  216, 232, 0.12)`) plus a conventional soft drop shadow for lift; no hard-edged offset shadows
  (that's Syntax Sprint's language, not this one).
- **Motion:** UI transitions 150–220ms ease-out. The scan-beam sweep runs at ~1200ms per pass,
  looping only while actively parsing, and stops the instant results are in.

## 3. Layout intent

The hero is **the lightbox panel** — the live summary dashboard. It occupies the dropzone's
space before a file is loaded, then morphs in place into the results view, so there is no jarring
before/after page. On desktop (1440×900) the lightbox is a single wide panel taking ~65% of
viewport height, centered, with the wordmark and a one-line explainer above it and nothing else
competing for attention. On phone (390×844) the lightbox stacks full-width, stat tiles reflow
from a grid to a single column, and the scan-beam sweep scales to the panel's actual height
rather than a fixed pixel value.

## 4. Signature detail

The **scan-beam sweep**: while an archive is being parsed, a thin horizontal cyan line sweeps
down the lightbox panel, and each stat tile it crosses fades/pops into its final value —
literally "X-raying" the archive as it happens, and turning parse latency into the wow moment
instead of a loading spinner. Once complete, the beam fades out and the finished dashboard stays
lit.

## 5. Juice / feedback (non-game, but still needs response to every input)

- Dropzone hover/dragover: border and glow brighten, panel scales 1.01x (150ms ease-out).
- File accepted: brief flash of `--accent` glow across the panel border, then the scan-beam
  sweep begins.
- Stat tiles pop in with a small scale/opacity tween (100ms) as the beam crosses them, not an
  instant snap.
- Unreadable/corrupt archive: panel border shifts to `--danger`, a short shake (respecting
  `prefers-reduced-motion`), and an inline message replaces the beam — never a silent failure.
- No audio — this is a data tool, not a game or toy.
