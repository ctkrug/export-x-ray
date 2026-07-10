# Vision

## The problem

Every major platform now offers a "download your data" button — Google Takeout, Facebook's
"Download Your Information," Spotify's data export. Pressing it produces a zip file with
anywhere from a few hundred to tens of thousands of files: nested JSON, HTML, CSV, and media,
named after internal product codenames, with no index and no summary. To find out what you
actually got, you have to open files by hand, one at a time, hoping you eventually stumble on
the interesting parts.

This creates a real gap at the exact moment someone is most motivated to look: right after they
requested the export, usually because they're deciding whether to keep, migrate, or delete an
account. Nobody wants to spend an hour spelunking through folders just to answer "is there
anything worth keeping in here, and how much of it is there?"

## Who it's for

Anyone who has ever clicked "download my data" and then didn't know what to do with the zip:
people doing a personal data audit before deleting an account, people curious what a platform
actually stored about them, people migrating between services, and privacy-conscious users who
want to inspect an export before deciding whether to trust it with a third-party tool. The
common thread: they want an answer in seconds, not a new piece of software to learn, and they
do not want to upload a personal data archive to a stranger's server to get that answer.

## The core idea

Drag the zip in. Everything happens in the browser tab — the archive is read with JSZip, parsed
incrementally, and summarized live, and the file is never uploaded anywhere. Export X-Ray
auto-detects which provider produced the archive from its folder structure, then renders the
headline numbers as they're discovered: years of data covered, records per category, oldest and
newest items, and which expected categories are present, thin, or missing. The result is a
single dashboard that answers "what's in here?" before the user has opened a single file
themselves.

## Key design decisions

- **Fully client-side, no exceptions.** No upload endpoint exists in this codebase. This is the
  entire trust proposition — a user should be able to open devtools' network tab and see zero
  requests carrying their data. This constrains the stack (must run in a browser, so
  TypeScript + JSZip, no server-side parsing library shortcuts) and the hosting (static site,
  no backend).
- **Provider detection is heuristic, not configuration.** Users shouldn't have to tell the tool
  what kind of export they have — it should recognize Takeout's per-product folder layout,
  Facebook's `your_activity_across_facebook` structure, and Spotify's `MyData` layout
  automatically from the archive's own contents.
- **Incremental rendering over a single final result.** For a multi-thousand-file archive,
  parsing can take real time. Rather than a spinner followed by a wall of data, the summary
  should populate as parsing proceeds — this is also the literal wow moment: a dashboard that
  fills in live while the browser is still working through the zip.
- **Coverage over depth, for v1.** The goal of the first release is breadth — recognizing several
  categories across three providers well enough to produce a trustworthy headline summary — not
  exhaustively parsing every field of every file type. Deeper per-category detail (message
  content, exact photo EXIF, etc.) is future work once the summary layer is solid.
- **No dependency on any provider's API.** Detection and parsing work purely from the exported
  archive's file structure. Providers can and do change their export formats over time; this
  tool degrades gracefully to "unknown provider, N files found" rather than failing outright.

## What "v1 done" looks like

- A user can drag in a real Google Takeout, Facebook, or Spotify export zip and see, within
  seconds, correct top-line numbers: date range covered, total record count, and per-category
  breakdown for that provider's supported categories.
- The provider is auto-detected with no user input required, and an unrecognized archive still
  produces a graceful "unknown format" summary rather than a crash or blank screen.
- The entire flow works offline after the page loads once — no network call is made with any
  part of the user's archive or its contents.
- The dashboard renders incrementally as the archive parses, not just as one final result.
- The landing page and the app share one visual identity per `docs/DESIGN.md`, and the whole
  experience holds up at both desktop and phone widths.
