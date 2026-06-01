import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function withAgentDir(fn) {
  const tmpHome = await mkdtemp(join(tmpdir(), "pi-youtube-tools-home-"));
  const previous = process.env.PI_YOUTUBE_AGENT_DIR;

  process.env.PI_YOUTUBE_AGENT_DIR = tmpHome;

  try {
    const authStore = await import(`../lib/auth-store.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);
    await fn(authStore, tmpHome);
  } finally {
    if (previous === undefined) delete process.env.PI_YOUTUBE_AGENT_DIR;
    else process.env.PI_YOUTUBE_AGENT_DIR = previous;
    await rm(tmpHome, { recursive: true, force: true });
  }
}

test("saveStoredApiKey persists and loadStoredApiKey reads trimmed value", async () => {
  await withAgentDir(async ({ saveStoredApiKey, loadStoredApiKey }) => {
    saveStoredApiKey("  test-key  ");
    assert.equal(loadStoredApiKey(), "test-key");
  });
});

test("clearStoredApiKey removes stored key", async () => {
  await withAgentDir(async ({ saveStoredApiKey, loadStoredApiKey, clearStoredApiKey }) => {
    saveStoredApiKey("test-key");
    clearStoredApiKey();
    assert.equal(loadStoredApiKey(), undefined);
  });
});
