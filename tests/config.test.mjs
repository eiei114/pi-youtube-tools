import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const {
  authStatusText,
  formatApiKeySourceLabel,
  getYoutubeApiKey,
  isYoutubeConfigured,
  resolveYoutubeApiKey,
} = await import("../lib/config.ts");

test("getYoutubeApiKey returns undefined when env is missing", async () => {
  const tmpHome = await mkdtemp(join(tmpdir(), "pi-youtube-tools-home-"));
  const previous = {
    PI_YOUTUBE_AGENT_DIR: process.env.PI_YOUTUBE_AGENT_DIR,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  };

  process.env.PI_YOUTUBE_AGENT_DIR = tmpHome;
  delete process.env.YOUTUBE_API_KEY;

  try {
    const config = await import(`../lib/config.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);
    assert.equal(config.getYoutubeApiKey(), undefined);
    assert.equal(config.isYoutubeConfigured(), false);
  } finally {
    if (previous.PI_YOUTUBE_AGENT_DIR === undefined) delete process.env.PI_YOUTUBE_AGENT_DIR;
    else process.env.PI_YOUTUBE_AGENT_DIR = previous.PI_YOUTUBE_AGENT_DIR;
    if (previous.YOUTUBE_API_KEY === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous.YOUTUBE_API_KEY;
    await rm(tmpHome, { recursive: true, force: true });
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

test("resolveYoutubeApiKey prefers environment over stored login", async () => {
  const tmpHome = await mkdtemp(join(tmpdir(), "pi-youtube-tools-home-"));
  const previous = {
    PI_YOUTUBE_AGENT_DIR: process.env.PI_YOUTUBE_AGENT_DIR,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  };

  process.env.PI_YOUTUBE_AGENT_DIR = tmpHome;
  delete process.env.YOUTUBE_API_KEY;

  try {
    const authStore = await import(`../lib/auth-store.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);
    authStore.saveStoredApiKey("stored-key");
    process.env.YOUTUBE_API_KEY = "env-key";

    const config = await import(`../lib/config.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);
    const resolved = config.resolveYoutubeApiKey();
    assert.equal(resolved.source, "environment");
    assert.equal(resolved.apiKey, "env-key");
  } finally {
    if (previous.PI_YOUTUBE_AGENT_DIR === undefined) delete process.env.PI_YOUTUBE_AGENT_DIR;
    else process.env.PI_YOUTUBE_AGENT_DIR = previous.PI_YOUTUBE_AGENT_DIR;
    if (previous.YOUTUBE_API_KEY === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous.YOUTUBE_API_KEY;
    await rm(tmpHome, { recursive: true, force: true });
  }
});

test("formatApiKeySourceLabel maps missing to none and preserves other sources", () => {
  assert.equal(formatApiKeySourceLabel("environment"), "environment");
  assert.equal(formatApiKeySourceLabel("stored"), "stored");
  assert.equal(formatApiKeySourceLabel("missing"), "none");
});

test("resolveYoutubeApiKey reports stored source when only login key exists", async () => {
  const tmpHome = await mkdtemp(join(tmpdir(), "pi-youtube-tools-home-"));
  const previous = {
    PI_YOUTUBE_AGENT_DIR: process.env.PI_YOUTUBE_AGENT_DIR,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  };

  process.env.PI_YOUTUBE_AGENT_DIR = tmpHome;
  delete process.env.YOUTUBE_API_KEY;

  try {
    const authStore = await import(`../lib/auth-store.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);
    authStore.saveStoredApiKey("stored-only-key");

    const config = await import(`../lib/config.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);
    const resolved = config.resolveYoutubeApiKey();
    assert.equal(resolved.source, "stored");
    assert.equal(resolved.apiKey, "stored-only-key");
  } finally {
    if (previous.PI_YOUTUBE_AGENT_DIR === undefined) delete process.env.PI_YOUTUBE_AGENT_DIR;
    else process.env.PI_YOUTUBE_AGENT_DIR = previous.PI_YOUTUBE_AGENT_DIR;
    if (previous.YOUTUBE_API_KEY === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous.YOUTUBE_API_KEY;
    await rm(tmpHome, { recursive: true, force: true });
  }
});

test("resolveYoutubeApiKey reports missing source when no key is configured", async () => {
  const tmpHome = await mkdtemp(join(tmpdir(), "pi-youtube-tools-home-"));
  const previous = {
    PI_YOUTUBE_AGENT_DIR: process.env.PI_YOUTUBE_AGENT_DIR,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  };

  process.env.PI_YOUTUBE_AGENT_DIR = tmpHome;
  delete process.env.YOUTUBE_API_KEY;

  try {
    const config = await import(`../lib/config.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);
    const resolved = config.resolveYoutubeApiKey();
    assert.equal(resolved.source, "missing");
    assert.equal(resolved.apiKey, undefined);
  } finally {
    if (previous.PI_YOUTUBE_AGENT_DIR === undefined) delete process.env.PI_YOUTUBE_AGENT_DIR;
    else process.env.PI_YOUTUBE_AGENT_DIR = previous.PI_YOUTUBE_AGENT_DIR;
    if (previous.YOUTUBE_API_KEY === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous.YOUTUBE_API_KEY;
    await rm(tmpHome, { recursive: true, force: true });
  }
});

test("authStatusText includes source labels for each configured state", async () => {
  const tmpHome = await mkdtemp(join(tmpdir(), "pi-youtube-tools-home-"));
  const previous = {
    PI_YOUTUBE_AGENT_DIR: process.env.PI_YOUTUBE_AGENT_DIR,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  };

  process.env.PI_YOUTUBE_AGENT_DIR = tmpHome;
  delete process.env.YOUTUBE_API_KEY;

  try {
    const authStore = await import(`../lib/auth-store.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);
    const config = await import(`../lib/config.ts?agent=${encodeURIComponent(tmpHome)}&t=${Date.now()}`);

    const storedSecret = "yt_test_stored_should_not_appear_in_status";
    authStore.saveStoredApiKey(storedSecret);
    const storedStatus = config.authStatusText();
    assert.match(storedStatus, /configured via pi-youtube-tools login/);
    assert.match(storedStatus, /\(source: stored\)/);
    assert.equal(storedStatus.includes(storedSecret), false);

    delete process.env.YOUTUBE_API_KEY;
    authStore.clearStoredApiKey();
    const missingStatus = config.authStatusText();
    assert.match(missingStatus, /YouTube API key missing/);
    assert.match(missingStatus, /\(source: none\)/);

    const envSecret = "yt_test_env_should_not_appear_in_status";
    process.env.YOUTUBE_API_KEY = envSecret;
    const envStatus = config.authStatusText();
    assert.match(envStatus, /YOUTUBE_API_KEY environment variable/);
    assert.match(envStatus, /\(source: environment\)/);
    assert.equal(envStatus.includes(envSecret), false);
  } finally {
    if (previous.PI_YOUTUBE_AGENT_DIR === undefined) delete process.env.PI_YOUTUBE_AGENT_DIR;
    else process.env.PI_YOUTUBE_AGENT_DIR = previous.PI_YOUTUBE_AGENT_DIR;
    if (previous.YOUTUBE_API_KEY === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous.YOUTUBE_API_KEY;
    await rm(tmpHome, { recursive: true, force: true });
  }
});
