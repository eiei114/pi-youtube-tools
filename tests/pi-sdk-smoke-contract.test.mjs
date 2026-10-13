import assert from "node:assert/strict";
import test from "node:test";
import {
  behaviorAssertions,
  parseJsonLines,
  SDK_VERSIONS,
  VERIFICATION_CONTRACT,
} from "../scripts/pi-sdk-smoke-contract.mjs";

const status = {
  type: "extension_ui_request",
  method: "setStatus",
  statusKey: "pi-youtube-tools-smoke",
  statusText: "probe-ready",
};
const registrationMessage = {
  type: "message_end",
  message: {
    role: "assistant",
    content: [{
      type: "text",
      text: JSON.stringify({
        case: "extension_load",
        registeredTools: ["youtube_search", "youtube_transcript", "youtube_video_details"],
      }),
    }],
  },
};
const readyRecords = [status, registrationMessage];
const observation = (records, extras = {}) => ({
  records,
  audit: [],
  exitCode: 0,
  fullOutput: "",
  stdout: "",
  expectedVersion: "1.1.0",
  ...extras,
});
const toolEnd = (toolName, result, isError = false) => ({
  type: "tool_execution_end",
  toolName,
  result,
  isError,
});

test("contract names and JSONL parser match the pinned Pi smoke format", () => {
  assert.equal(VERIFICATION_CONTRACT, "pi-sdk-behavior-v2");
  assert.deepEqual(Object.values(SDK_VERSIONS), ["1.1.0", "1.1.0", "1.1.0", "1.1.0"]);
  assert.deepEqual(parseJsonLines(`not-json\r\n${JSON.stringify(status)}\n`), [status]);
});

test("extension registration requires the actual status and all real package tools", () => {
  assert.equal(behaviorAssertions("extension_load", observation(readyRecords))[0].passed, true);
  for (const records of [[], [registrationMessage], [status], [
    status,
    { ...registrationMessage, message: { ...registrationMessage.message, content: [{
      type: "text",
      text: JSON.stringify({ registeredTools: ["youtube_search"] }),
    }] } },
  ]]) {
    assert.equal(behaviorAssertions("extension_load", observation(records))[0].passed, false);
  }
});

test("happy path validates all feature responses and the offline network boundary", () => {
  const records = [
    toolEnd("youtube_search", { details: { results: [{ videoId: "p1SmokeTest", title: "Offline Pi SDK smoke video" }] } }),
    toolEnd("youtube_video_details", { details: { details: { p1SmokeTest: { title: "Offline Pi SDK smoke video", viewCount: 12345 } } } }),
    toolEnd("youtube_transcript", { details: {
      transcripts: { p1SmokeTest: null },
      transcriptDiagnostics: { p1SmokeTest: { reasonCode: "network_or_upstream_error" } },
    } }),
  ];
  const audit = [
    { path: "/youtube/v3/search", outcome: "fixture_success" },
    { path: "/youtube/v3/videos", outcome: "fixture_success" },
    { path: "/youtube/api/timedtext", outcome: "blocked_offline_request" },
  ];
  assert.equal(behaviorAssertions("happy_path", observation(records, { audit }))[0].passed, true);
  for (const incomplete of [records.slice(0, 2), [records[0], records[1], toolEnd("youtube_transcript", { details: {} })]]) {
    assert.equal(behaviorAssertions("happy_path", observation(incomplete, { audit }))[0].passed, false);
  }
  assert.equal(behaviorAssertions("happy_path", observation(records, { audit: audit.slice(0, 2) }))[0].passed, false);
});

test("error path requires the actual handled API error response", () => {
  const records = [toolEnd("youtube_search", { details: { error: "Offline smoke quota exceeded" } })];
  const audit = [{ path: "/youtube/v3/search", outcome: "quota_error" }];
  assert.equal(behaviorAssertions("error_path", observation(records, { audit }))[0].passed, true);
  assert.equal(behaviorAssertions("error_path", observation([], { audit }))[0].passed, false);
  assert.equal(behaviorAssertions("error_path", observation(records, { audit: [] }))[0].passed, false);
  assert.equal(behaviorAssertions("error_path", observation([toolEnd("youtube_search", { details: {} })], { audit }))[0].passed, false);
});

test("reload requires second-process registration, feature output, and clean shutdown", () => {
  const records = [
    status,
    { ...registrationMessage, message: { ...registrationMessage.message, content: [{
      type: "text",
      text: JSON.stringify({ registeredTools: ["youtube_search"] }),
    }] } },
    toolEnd("youtube_search", { details: { results: [{ videoId: "p1SmokeTest", title: "Offline Pi SDK smoke video" }] } }),
  ];
  const audit = [{ path: "/youtube/v3/search", outcome: "fixture_success" }];
  const assertions = behaviorAssertions("reload_cleanup", observation(records, { audit }));
  assert.deepEqual(assertions.map((item) => item.id), [
    "reloaded_extension_registered",
    "reloaded_feature_response",
    "clean_shutdown",
  ]);
  assert.ok(assertions.every((item) => item.passed));
  for (const incomplete of [[], [status], [status, records[1]], [status, records[1], records[2]]]) {
    assert.ok(behaviorAssertions("reload_cleanup", observation(incomplete, {
      audit,
      exitCode: incomplete.length < 4 ? 1 : 0,
      fullOutput: incomplete.length === 4 ? "UnhandledPromiseRejection" : "",
    })).some((item) => !item.passed));
  }
  assert.equal(behaviorAssertions("reload_cleanup", observation(records, {
    audit,
    fullOutput: "shutdown error",
  }))[2].passed, false);
  assert.equal(behaviorAssertions("reload_cleanup", observation(records, {
    audit,
    priorProcessExitCode: 1,
  }))[2].passed, false);
});

test("native shell must report the exact pinned version", () => {
  assert.equal(behaviorAssertions("host_shell", observation([], { stdout: "1.1.0\r\n" }))[0].passed, true);
  for (const output of ["", "11.1.0", "1.1.0 with extra output", "1.0.0"]) {
    assert.equal(behaviorAssertions("host_shell", observation([], { stdout: output }))[0].passed, false);
  }
});
