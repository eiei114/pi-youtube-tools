import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function withExtension(fn) {
  const tmpHome = await mkdtemp(join(tmpdir(), "pi-youtube-tools-home-"));
  const previous = {
    PI_YOUTUBE_AGENT_DIR: process.env.PI_YOUTUBE_AGENT_DIR,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  };

  process.env.PI_YOUTUBE_AGENT_DIR = tmpHome;
  delete process.env.YOUTUBE_API_KEY;

  try {
    const moduleUrl = new URL(`../extensions/index.ts?home=${encodeURIComponent(tmpHome)}&t=${Date.now()}`, import.meta.url);
    const { default: extension } = await import(moduleUrl.href);
    const commands = new Map();
    extension({
      registerCommand(name, definition) {
        commands.set(name, definition);
      },
      registerTool() {},
    });
    await fn(commands);
  } finally {
    if (previous.PI_YOUTUBE_AGENT_DIR === undefined) delete process.env.PI_YOUTUBE_AGENT_DIR;
    else process.env.PI_YOUTUBE_AGENT_DIR = previous.PI_YOUTUBE_AGENT_DIR;
    if (previous.YOUTUBE_API_KEY === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous.YOUTUBE_API_KEY;
    await rm(tmpHome, { recursive: true, force: true });
  }
}

function createCtx(inputValue) {
  const notifications = [];
  return {
    notifications,
    ctx: {
      ui: {
        input: async () => inputValue,
        notify: (text, level) => notifications.push({ text, level }),
      },
    },
  };
}

test("/youtube:status reports stored API key without exposing its value", async () => {
  await withExtension(async (commands) => {
    const storedSecret = "yt_test_stored_should_not_appear_1234567890";
    const login = commands.get("youtube:login");
    const status = commands.get("youtube:status");
    assert.ok(login);
    assert.ok(status);

    const { ctx, notifications } = createCtx(storedSecret);
    await login.handler("", ctx);
    notifications.length = 0;
    await status.handler("", ctx);

    const message = notifications.at(-1)?.text ?? "";
    assert.match(message, /configured via pi-youtube-tools login/);
    assert.equal(message.includes(storedSecret), false);
  });
});

test("YOUTUBE_API_KEY takes priority and status still hides secrets", async () => {
  await withExtension(async (commands) => {
    const storedSecret = "yt_test_stored_should_not_appear_abcdefghij";
    const envSecret = "yt_test_env_should_not_appear_0987654321";
    const login = commands.get("youtube:login");
    const status = commands.get("youtube:status");

    const { ctx, notifications } = createCtx(storedSecret);
    await login.handler("", ctx);
    process.env.YOUTUBE_API_KEY = envSecret;
    notifications.length = 0;
    await status.handler("", ctx);

    const message = notifications.at(-1)?.text ?? "";
    assert.match(message, /YOUTUBE_API_KEY environment variable/);
    assert.equal(message.includes(envSecret), false);
    assert.equal(message.includes(storedSecret), false);
  });
});

test("/youtube:login, logout, and status commands are registered", async () => {
  await withExtension(async (commands) => {
    for (const name of ["youtube:login", "youtube:logout", "youtube:status"]) {
      assert.ok(commands.has(name), `${name} should be registered`);
    }
  });
});
