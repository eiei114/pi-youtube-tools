import assert from "node:assert/strict";
import test from "node:test";

test("youtube_search reports blank queries as tool errors without making a request", async () => {
  const realFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  };

  try {
    const { registerYoutubeTools } = await import("../extensions/youtube-tools.ts");
    const tools = new Map();
    registerYoutubeTools({
      registerTool(definition) {
        tools.set(definition.name, definition);
      },
      registerCommand() {},
    });

    const searchTool = tools.get("youtube_search");
    assert.ok(searchTool, "youtube_search must be registered");
    const result = await searchTool.execute("call-blank-query", { query: " \t " });

    assert.equal(result.content[0].text, "YouTube search query must not be empty.");
    assert.equal(result.details.error, "YouTube search query must not be empty.");
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});
