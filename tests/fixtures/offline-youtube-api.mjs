import { appendFileSync } from "node:fs";

const auditPath = process.env.PI_YOUTUBE_SMOKE_AUDIT_FILE;

function audit(path, outcome, details = {}) {
  if (auditPath) appendFileSync(auditPath, `${JSON.stringify({ path, outcome, ...details })}\n`);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname === "www.googleapis.com" && url.pathname === "/youtube/v3/search") {
    const query = url.searchParams.get("q");
    if (query === "offline-error") {
      audit(url.pathname, "quota_error");
      return jsonResponse({ error: { message: "Offline smoke quota exceeded" } }, 403);
    }
    if (!["deterministic smoke", "reload smoke"].includes(query)) {
      audit(url.pathname, "unexpected_query");
      return jsonResponse({ error: { message: "Unexpected offline smoke search query" } }, 400);
    }
    audit(url.pathname, "fixture_success");
    return jsonResponse({
      items: [{
        id: { videoId: "p1SmokeTest" },
        snippet: {
          title: "Offline Pi SDK smoke video",
          description: "Deterministic local response",
          channelId: "smoke-channel",
          channelTitle: "Pi SDK smoke",
          publishedAt: "2026-10-12T00:00:00Z",
        },
      }],
    });
  }

  if (url.hostname === "www.googleapis.com" && url.pathname === "/youtube/v3/videos") {
    const requestedIds = url.searchParams.get("id")?.split(",") ?? [];
    if (requestedIds.join(",") !== "p1SmokeTest,abcdefghijk") {
      audit(url.pathname, "unexpected_video_id", { requestedIds });
      return jsonResponse({ error: { message: "Unexpected offline smoke video id" } }, 400);
    }
    audit(url.pathname, "fixture_success", { requestedIds });
    return jsonResponse({
      items: [{
        id: "p1SmokeTest",
        snippet: {
          title: "Offline Pi SDK smoke video",
          description: "Deterministic local response",
          channelId: "smoke-channel",
          channelTitle: "Pi SDK smoke",
          publishedAt: "2026-10-12T00:00:00Z",
        },
        statistics: { viewCount: "12345", likeCount: "321", commentCount: "17" },
        contentDetails: { duration: "PT2M30S" },
      }, {
        id: "abcdefghijk",
        snippet: {
          title: "Second offline Pi SDK smoke video",
          description: "Second deterministic local response",
          channelId: "smoke-channel",
          channelTitle: "Pi SDK smoke",
          publishedAt: "2026-10-12T00:00:00Z",
        },
        statistics: { viewCount: "42", likeCount: "7", commentCount: "2" },
        contentDetails: { duration: "PT1M" },
      }],
    });
  }

  const requestBody = input instanceof Request ? await input.clone().text() : init?.body;
  let bodyVideoId;
  if (typeof requestBody === "string") {
    try {
      bodyVideoId = JSON.parse(requestBody).videoId;
    } catch {
      // Preserve the generic offline block for non-JSON request bodies.
    }
  }
  const videoId = url.searchParams.get("v") ?? bodyVideoId;
  audit(url.pathname, "blocked_offline_request", videoId ? { videoId } : {});
  throw new TypeError("fetch failed");
};
