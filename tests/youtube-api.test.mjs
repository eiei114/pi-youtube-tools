import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const { searchVideos, getVideoDetails, parseYouTubeNumber } = await import("../lib/youtube-api.ts");
const { InvalidSearchQueryError, MissingApiKeyError, YoutubeApiError } = await import("../lib/errors.ts");

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

test("searchVideos maps API response and defaults to five results", async () => {
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
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.videoId, "abc12345678");
  assert.equal(results[0]?.title, "Gameplay");
  assert.equal(requestedMaxResults, "5");
});

test("searchVideos truncates fractional maxResults to an integer", async () => {
  let requestedMaxResults = "";
  const fetchFn = async (url) => {
    requestedMaxResults = new URL(String(url)).searchParams.get("maxResults");
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  };

  await searchVideos("roblox", { apiKey: "test-key", fetchFn, maxResults: 2.7 });
  assert.equal(requestedMaxResults, "2");
});

test("searchVideos defaults non-finite maxResults to five", async () => {
  let requestedMaxResults = "";
  const fetchFn = async (url) => {
    requestedMaxResults = new URL(String(url)).searchParams.get("maxResults");
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  };

  await searchVideos("roblox", { apiKey: "test-key", fetchFn, maxResults: NaN });
  assert.equal(requestedMaxResults, "5");
});

test("searchVideos clamps zero and negative maxResults to one", async () => {
  const requestedMaxResults = [];
  const fetchFn = async (url) => {
    requestedMaxResults.push(new URL(String(url)).searchParams.get("maxResults"));
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  };

  await searchVideos("roblox", { apiKey: "test-key", fetchFn, maxResults: 0 });
  await searchVideos("roblox", { apiKey: "test-key", fetchFn, maxResults: -4 });
  assert.deepEqual(requestedMaxResults, ["1", "1"]);
});

test("searchVideos rejects blank queries before calling fetch", async () => {
  let fetchCalls = 0;
  const fetchFn = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  };

  for (const query of ["", " \t\n "]) {
    await assert.rejects(
      () => searchVideos(query, { apiKey: "test-key", fetchFn }),
      (error) => {
        assert.ok(error instanceof InvalidSearchQueryError);
        assert.equal(error.message, "YouTube search query must not be empty.");
        return true;
      },
    );
  }
  assert.equal(fetchCalls, 0);
});

test("searchVideos sends a trimmed query to the API", async () => {
  let requestedQuery = "";
  const fetchFn = async (url) => {
    requestedQuery = new URL(String(url)).searchParams.get("q");
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  };

  await searchVideos("  roblox gameplay  ", { apiKey: "test-key", fetchFn });
  assert.equal(requestedQuery, "roblox gameplay");
});

test("searchVideos translates a stalled fetch into a timeout error", async () => {
  const fetchFn = (_url, { signal }) =>
    new Promise((_, reject) => {
      const keepAlive = setTimeout(() => {}, 1000);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(keepAlive);
          reject(signal.reason);
        },
        { once: true },
      );
    });

  await assert.rejects(
    () =>
      searchVideos("roblox", {
        apiKey: "test-key",
        fetchFn,
        requestTimeoutMs: 20,
      }),
    (error) => {
      assert.ok(error instanceof YoutubeApiError);
      assert.equal(error.message, "YouTube API request timed out after 20ms");
      assert.doesNotMatch(error.message, /test-key/);
      return true;
    },
  );
});

test("searchVideos preserves unrelated AbortError rejections", async () => {
  const fetchFn = async () => {
    const error = new Error("caller cancelled request");
    error.name = "AbortError";
    throw error;
  };

  await assert.rejects(
    () => searchVideos("roblox", { apiKey: "test-key", fetchFn }),
    (error) => error?.name === "AbortError" && error?.message === "caller cancelled request",
  );
});

test("searchVideos preserves network failures while reading a response body", async () => {
  const networkError = new TypeError("fetch failed");
  const fetchFn = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.error(networkError);
        },
      }),
      { status: 200 },
    );

  await assert.rejects(
    () => searchVideos("roblox", { apiKey: "test-key", fetchFn }),
    (error) => {
      assert.equal(error, networkError);
      assert.equal(error.message, "fetch failed");
      assert.ok(!(error instanceof YoutubeApiError));
      return true;
    },
  );
});

