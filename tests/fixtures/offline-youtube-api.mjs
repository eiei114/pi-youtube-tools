import { appendFileSync } from "node:fs";

const auditPath = process.env.PI_YOUTUBE_SMOKE_AUDIT_FILE;

function audit(path, outcome) {
  if (auditPath) appendFileSync(auditPath, `${JSON.stringify({ path, outcome })}\n`);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

globalThis.fetch = async (input) => {
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
    if (url.searchParams.get("id") !== "p1SmokeTest") {
      audit(url.pathname, "unexpected_video_id");
      return jsonResponse({ error: { message: "Unexpected offline smoke video id" } }, 400);
    }
    audit(url.pathname, "fixture_success");
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
      }],
    });
  }

  audit(url.pathname, "blocked_offline_request");
  throw new TypeError("fetch failed");
};
