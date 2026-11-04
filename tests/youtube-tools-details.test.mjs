import assert from "node:assert/strict";
import test from "node:test";

// Regression cover for the `youtube_video_details` tool path (DOT-3194).
//
// The tool projects one YouTube API record twice: once for the human-readable
// text and once for the structured `details` payload. When the two projections
// are not derived from the same record, they disagree: the text drifts from the
// payload that callers rely on.
//
// These tests drive the real registered tool through `registerYoutubeTools`, so
// they assert the public tool output rather than a formatter helper.

const DETAILS_IDS = ["pathcase001", "pathcase002", "pathcase003"];

const API_ITEMS = [
  {
    id: "pathcase001",
    snippet: {
      title: "TypeScript Generics Explained",
      description: "Plain description",
      channelId: "UCxxxxxxxxxxx",
      channelTitle: "Dev Channel",
      publishedAt: "2025-06-01T12:00:00Z",
    },
    statistics: { viewCount: "125000", likeCount: "4200", commentCount: "180" },
    contentDetails: { duration: "PT12M34S" },
  },
  {
    id: "pathcase002",
    snippet: {
      // `&amp;lt;` is a literal "&lt;" in the API payload: it must decode once.
      title: "A &amp;lt;script&amp;gt; B",
      description: "x &amp;lt;b&amp;gt; y",
      channelId: "UCyyyyyyyyyy",
      channelTitle: "Chan &amp; Co",
      publishedAt: "2025-06-02T12:00:00Z",
    },
    statistics: { viewCount: "1", likeCount: "2", commentCount: "3" },
    contentDetails: { duration: "PT1H2M3S" },
  },
  {
    id: "pathcase003",
    snippet: {
      title: "No duration",
      description: "d",
      channelId: "UCzzzzzzzzzz",
      channelTitle: "Creator",
      publishedAt: "2025-06-03T12:00:00Z",
    },
    statistics: { viewCount: "1", likeCount: "1", commentCount: "1" },
    // No contentDetails.duration: the tool must report an explicit unknown.
    contentDetails: {},
  },
];

/** Load the registered tools with a deterministic offline YouTube API. */
async function withDetailsTool(fn) {
  const realFetch = globalThis.fetch;
  const previousApiKey = process.env.YOUTUBE_API_KEY;
  const requestedUrls = [];

  globalThis.fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requestedUrls.push(url);
    assert.equal(url.hostname, "www.googleapis.com");
    assert.equal(url.pathname, "/youtube/v3/videos");
    return new Response(JSON.stringify({ items: API_ITEMS }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  process.env.YOUTUBE_API_KEY = "test-key-for-details-path";

  try {
    const { registerYoutubeTools } = await import("../extensions/youtube-tools.ts");

    const tools = new Map();
    registerYoutubeTools({
      registerTool(definition) {
        tools.set(definition.name, definition);
      },
      registerCommand() {},
    });

    const detailsTool = tools.get("youtube_video_details");
    assert.ok(detailsTool, "youtube_video_details must be registered");

    await fn(detailsTool, requestedUrls);
  } finally {
    globalThis.fetch = realFetch;
    if (previousApiKey === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previousApiKey;
  }
}

/** Read the rendered field lines of one video block in the tool text. */
function textField(text, videoId, field) {
  const block = text.split(`## ${videoId}\n`)[1]?.split("\n\n")[0] ?? "";
  return new RegExp(`^${field}: (.*)$`, "m").exec(block)?.[1];
}

test("youtube_video_details renders the same duration in text and details", async () => {
  await withDetailsTool(async (detailsTool) => {
    const result = await detailsTool.execute("call-duration", {
      videoIds: DETAILS_IDS,
      includeDescription: false,
    });
    const text = result.content[0].text;
    const details = result.details.details;

    assert.equal(textField(text, "pathcase001", "duration"), "12:34");
    assert.equal(details.pathcase001.duration, "12:34");

    assert.equal(textField(text, "pathcase002", "duration"), "1h 2m");
    assert.equal(details.pathcase002.duration, "1h 2m");

    // A missing duration stays an explicit unknown in both projections.
    assert.equal(textField(text, "pathcase003", "duration"), "unknown");
    assert.equal(details.pathcase003.duration, "unknown");
  });
});

test("youtube_video_details decodes HTML entities exactly once in text and details", async () => {
  await withDetailsTool(async (detailsTool) => {
    const result = await detailsTool.execute("call-entities", {
      videoIds: ["pathcase002"],
      includeDescription: true,
    });
    const text = result.content[0].text;
    const details = result.details.details;

    // `&amp;lt;` decodes once to a literal "&lt;"; decoding twice would yield "<script>".
    assert.equal(textField(text, "pathcase002", "title"), "A &lt;script&gt; B");
    assert.equal(details.pathcase002.title, "A &lt;script&gt; B");

    assert.equal(textField(text, "pathcase002", "description"), "x &lt;b&gt; y");
    assert.equal(details.pathcase002.description, "x &lt;b&gt; y");

    assert.equal(details.pathcase002.channelTitle, "Chan & Co");
  });
});

test("youtube_video_details text and details agree field by field", async () => {
  await withDetailsTool(async (detailsTool) => {
    const result = await detailsTool.execute("call-agree", {
      videoIds: DETAILS_IDS,
      includeDescription: true,
    });
    const text = result.content[0].text;
    const details = result.details.details;

    for (const videoId of DETAILS_IDS) {
      const item = details[videoId];
      assert.ok(item, `${videoId} must appear in details`);

      assert.equal(textField(text, videoId, "title"), item.title, `${videoId} title`);
      assert.equal(
        textField(text, videoId, "channel"),
        `${item.channelTitle} (${item.channelId})`,
        `${videoId} channel`,
      );
      assert.equal(textField(text, videoId, "duration"), item.duration, `${videoId} duration`);
      assert.equal(
        textField(text, videoId, "views"),
        item.viewCount.toLocaleString("en-US"),
        `${videoId} views`,
      );
    }
  });
});
