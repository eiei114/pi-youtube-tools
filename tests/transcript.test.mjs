import assert from "node:assert/strict";
import test from "node:test";
import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript-plus";

const transcript = await import("../lib/transcript.ts");

const segment = (text, offset = 0) => ({
  text,
  offset,
  duration: 1,
  lang: "en",
});

test("getTranscriptWithDiagnostics returns transcript on successful fetch", async () => {
  const result = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    lang: "en",
    format: "full_text",
    fetcher: async (videoId, options) => {
      assert.equal(videoId, "abc12345678");
      assert.deepEqual(options, { lang: "en" });
      return [segment("hello"), segment("world", 1)];
    },
  });

  assert.deepEqual(result, {
    transcript: {
      format: "full_text",
      text: "hello world",
    },
  });
});

test("getTranscript import remains available for existing callers", () => {
  assert.equal(typeof transcript.getTranscript, "function");
});

test("getTranscriptWithDiagnostics reports empty transcript arrays", async () => {
  const result = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    lang: "ja",
    fetcher: async () => [],
  });

  assert.equal(result.transcript, null);
  assert.equal(result.diagnostic.reasonCode, "empty_transcript");
  assert.equal(result.diagnostic.lang, "ja");
  assert.match(result.diagnostic.nextAction, /language|video/i);
});

test("getTranscriptWithDiagnostics classifies known unavailable dependency errors", async () => {
  const disabled = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    fetcher: async () => {
      throw new YoutubeTranscriptDisabledError("abc12345678");
    },
  });
  assert.equal(disabled.transcript, null);
  assert.equal(disabled.diagnostic.reasonCode, "captions_disabled_or_missing");

  const language = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    lang: "ja",
    fetcher: async () => {
      throw new YoutubeTranscriptNotAvailableLanguageError("ja", ["en", "es"], "abc12345678");
    },
  });
  assert.equal(language.transcript, null);
  assert.equal(language.diagnostic.reasonCode, "language_unavailable");
  assert.deepEqual(language.diagnostic.availableLangs, ["en", "es"]);

  const unavailable = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    fetcher: async () => {
      throw new YoutubeTranscriptVideoUnavailableError("abc12345678");
    },
  });
  assert.equal(unavailable.transcript, null);
  assert.equal(unavailable.diagnostic.reasonCode, "video_unavailable");
});

test("getTranscriptWithDiagnostics classifies upstream/network errors conservatively", async () => {
  const result = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    fetcher: async () => {
      throw new YoutubeTranscriptTooManyRequestError();
    },
  });

  assert.equal(result.transcript, null);
  assert.equal(result.diagnostic.reasonCode, "network_or_upstream_error");
  assert.equal(result.diagnostic.rawErrorExcerpt, undefined);
});

test("getTranscriptWithDiagnostics sanitizes unknown dependency errors", async () => {
  const result = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    lang: "en",
    fetcher: async () => {
      throw new Error(`bad\u0000provider\n${"A".repeat(500)}`);
    },
  });

  assert.equal(result.transcript, null);
  assert.equal(result.diagnostic.reasonCode, "fetch_failed");
  assert.equal(result.diagnostic.lang, "en");
  assert.ok(result.diagnostic.rawErrorExcerpt.length <= 240);
  assert.doesNotMatch(result.diagnostic.rawErrorExcerpt, /[\u0000-\u001f\u007f-\u009f]/);
  assert.match(result.diagnostic.rawErrorExcerpt, /bad provider/);
});
