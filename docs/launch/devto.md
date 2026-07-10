---
title: "Building Export X-Ray: reading a data export zip without a server"
published: false
tags: typescript, webdev, privacy, showdev
---

I request my Google Takeout every so often to keep an offline copy of my own data. Every time, I
hit the same wall: the download is a zip with thousands of files named after internal product
codenames, no index, no summary. To find out what I actually got, I open files one at a time and
hope I stumble on the interesting parts.

So I built **Export X-Ray**: drop a Google Takeout, Facebook, or Spotify export on the page and
get an instant summary of what is inside. How many years of data, how many photos, how many
messages, how many location points, the oldest and newest records. The catch that made it worth
building carefully: the zip is a personal data archive, so it can never be uploaded. Everything
runs in the browser tab.

Live: https://apps.charliekrug.com/export-x-ray/
Source: https://github.com/ctkrug/export-x-ray

Here are the two build decisions I found most interesting.

## The summary appears before the archive is decompressed

A real Takeout can be gigabytes across tens of thousands of entries. If the page waited to
decompress everything before showing anything, you would stare at a spinner for a long time.

The trick is that a zip's central directory lists every entry's name and size without any of the
compressed bytes being inflated. `JSZip.loadAsync()` parses that directory, so the moment it
resolves I already have the full file list. From the paths alone I can detect the provider (does
the archive have a `Takeout/` root, a `your_activity_across_facebook/` folder, a Spotify `MyData`
layout?), count files, and mark which expected categories are even present. That first pass costs
no decompression and paints in about a second.

Only then does the tool go back and inflate the specific JSON files it needs for record counts and
date ranges, streaming them into the summary as it goes. The headline numbers are useful
immediately; the detail fills in behind them.

## Keeping the tab alive during the slow part, and one animation bug it caused

Decompressing and parsing thousands of JSON files on the main thread will freeze the page. I did
not want a Web Worker (it complicates the "no data leaves the tab" story I wanted to keep dead
simple to audit), so instead the parse loop yields to the event loop on a timer:

```ts
export async function forEachChunked<T>(items, fn, options = {}) {
  const yieldEveryMs = options.yieldEveryMs ?? 150;
  let lastYield = now();
  for (const item of items) {
    if (shouldStop()) return;
    await fn(item, index);
    if (now() - lastYield >= yieldEveryMs) {
      await yieldToEventLoop(); // a real macrotask via setTimeout(…, 0)
      lastYield = now();
    }
  }
}
```

Never holding the thread for more than ~150ms keeps input responsive and lets a Cancel button
actually cancel. The `shouldStop` / `AbortSignal` plumbing also handles the case where you drop a
second file before the first finishes: the stale parse is aborted and a token guard stops its late
results from clobbering the new one.

The interesting bug this created was in the UI. The summary re-renders on every progress tick, and
each stat tile has a 220ms pop-in animation. My first version rebuilt the grid each tick, and a
browser restarts a CSS animation whenever an element is detached and reattached to the DOM, which
`replaceChildren` does even if the node lands back in the same place. So on a big archive every
tile kept restarting its fade-in every ~150ms and never finished appearing, exactly during the
live-fill moment that is supposed to be the nice part. The fix was to reconcile the grid by a
`data-label` key: update the text of a tile that already exists and only create genuinely new
ones, leaving settled tiles untouched so their animation runs once.

## Proving the privacy claim

"Nothing is uploaded" is easy to say and easy to break with one careless `fetch`. So there is a
test that mounts the app, runs a full parse of a Takeout-shaped archive, and fails the build if
`fetch` or `XMLHttpRequest` is called at any point. The guarantee is enforced in CI, not just in
the README.

## What I would do differently

Provider detection is hand-written per layout. That was the right call for three providers, but
adding a fourth means another bespoke matcher. If this grows, I would move detection to a small
declarative table of signature paths per provider so a new export format is data, not code.

The whole thing is TypeScript, JSZip, and Vite, no backend. If you have ever downloaded your own
data and not known what to do with the zip, I would genuinely like to hear whether the summary
tells you something useful.
