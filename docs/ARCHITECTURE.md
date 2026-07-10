# Architecture

A concise map of the codebase, kept current as the project grows. See
[`docs/VISION.md`](VISION.md) for why, [`docs/BACKLOG.md`](BACKLOG.md) for what's shipped versus
planned, and [`docs/DESIGN.md`](DESIGN.md) for the visual direction.

## Run / test

- `npm run dev` — Vite dev server.
- `npm test` — Vitest, all suites (`node` environment by default; UI-touching files opt into
  `jsdom` per-file with a `// @vitest-environment jsdom` docblock).
- `npm run typecheck` / `npm run lint` / `npm run format:check` — same checks CI runs.
- `npm run build` — `tsc --noEmit && vite build`; output is `dist/`, base-path-relative so it can
  be served from a subpath.

## Data flow

```
File (drag/drop or file picker)
  → summarizeArchive(file, { onProgress, signal })   [src/parsers/summarize.ts]
      → JSZip.loadAsync                                (throws → clear "couldn't read this
                                                          file as a zip archive" error)
      → detectProvider(topLevelEntries)                [src/parsers/detect.ts]
      → categoryDefs = definitions for this provider     [src/parsers/categories.ts]
                                                          (Takeout / Facebook / Spotify / none)
      → fast pass: initialCategorySummary per category  [src/parsers/categories.ts]
          (path-matching only, no decompression — this is what makes the first
           stat tile appear within ~1s of drop)
      → onProgress(summary)  ← UI renders immediately
      → for each category def: accumulateCategory       [src/parsers/categories.ts]
          → forEachChunked over that category's files    [src/parsers/chunked.ts]
              → decompress + parse one file
              → merge its timestamps into the category's DateRange
              → onUpdate(partialCategorySummary) → onProgress(summary) → UI re-renders
              → yield to the event loop every ~150ms so the main thread never blocks
                for longer than that at a stretch
  → final ArchiveSummary
```

`main.ts` drives this from the UI: it owns an `AbortController` per parse (aborted and replaced
on every new drop, or aborted directly by the Cancel button), and a monotonic token counter so a
stale/cancelled run's callbacks can never clobber a newer run's rendered state.

## Modules

**Parsing (`src/parsers/`)** — pure, DOM-free, unit-testable in isolation:

- `detect.ts` — guesses `ExportProvider` (`google-takeout` / `facebook` / `spotify` / `unknown`)
  from top-level zip entry names.
- `date-utils.ts` — `parseTimestamp` normalizes epoch-seconds, epoch-ms, and ISO strings into a
  single ms-epoch scale (a 1e11 magnitude threshold tells seconds from milliseconds apart);
  `mergeTimestamp`/`unionDateRanges` fold timestamps into a running `DateRange`;
  `formatDate`/`formatDateRange` render one for display.
- `chunked.ts` — `forEachChunked` is the non-blocking iteration primitive: runs an async callback
  over a sequence, yielding to a macrotask whenever more than `yieldEveryMs` (default 150) has
  elapsed since the last yield. Clock and yield primitive are injectable for deterministic tests.
  A `shouldStop` hook is checked before every item so a cancelled parse returns immediately
  instead of walking the rest of a large sequence as a no-op.
- `location-history.ts`, `photos.ts`, `activity-log.ts` — one parser per Takeout category, each
  taking raw file text (or, for Photos, a path) and returning `{ recordCount, timestamps }` (or,
  for Photos, path-matcher predicates plus a single-timestamp sidecar parser). These never touch
  JSZip directly, so they're testable with plain strings.
- `facebook.ts` — posts/photos parsers reuse `activity-log.ts`'s flat-array-with-timestamp shape
  (keyed on `timestamp` and `creation_timestamp` respectively); `parseFacebookMessagesFile` is
  bespoke since each Messenger thread file wraps a nested `messages` array keyed on
  `timestamp_ms`. Path matchers key off folder name (`posts`, `messages`+`inbox`,
  `photos_and_videos`).
- `spotify.ts` — streaming history reuses `activity-log.ts` keyed on `endTime`; playlists and
  library are bespoke (playlists count top-level playlists and source dates from each item's
  `addedDate`; library has no per-track date, so only a count is available). Path matchers key off
  Spotify's fixed export filenames (`StreamingHistory*.json`, `Playlist*.json`,
  `YourLibrary.json`) since `MyData` exports files flat at the top level, not under folders.
