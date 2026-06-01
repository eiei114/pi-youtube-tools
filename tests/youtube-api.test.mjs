import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const { searchVideos, getVideoDetails, parseYouTubeNumber } = await import("../lib/youtube-api.ts");
const { MissingApiKeyError } = await import("../lib/errors.ts");

test("parseYouTubeNumber handles empty and invalid values", () => {
  assert.equal(parseYouTubeNumber(undefined), 0);
  assert.equal(parseYouTubeNumber("12345"), 12345);
  assert.equal(parseYouTubeNumber("nope"), 0);
});

test("searchVideos throws MissingApiKeyError without env", async () => {
  const tmpHome = await mkdtemp(join(tmpdir(), "pi-youtube-tools-home-"));
  const previous = {
    PI_YOUTUBE_AGENT_DIR: process.env.PI_YOUTUBE_AGENT_DIR,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  };

  process.env.PI_YOUTUBE_AGENT_DIR = tmpHome;
  delete process.env.YOUTUBE_API_KEY;

  try {
    const api = await import(`../lib/youtube-api.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);
    await assert.rejects(
      () => api.searchVideos("roblox"),
      MissingApiKeyError,
    );
  } finally {
    if (previous.PI_YOUTUBE_AGENT_DIR === undefined) delete process.env.PI_YOUTUBE_AGENT_DIR;
    else process.env.PI_YOUTUBE_AGENT_DIR = previous.PI_YOUTUBE_AGENT_DIR;
    if (previous.YOUTUBE_API_KEY === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous.YOUTUBE_API_KEY;
    await rm(tmpHome, { recursive: true, force: true });
  }
});

test("searchVideos maps API response", async () => {
  let requestedMaxResults = "";
  const fetchFn = async (url) => {
    assert.match(String(url), /youtube\/v3\/search/);
    requestedMaxResults = new URL(String(url)).searchParams.get("maxResults");
    return new Response(
      JSON.stringify({
        items: [
          {
            id: { videoId: "abc12345678" },
            snippet: {
              title: "Gameplay",
              description: "Snippet",
              channelId: "chan1",
              channelTitle: "Creator",
              publishedAt: "2026-01-01T00:00:00Z",
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const results = await searchVideos("roblox", {
    apiKey: "test-key",
    fetchFn,
    maxResults: 5,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.videoId, "abc12345678");
  assert.equal(results[0]?.title, "Gameplay");
  assert.equal(requestedMaxResults, "5");
});

test("searchVideos caps maxResults to a lean upper bound", async () => {
  let requestedMaxResults = "";
  const fetchFn = async (url) => {
    requestedMaxResults = new URL(String(url)).searchParams.get("maxResults");
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await searchVideos("roblox", {
    apiKey: "test-key",
    fetchFn,
    maxResults: 25,
  });

  assert.equal(requestedMaxResults, "10");
});

test("getVideoDetails returns null for missing videos", async () => {
  const fetchFn = async () =>
    new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  const details = await getVideoDetails(["missing1234"], {
    apiKey: "test-key",
    fetchFn,
  });

  assert.equal(details["missing1234"], null);
});

test("getVideoDetails maps statistics", async () => {
  const fetchFn = async () =>
    new Response(
      JSON.stringify({
        items: [
          {
            id: "abc12345678",
            snippet: {
              title: "Title",
              channelId: "chan1",
              channelTitle: "Creator",
              publishedAt: "2026-01-01T00:00:00Z",
            },
            statistics: {
              viewCount: "1000",
              likeCount: "50",
              commentCount: "5",
            },
            contentDetails: { duration: "PT10M" },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const details = await getVideoDetails(["abc12345678"], {
    apiKey: "test-key",
    fetchFn,
  });

  assert.equal(details["abc12345678"]?.viewCount, 1000);
  assert.equal(details["abc12345678"]?.duration, "PT10M");
});
