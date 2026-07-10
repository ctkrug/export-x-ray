# Backlog

Epics and stories for the v1 build. All stories start unchecked; BUILD implements to the
acceptance criteria, QA attacks them. The first story of Epic 1 is the wow moment and must be
reachable before anything else is built.

## Epic 1 — Core engine & the wow moment

- [x] **1.1 Live incremental dashboard for a Google Takeout archive (WOW MOMENT)**
      Drag a real Google Takeout zip onto the page and, before parsing finishes, see a dashboard
      render headline numbers live: years of data covered, total location points, oldest photo
      date. Nothing is uploaded.
  - Dropping a multi-thousand-file Takeout zip shows at least one stat tile populated within 1
    second of drop, before the full archive has finished parsing.
  - The finished dashboard shows, at minimum: total date range covered (earliest–latest record),
    a location-point count, and an oldest/newest photo date, each pulled from the archive's own
    contents (not hardcoded).
  - Opening the browser devtools network tab during the entire flow shows zero outgoing requests
    carrying archive data.

- [x] **1.2 Provider auto-detection**
      Detect whether an uploaded archive is Google Takeout, Facebook, or Spotify from its folder
      structure, with no user-supplied hint.
  - A Takeout-shaped, Facebook-shaped, and Spotify-shaped fixture archive each resolve to the
    correct provider via `detectProvider`.
  - An archive matching none of the three known layouts resolves to `"unknown"` rather than
    throwing or silently picking a wrong provider.

- [x] **1.3 Non-blocking incremental parse for large archives**
      Parsing a large archive must not freeze the page — the UI stays responsive and renders
      progress as it goes.
  - A synthetic archive of 10,000+ entries parses without the main thread blocking for more than
    ~150ms at a stretch (verified via chunked/yielding parse loop, not a single synchronous pass).
  - The dropzone/UI remains interactive (e.g. a cancel or mute control responds) while a large
    archive is still being parsed.

## Epic 2 — Google Takeout category parsers

- [x] **2.1 Location History parser**
      Parse Takeout's Location History (Records.json or Semantic Location History) into a count and
      date range.
  - Given a fixture Location History file, the parser returns the correct total point count and
    correct earliest/latest timestamps.
  - A Takeout archive with no Location History folder present does not error — the category is
    reported as absent.

- [x] **2.2 Photos metadata parser**
      Parse Google Photos export metadata (per-photo JSON sidecars) into a count and oldest/newest
      photo date.
  - Given fixture photo metadata files, the parser returns the correct photo count and the
    correct oldest/newest capture date.
  - Photos missing a metadata sidecar are counted but excluded from the date-range calculation
    rather than crashing the parse.

- [x] **2.3 Search & YouTube history parser**
      Parse Takeout's Search history and YouTube watch/search history into counts and date ranges.
  - Given fixture search-history and YouTube-history JSON, the parser returns correct record
    counts and date ranges for each category independently.

- [x] **2.4 Missing/thin category flagging**
      Surface which of the expected Takeout categories are present, thin (unexpectedly low record
      count), or entirely missing from this particular export.
  - A Takeout archive missing an expected top-level product folder (e.g. no `YouTube` folder)
    shows that category flagged as "missing," not silently omitted from the summary.
  - A category present but with a record count below a documented low-data threshold is flagged
    as "thin" rather than reported identically to a healthy category.

## Epic 3 — Facebook & Spotify parsers

- [ ] **3.1 Facebook export parser**
      Parse a Facebook "Download Your Information" archive into counts and date ranges for posts,
      messages, and photos/videos.
  - Given a fixture Facebook export, the parser returns correct counts and date ranges for each
    of posts, messages, and photos/videos independently.

- [ ] **3.2 Spotify export parser**
      Parse a Spotify data export (streaming history, playlists, library) into counts and date
      ranges.
  - Given a fixture Spotify export, the parser returns correct streaming-history record count and
    date range, plus playlist and saved-track counts.

- [ ] **3.3 Unified cross-provider summary contract**
      All three providers' parsers produce the same shape of summary object so the dashboard UI
      doesn't need provider-specific rendering branches for the headline view.
  - A Takeout, a Facebook, and a Spotify fixture archive each produce a summary object matching
    one shared TypeScript type, verified by a type-level and runtime test.

## Epic 4 — Robustness, privacy & ship polish

- [x] **4.1 Graceful handling of corrupt or invalid archives**
      A non-zip file, a corrupted zip, or a password-protected zip produces a clear inline error
      instead of a crash or silent blank state.
  - Dropping a non-zip file shows an inline error message and does not throw an unhandled
    exception in the console.
  - Dropping a corrupted zip (truncated bytes) shows an inline error distinguishing "couldn't
    read this file" from a successful empty result.

- [ ] **4.2 Downloadable summary report**
      Let the user save the generated summary as a JSON or Markdown file for their own records.
  - Clicking "export summary" downloads a file containing the same category counts and date
    ranges currently shown on screen.

- [x] **4.3 Automated no-network-calls privacy check**
      Back the project's core privacy claim with an automated check, not just a manual promise.
  - A test (e.g. intercepting `fetch`/`XMLHttpRequest` in a jsdom/browser test environment) fails
    the build if any network call fires during a full drop-to-summary run.

- [ ] **4.4 Design polish & responsive audit**
      Bring the shipped UI in line with `docs/DESIGN.md`'s lightbox direction and confirm it holds up
      across breakpoints.
  - The app is visually reviewed at 390px, 768px, and 1440px widths with no horizontal scroll,
    no overlapping elements, and the lightbox panel filling its intended majority of the desktop
    viewport.
  - Every interactive control (dropzone, export-summary button, any inputs) has themed hover,
    focus-visible, active, and disabled states — none left as unstyled native defaults.
