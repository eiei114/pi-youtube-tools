import assert from "node:assert/strict";
import test from "node:test";

const formatters = await import("../lib/formatters.ts");
const { __testing: transcriptTesting } = await import("../lib/transcript.ts");

test("formatSearchResults renders lean markdown output", () => {
  const text = formatters.formatSearchResults("roblox", [
    {
      videoId: "abc12345678",
      title: "Roblox Gameplay",
      channelId: "chan123",
      channelTitle: "Creator",
      publishedAt: "2026-01-01T00:00:00Z",
      descriptionSnippet: "A long gameplay video about Roblox mechanics and loops.",
    },
  ]);

  assert.match(text, /YOUTUBE SEARCH/);
  assert.match(text, /abc12345678/);
  assert.match(text, /Roblox Gameplay/);
});

test("truncateText appends truncation marker", () => {
  const text = formatters.truncateText("abcdefghij", 5);
  assert.match(text, /\[truncated 5 chars\]/);
});

test("decodeHtmlEntities decodes common YouTube API entities", () => {
  assert.equal(formatters.decodeHtmlEntities("PAPA PIZZA&#39;S PRISON RUN!"), "PAPA PIZZA'S PRISON RUN!");
  assert.equal(formatters.decodeHtmlEntities("A &amp; B &lt; C"), "A & B < C");
});

test("formatSearchResults decodes HTML entities in titles", () => {
  const text = formatters.formatSearchResults("roblox", [
    {
      videoId: "PisjPwPA1Vo",
      title: "PAPA PIZZA&#39;S PRISON RUN!",
      channelId: "chan123",
      channelTitle: "Bacon&amp;Roblox",
      publishedAt: "2026-05-29T17:30:06Z",
      descriptionSnippet: null,
    },
  ]);

  assert.match(text, /PAPA PIZZA'S PRISON RUN!/);
  assert.doesNotMatch(text, /&#39;/);
  assert.match(text, /Bacon&Roblox/);
});

test("formatTranscriptMap decodes HTML entities in transcript text", () => {
  const text = formatters.formatTranscriptMap({
    test1234567: {
      format: "key_segments",
      hook: "you&#39;re not subscribed",
      outro: "I&#39;m out.",
    },
  });

  assert.match(text, /you're not subscribed/);
  assert.match(text, /I'm out\./);
  assert.doesNotMatch(text, /&#39;/);
});

test("extractHook keeps only early segments", () => {
  const segments = [
    { offset: 0, duration: 1, text: "intro" },
    { offset: 35, duration: 1, text: "still hook" },
    { offset: 45, duration: 1, text: "body" },
  ];
  assert.equal(transcriptTesting.extractHook(segments), "intro still hook");
});

test("extractOutro keeps trailing segments", () => {
  const segments = [
    { offset: 0, duration: 1, text: "start" },
    { offset: 120, duration: 1, text: "ending soon" },
    { offset: 130, duration: 1, text: "final CTA" },
  ];
  assert.match(transcriptTesting.extractOutro(segments), /final CTA/);
});
