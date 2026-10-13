import assert from "node:assert/strict";
import test from "node:test";
import "./fixtures/offline-youtube-api.mjs";

const fetchFixture = globalThis.fetch;
const apiUrl = (endpoint, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.search = new URLSearchParams(params).toString();
  return url;
};

test("offline search fixture accepts only the smoke contract queries", async () => {
  for (const query of ["deterministic smoke", "reload smoke"]) {
    const response = await fetchFixture(apiUrl("search", { q: query }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).items[0].id.videoId, "p1SmokeTest");
  }

  const response = await fetchFixture(apiUrl("search", { q: "unexpected query" }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: { message: "Unexpected offline smoke search query" },
  });
});

test("offline video details fixture rejects unexpected ids", async () => {
  const expected = await fetchFixture(apiUrl("videos", { id: "p1SmokeTest" }));
  assert.equal(expected.status, 200);
  assert.equal((await expected.json()).items[0].id, "p1SmokeTest");

  const response = await fetchFixture(apiUrl("videos", { id: "wrong-id" }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: { message: "Unexpected offline smoke video id" },
  });
});
