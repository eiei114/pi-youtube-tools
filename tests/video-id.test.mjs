import assert from "node:assert/strict";
import test from "node:test";

const { extractVideoId, requireVideoId, resolveVideoIds } = await import("../lib/video-id.ts");

test("extractVideoId accepts raw 11-char id", () => {
  assert.equal(extractVideoId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
});

test("extractVideoId parses watch URL", () => {
  assert.equal(
    extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share"),
    "dQw4w9WgXcQ",
  );
});

test("extractVideoId parses youtu.be URL", () => {
  assert.equal(extractVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
});

test("requireVideoId throws on invalid input", () => {
  assert.throws(() => requireVideoId("bad"), /Could not parse YouTube video ID/);
});

test("resolveVideoIds deduplicates parsed ids", () => {
  const ids = resolveVideoIds([
    "dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
  ]);
  assert.deepEqual(ids, ["dQw4w9WgXcQ"]);
});
