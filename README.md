# Export X-Ray

**▶ Live demo: [apps.charliekrug.com/export-x-ray](https://apps.charliekrug.com/export-x-ray/)**

[![CI](https://github.com/ctkrug/export-x-ray/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/export-x-ray/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**See what's inside your data export, privately.**

Export X-Ray reads the archives that Google Takeout, Facebook, and Spotify hand you and turns
them into an instant, readable summary: how many years of data, how many photos, how many
messages, how many location points, and when the earliest and latest records are from. The zip
never leaves your browser. Nothing is uploaded anywhere.

## Who it's for

Anyone who has clicked "Download my data" and then stared at the zip wondering what to do with
it: people auditing an account before deleting it, people curious what a platform actually stored
about them, people migrating between services. You want an answer in seconds, and you do not want
to upload a personal data archive to a stranger's server to get one.

## The problem

Every "download your data" button produces the same experience: a zip file with thousands of
oddly-named JSON and HTML files, no index, no summary, and no way to know what you actually got
without opening dozens of files by hand. Export X-Ray answers one question in the first ten
seconds: **"what is actually in this thing?"** So you can decide whether to dig further, archive
it, or delete the account it came from.

## What it does

- **Drag and drop** a Takeout, Facebook, or Spotify export `.zip` onto the page.
- **Parses entirely in your browser** using [JSZip](https://stuk.github.io/jszip/). The file is
  never uploaded; no server ever sees your data.
- **Detects the export format** automatically from the archive's structure (Takeout's per-product
  folders, Facebook's `your_activity_across_facebook` layout, Spotify's `MyData` streaming
  history).
- **Renders a live summary as it parses.** A fast, decompression-free first pass shows file counts
  and category presence within about a second of dropping the file, then per-category record
  counts and date ranges stream in as the archive is decompressed in the background.
- **Surfaces the headline numbers:** total time span covered, record counts by category, the
  oldest and newest items found, and which of the export's expected categories are present, thin,
  or missing entirely.
- **Stays responsive on large archives.** Parsing runs in yielding chunks rather than one blocking
  pass, and a Cancel control stays live the whole time.
- **Google Takeout support:** Location History (both the flat `Records.json` and the older Semantic
  Location History layout), Google Photos metadata (count plus oldest and newest capture date),
  Search history, and YouTube watch and search history.
- **Facebook support:** posts, Messenger threads, and photos or videos, each with a record count
  and date range.
- **Spotify support:** streaming history (play count and date range), playlists (playlist count),
  and saved library (track count).
- **Export the summary** as a JSON file for your own records, via the "Export summary" button once
  a result is in.

## What it looks like

Drop a zip on the lightbox panel and a scan beam sweeps down it, popping each stat tile into place
as the archive parses:

```
 Google Takeout                                     [ Export summary ]

 Files found       Date range                  Location points
 12,481            2014-03-01 – 2026-06-30     1,204,338

 Photos            Oldest photo    Newest photo    Search History
 8,902             2011-08-14      2026-05-30      41,006 searches

 Location History      1,204,338 points     present
 Photos                8,902 photos         present
 Search History        41,006 searches      present
 YouTube History       3,417 videos         thin
```

An unrecognized archive still gets a file count and a list of its top-level folders instead of an
error.

## Privacy

This is the entire point of the project: your export never leaves your device. There is no upload
endpoint, no telemetry, and no third-party script that could see your files. You can verify it
yourself by opening the network tab while using it, and it is also backed by an automated test
(`tests/privacy.test.ts`) that fails the build if a future change ever calls `fetch` or
`XMLHttpRequest` during a parse.

## Stack

- **TypeScript**, strict, no implicit `any`.
- **JSZip** for in-browser zip reading without a server.
- **Vite** for the dev server and static production build.
- **Vitest** for unit tests (168 tests, 100% coverage on every parser and UI module).
- Zero backend. Zero analytics. Zero data leaving the browser.

## Development

Requires Node.js 20.9+.

```sh
npm install
npm run dev        # start the Vite dev server
npm test           # run the Vitest suite
npm run build      # type-check and build the static site
```

Other useful scripts: `npm run typecheck`, `npm run lint`, `npm run format:check`, and
`npm run test:coverage` for a line-coverage report.

## Planned features

- Gmail (headers and metadata only) and Chrome history parsing for Google Takeout.
- Facebook comments and ads-interests categories; Spotify extended streaming history.
- A timeline view showing data density across the years the export covers.

See [`docs/VISION.md`](docs/VISION.md) for the full design rationale and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for what is shipped versus planned.

## License

MIT. See [LICENSE](LICENSE).

More of Charlie's projects: https://apps.charliekrug.com
