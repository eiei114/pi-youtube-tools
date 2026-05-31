import assert from "node:assert/strict";
import test from "node:test";

const { formatGreeting } = await import("../lib/greeting.ts");

test("formatGreeting supports short mode", () => {
  assert.equal(formatGreeting({ name: "Pi", mode: "short" }), "Hello, Pi!");
});

test("formatGreeting supports friendly mode", () => {
  assert.equal(
    formatGreeting({ name: "Pi", mode: "friendly" }),
    "Hello, Pi! Your TypeScript-first Pi package is working.",
  );
});