- `categories.ts` — three `CategoryDefinition` registries, one per provider
  (`TAKEOUT_CATEGORY_DEFINITIONS`, `FACEBOOK_CATEGORY_DEFINITIONS`, `SPOTIFY_CATEGORY_DEFINITIONS`),
  each a list of `{ key, label, thinThreshold, countPaths, dateSourcePaths, parseDateSource }`.
  `initialCategorySummary` gives the instant, decompression-free first read; `accumulateCategory`
  decompresses a category's matched files via `forEachChunked` and streams real counts/date ranges
  back through a callback. Most categories: one matched file contains many records (count comes
  from parsing). Takeout Photos: one matched _media_ file _is_ one record (count is exact from path
  names alone), while sidecar JSON files are decompressed only to source dates — so a photo missing
  its sidecar is still counted but doesn't skew the range. `accumulateCategory`'s progress callback
  is throttled to once per ~150ms (matching `forEachChunked`'s own yield cadence, with a forced
  final call once the category finishes) — a category with thousands of small files would
  otherwise trigger a full stat/category DOM rebuild once per file, and that backlog of
  synchronous render work is what actually made Cancel feel unresponsive on a large archive, not
  the parsing itself. `now` is an injectable clock for deterministic tests, same pattern as
  `chunked.ts`.
- `summarize.ts` — orchestrates the whole flow (see Data flow above), picks the right category
  registry for the detected provider (empty list for `unknown`), and exposes `summarizeArchive`,
  `SummarizeOptions` (`onProgress`, `signal`), and `SummarizeAbortError`. All three providers'
  runs produce the same `ArchiveSummary`/`CategorySummary` shape (verified in
  `tests/summarize.test.ts`), so the UI layer never branches on provider.

**Types (`src/types.ts`)** — the shared contract: `ExportProvider`, `DateRange`, `CategoryKey`
(`location`/`photos`/`search`/`youtube` for Takeout, `posts`/`messages`/`photos` for Facebook,
`streaming`/`playlists`/`library` for Spotify — `photos` is shared across Takeout and Facebook
since both are photo/video categories), `CategoryStatus` (`present` / `thin` / `missing`),
`CategorySummary`, `ArchiveSummary`.

**UI (`src/ui/`, `src/main.ts`)**:

- `format.ts` — pure data-in/data-out: `buildStatTiles(summary)` derives the ordered headline tile
  list; `formatProviderLabel`/`formatCategoryCount`/`formatCount` handle display strings.
- `render.ts` — DOM renderers (`renderStatTiles`, `renderCategoryChips`) that build elements via
  `createElement`/`textContent`, never `innerHTML` with interpolated data — tile/chip values can
  include folder or file names from the user's own (untrusted) archive. `renderStatTiles`
  reconciles by a `data-label` key instead of blindly replacing the grid's children: a large
  archive re-renders on every ~150ms progress tick, and a browser restarts a running CSS animation
  on any element that's detached and reattached (even briefly, even back to the same position), so
  a naive full replace kept every tile's pop-in animation restarting and its opacity stuck near 0
  for the whole parse. Only a tile whose element isn't already in the right position gets touched.
- `favicon.ts` — generates the favicon as an inline SVG data URI at runtime (`buildFaviconDataUri`)
  and injects it (`injectFavicon`); no binary asset in the repo.
- `export-report.ts` — `buildSummaryReport`/`buildReportFilename` are pure JSON serialization
  (DOM-free, unit-testable directly); `downloadReport` is the thin DOM-touching wrapper (Blob +
  throwaway object URL + temporary anchor click) that `main.ts`'s export button calls.
- `main.ts` — wires it all together: builds the app markup, handles drag/drop/click/keyboard on
  the dropzone, drives `summarizeArchive`, and renders progress/results/error states, tracking the
  latest rendered `ArchiveSummary` so the export button can always download exactly what's on
  screen. Exports `initApp(root)` so tests can mount and drive the whole UI through jsdom without
  relying on the module's top-level side effect (which only runs `initApp` when a real `#app`
  element exists in the document, so importing `main.ts` in a test doesn't require one). The error
  state is a self-contained sibling of the dropzone/dashboard (icon, title, message, its own Try
  again button) rather than reusing a control buried inside the hidden `#dashboard` — a shared
  control only "works" if its container is also visible.

## Design system

`src/style.css` implements the "soft-depth glassy dark — X-ray lightbox" direction from
`docs/DESIGN.md` as CSS custom properties (colors, spacing, radius, motion) plus the lightbox
panel, dropzone states, the scan-beam sweep animation (`.lightbox.is-scanning .scan-beam`), stat
tile pop-in, and category status pills. `prefers-reduced-motion` is respected throughout via a
`--motion-ui` override and animation-specific media queries.

## Testing conventions

See [`tests/fixtures/README.md`](../tests/fixtures/README.md) for why there are no real export
files checked in — fixtures are small synthetic zips built in-test with JSZip. UI tests that need
a DOM opt into jsdom per-file (`// @vitest-environment jsdom`) rather than switching the whole
suite's default environment, so pure-logic tests stay on the faster `node` environment.
