import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const examples = await readFile(new URL("../docs/examples.md", import.meta.url), "utf8");
const youtubeToolsSource = await readFile(new URL("../extensions/youtube-tools.ts", import.meta.url), "utf8");

test("docs/examples.md documents the compare-three-videos walkthrough", () => {
  assert.match(examples, /## Compare three videos \(end-to-end\)/);
  assert.match(examples, /youtube_search.*youtube_video_details.*youtube_transcript/s);
  assert.match(examples, /"videoIds": \["abc12345678", "def98765432", "ghi11223344"\]/);
  assert.match(examples, /"format": "key_segments"/);
  assert.match(examples, /YOUTUBE TRANSCRIPTS/);
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