test("searchVideos reports HTML 502 responses without exposing the response body", async () => {
  const apiKey = "test-key";
  const responseBody = `<html>Gateway error for ${apiKey}</html>`;
  const fetchFn = async () => new Response(responseBody, { status: 502 });

  await assert.rejects(
    () => searchVideos("roblox", { apiKey, fetchFn }),
    (error) => {
      assert.ok(error instanceof YoutubeApiError);
      assert.equal(error.message, "YouTube API request failed (HTTP 502)");
      assert.ok(error.cause instanceof SyntaxError);
      assert.doesNotMatch(error.message, /test-key|Gateway error|<html>/);
      return true;
    },
  );
});

test("searchVideos reports an empty 500 response with the HTTP status", async () => {
  const fetchFn = async () => new Response(null, { status: 500 });

  await assert.rejects(
    () => searchVideos("roblox", { apiKey: "test-key", fetchFn }),
    (error) => {
      assert.ok(error instanceof YoutubeApiError);
      assert.equal(error.message, "YouTube API request failed (HTTP 500)");
      assert.ok(error.cause instanceof SyntaxError);
      return true;
    },
  );
});

test("searchVideos preserves the 403 hint for non-JSON responses", async () => {
  const fetchFn = async () => new Response("<html>denied test-key</html>", { status: 403 });

  await assert.rejects(
    () => searchVideos("roblox", { apiKey: "test-key", fetchFn }),
    (error) => {
      assert.ok(error instanceof YoutubeApiError);
      assert.equal(
        error.message,
        "YouTube API request failed (HTTP 403) Check API key, enabled APIs, and quota.",
      );
      assert.ok(error.cause instanceof SyntaxError);
      assert.doesNotMatch(error.message, /test-key|denied|<html>/);
      return true;
    },
  );
});

test("searchVideos reports non-JSON success responses with the HTTP status", async () => {
  const fetchFn = async () => new Response("not json", { status: 200 });

  await assert.rejects(
    () => searchVideos("roblox", { apiKey: "test-key", fetchFn }),
    (error) => {
      assert.ok(error instanceof YoutubeApiError);
      assert.equal(error.message, "YouTube API returned a non-JSON response (HTTP 200)");
      assert.ok(error.cause instanceof SyntaxError);
      return true;
    },
  );
});

test("searchVideos rejects JSON success responses that are not objects", async () => {
  const fetchFn = async () => new Response("null", { status: 200 });

  await assert.rejects(
    () => searchVideos("roblox", { apiKey: "test-key", fetchFn }),
    (error) => {
      assert.ok(error instanceof YoutubeApiError);
      assert.equal(error.message, "YouTube API returned an invalid JSON response (HTTP 200)");
      assert.ok(error.cause instanceof TypeError);
      return true;
    },
  );
});

test("searchVideos omits JSON error bodies and preserves the 403 hint", async () => {
  const apiKey = "test-key";
  const responseMessage = "The API key is invalid: private-response-detail";
  const fetchFn = async () =>
    new Response(JSON.stringify({ error: { message: responseMessage } }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    () => searchVideos("roblox", { apiKey, fetchFn }),
    (error) => {
      assert.ok(error instanceof YoutubeApiError);
      assert.equal(
        error.message,
        "YouTube API request failed (HTTP 403) Check API key, enabled APIs, and quota.",
      );
      assert.doesNotMatch(error.message, new RegExp(apiKey));
      assert.ok(!error.message.includes(responseMessage));
      return true;
    },
  );
});

test("searchVideos uses the status and 403 hint when JSON has no error message", async () => {
  const fetchFn = async () =>
    new Response("{}", { status: 403, headers: { "Content-Type": "application/json" } });

  await assert.rejects(
    () => searchVideos("roblox", { apiKey: "test-key", fetchFn }),
    (error) => {
      assert.ok(error instanceof YoutubeApiError);
      assert.equal(
        error.message,
        "YouTube API request failed (HTTP 403) Check API key, enabled APIs, and quota.",
      );
      return true;
    },
  );
});

test("searchVideos does not echo an API key from a JSON error message", async () => {
  const apiKey = "test-key";
  const fetchFn = async () =>
    new Response(JSON.stringify({ error: { message: `Invalid key ${apiKey}` } }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    () => searchVideos("roblox", { apiKey, fetchFn }),
    (error) => {
      assert.ok(error instanceof YoutubeApiError);
      assert.equal(
        error.message,
        "YouTube API request failed (HTTP 403) Check API key, enabled APIs, and quota.",
      );
      assert.doesNotMatch(error.message, /test-key/);
      return true;
    },
  );
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
