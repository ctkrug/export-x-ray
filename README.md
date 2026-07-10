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
- **Renders a live summary as it parses** — counts, date ranges, and per-category breakdowns
  appear incrementally instead of waiting for the whole archive to finish.
- **Surfaces the headline numbers**: total time span covered, record counts by category, the
  oldest and newest items found, and which of the export's expected categories are present, thin,
  or missing entirely.

## Planned features

- Google Takeout support: Location History, Photos metadata, Search history, YouTube history,
  Gmail (headers/metadata only), Chrome history.
- Facebook export support: posts, messages, photos/videos, comments, ads interests.
- Spotify export support: streaming history, playlists, library, extended streaming history.
- A category breakdown view with counts, date ranges, and rough size-on-disk per category.
- A timeline view showing data density across the years covered by the export.
- Export a summary report (JSON/Markdown) of the analysis for your own records.
- Everything runs offline after the initial page load — no network calls once the app is open.

## Stack

- **TypeScript** — strict, no implicit `any`.
- **JSZip** — in-browser zip reading/streaming without a server.
- **Vite** — dev server and static production build.
- **Vitest** — unit tests for parsers and format detection.
- Zero backend. Zero analytics. Zero data leaving the browser.

## Status

Early scaffold — see [`docs/VISION.md`](docs/VISION.md) for the full design and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build plan.

## Privacy

This is the entire point of the project: your export never leaves your device. There is no
upload endpoint, no telemetry, and no third-party script that could see your files. You can
verify this yourself — open the network tab while using it.

## License

MIT — see [LICENSE](LICENSE).
