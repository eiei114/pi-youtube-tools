import assert from "node:assert/strict";
import test from "node:test";

const { getYoutubeApiKey, isYoutubeConfigured } = await import("../lib/config.ts");

test("getYoutubeApiKey returns undefined when env is missing", () => {
  const previous = process.env.YOUTUBE_API_KEY;
  delete process.env.YOUTUBE_API_KEY;

  assert.equal(getYoutubeApiKey(), undefined);
  assert.equal(isYoutubeConfigured(), false);

  if (previous === undefined) {
    delete process.env.YOUTUBE_API_KEY;
  } else {
    process.env.YOUTUBE_API_KEY = previous;
  }
});

test("getYoutubeApiKey trims configured env value", () => {
  const previous = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = "  test-key  ";

  assert.equal(getYoutubeApiKey(), "test-key");
  assert.equal(isYoutubeConfigured(), true);

  if (previous === undefined) {
    delete process.env.YOUTUBE_API_KEY;
  } else {
    process.env.YOUTUBE_API_KEY = previous;
  }
});
