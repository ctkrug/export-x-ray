# Export X-Ray

**Drag in your data export. See what's actually inside — before you dig through thousands of files.**

Export X-Ray is a client-side tool that reads the export archives that Google Takeout, Facebook,
and Spotify hand you and turns them into an instant, readable summary: how many years of data,
how many photos, how many messages, how many location points, when the earliest and latest
records are from. Nothing is uploaded anywhere — the zip never leaves your browser.

## Why

Every "download your data" button produces the same experience: a zip file with thousands of
oddly-named JSON and HTML files, no index, no summary, and no way to know what you actually got
without opening dozens of files by hand. Export X-Ray exists to answer one question in the first
ten seconds: **"what is actually in this thing?"** — so you can decide whether to dig further,
archive it, or delete the account it came from.

## What it does

- **Drag and drop** a Takeout, Facebook, or Spotify export `.zip` onto the page.
- **Parses entirely in your browser** using [JSZip](https://stuk.github.io/jszip/) — the file is
  never uploaded, no server ever sees your data.
- **Detects the export format** automatically from the archive's structure (Takeout's per-product
  folders, Facebook's `your_activity_across_facebook` layout, Spotify's `MyData` extended
  streaming history, etc).
- **Renders a live summary as it parses** — a fast, decompression-free first pass shows file
  counts and category presence within about a second of dropping the file, then per-category
  record counts and date ranges stream in as the archive is decompressed in the background.
- **Surfaces the headline numbers**: total time span covered, record counts by category, the
  oldest and newest items found, and which of the export's expected categories are present, thin,
  or missing entirely.
- **Stays responsive on large archives** — parsing runs in yielding chunks rather than one
  blocking pass, and a Cancel control stays live the whole time.
- **Google Takeout support**: Location History (both the flat Records.json and the older Semantic
  Location History layout), Google Photos metadata (count plus oldest/newest capture date), Search
  history, and YouTube watch/search history.
- **Facebook support**: posts, Messenger threads, and photos/videos, each with a record count and
  date range.
- **Spotify support**: streaming history (play count and date range), playlists (playlist count),
  and saved library (track count).
- **Export the summary** as a JSON file for your own records, via the "Export summary" button once
  a result is in.

## Planned features

- Gmail (headers/metadata only) and Chrome history parsing for Google Takeout.
- Facebook comments and ads-interests categories; Spotify extended streaming history.
- A timeline view showing data density across the years covered by the export.

## Stack

- **TypeScript** — strict, no implicit `any`.
- **JSZip** — in-browser zip reading/streaming without a server.
- **Vite** — dev server and static production build.
- **Vitest** — unit tests for parsers and format detection.
- Zero backend. Zero analytics. Zero data leaving the browser.

## Status

All v1 stories are built and tested: the wow moment, all three providers' parsers, a downloadable
summary report, and a design/responsive audit across 390/768/1440px — see
[`docs/VISION.md`](docs/VISION.md) for the full design and [`docs/BACKLOG.md`](docs/BACKLOG.md) for
what's shipped versus planned.

## Privacy

This is the entire point of the project: your export never leaves your device. There is no
upload endpoint, no telemetry, and no third-party script that could see your files. You can
verify this yourself by opening the network tab while using it — and it's also backed by an
automated test (`tests/privacy.test.ts`) that fails the build if a future change ever calls
`fetch` or `XMLHttpRequest` during a parse.

## License

MIT — see [LICENSE](LICENSE).
