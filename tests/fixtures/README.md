# Test fixtures

Real Takeout/Facebook/Spotify exports are large and contain personal data, so they don't belong
in this repo. The backlog's per-provider parser stories (2.1–2.4, 3.1–3.2) call for "fixture"
archives — small, synthetic zips that reproduce the folder/file shape of a real export without
any real user data, built in-test with JSZip (see `tests/summarize.test.ts` for the pattern).

Any hand-authored fixture files that are easier to keep as static assets than to construct
programmatically go in this directory. `.gitignore` excludes `*.zip` everywhere except here.
