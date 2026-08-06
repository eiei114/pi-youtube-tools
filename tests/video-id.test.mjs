import assert from "node:assert/strict";
import test from "node:test";

const { extractVideoId, requireVideoId, resolveVideoIds } = await import("../lib/video-id.ts");
const { InvalidVideoInputError } = await import("../lib/errors.ts");

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

test("extractVideoId parses youtube.com/live URL", () => {
  assert.equal(
    extractVideoId("https://www.youtube.com/live/dQw4w9WgXcQ?feature=share"),
    "dQw4w9WgXcQ",
  );
});

test("extractVideoId parses mobile and music watch URLs", () => {
  assert.equal(
    extractVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    extractVideoId("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
});

test("extractVideoId returns undefined for non-YouTube URLs", () => {
  assert.equal(extractVideoId("https://example.com/watch?v=dQw4w9WgXcQ"), undefined);
});

test("requireVideoId throws InvalidVideoInputError on invalid input", () => {
  assert.throws(() => requireVideoId("bad"), InvalidVideoInputError);
  assert.throws(
    () => requireVideoId("bad"),
    (error) => error instanceof InvalidVideoInputError && /Could not parse YouTube video ID/.test(error.message),
  );
});

test("resolveVideoIds deduplicates parsed ids", () => {
  const ids = resolveVideoIds([
    "dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
  ]);
  assert.deepEqual(ids, ["dQw4w9WgXcQ"]);
});
