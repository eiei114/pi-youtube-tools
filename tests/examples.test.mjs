import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const examples = await readFile(new URL("../docs/examples.md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const troubleshooting = await readFile(new URL("../docs/troubleshooting.md", import.meta.url), "utf8");
const youtubeToolsSource = await readFile(new URL("../extensions/youtube-tools.ts", import.meta.url), "utf8");

test("README and examples link to the troubleshooting guide", () => {
  assert.match(readme, /\]\(docs\/troubleshooting\.md\)/);
  assert.match(examples, /\]\(troubleshooting\.md\)/);
});

test("troubleshooting guidance matches shipped auth and transcript diagnostics", () => {
  for (const term of [
    "/youtube:status",
    "/youtube:login",
    "/youtube:logout",
    "YOUTUBE_API_KEY",
    "transcriptDiagnostics[videoId]",
    "language_unavailable",
    "captions_disabled_or_missing",
    "empty_transcript",
    "network_or_upstream_error",
    "fetch_failed",
  ]) {
    assert.ok(troubleshooting.includes(term), `troubleshooting guide should include ${term}`);
  }
  assert.match(troubleshooting, /does not unset `YOUTUBE_API_KEY`/);
  assert.match(troubleshooting, /takes precedence over the key stored/);
});

test("docs/examples.md documents the compare-three-videos walkthrough", () => {
  assert.match(examples, /## Compare three videos \(end-to-end\)/);
  assert.match(examples, /youtube_search.*youtube_video_details.*youtube_transcript/s);
  assert.match(examples, /"videoIds": \["abc12345678", "def98765432", "ghi11223344"\]/);
  assert.match(examples, /"format": "key_segments"/);
  assert.match(examples, /channel: Dev Channel \(UCxxxxxxxxxxx\)/);
  assert.match(examples, /published: 2025-06-01T12:00:00Z/);
  assert.match(examples, /views: 125,000/);
  assert.match(examples, /YOUTUBE TRANSCRIPTS/);
  assert.match(examples, /`language_unavailable`/);
});

test("docs/examples.md documents /youtube:status source labels", () => {
  assert.match(examples, /\(source: stored\)/);
  assert.match(examples, /`environment`, `stored`, or `none`/);
});

test("docs/examples.md tool parameter reference matches shipped schemas", () => {
  assert.match(examples, /`maxResults` — 1–10, default 5/);
  assert.match(examples, /`order` — `relevance`, `date`, or `viewCount`/);
  assert.match(examples, /`format` — `key_segments` \(default\) or `full_text`/);
  assert.match(examples, /transcriptDiagnostics\[videoId\]/);

  assert.match(youtubeToolsSource, /maxItems: 10/);
  assert.match(youtubeToolsSource, /StringEnum\(\["relevance", "date", "viewCount"\]/);
  assert.match(youtubeToolsSource, /StringEnum\(\["key_segments", "full_text"\]/);
});
