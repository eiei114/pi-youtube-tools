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

test("key_segments processing skips unused duration metadata", async () => {
  let durationReads = 0;
  const result = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    fetcher: async () => [{
      offset: 0,
      text: "hello",
      get duration() {
        durationReads += 1;
        return 1;
      },
    }],
  });

  assert.deepEqual(result, {
    transcript: {
      format: "key_segments",
      hook: "hello",
      outro: "hello",
    },
  });
  assert.equal(durationReads, 0);
});

test("getTranscriptWithDiagnostics keeps out-of-order opening captions in input order", async () => {
  const result = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    format: "key_segments",
    fetcher: async () => [
      segment("first in input", 30),
      segment("later caption", 70),
      segment("second in input", 5),
      segment("at the cutoff", 40),
      segment("last in input", 39.5),
    ],
  });

  assert.equal(result.transcript.hook, "first in input second in input last in input");
});

test("getTranscriptWithDiagnostics anchors an out-of-order outro to the latest caption", async () => {
  const fetcher = async () => [
    segment("opening caption", 20),
    segment("just outside the outro", 69.5),
    segment("latest caption", 100),
    segment("at the outro boundary", 70),
    segment("inside the outro", 85),
    segment("earlier opening caption", 5),
  ];

  const keySegments = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    format: "key_segments",
    fetcher,
  });
  assert.deepEqual(keySegments.transcript, {
    format: "key_segments",
    hook: "opening caption earlier opening caption",
    outro: "latest caption at the outro boundary inside the outro",
  });

  const fullText = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    format: "full_text",
    fetcher,
  });
  assert.equal(
    fullText.transcript.text,
    "opening caption just outside the outro latest caption at the outro boundary inside the outro earlier opening caption",
  );
});

test("getTranscriptWithDiagnostics keeps the existing hook and outro for chronological captions", async () => {
  const result = await transcript.getTranscriptWithDiagnostics("abc12345678", {
    format: "key_segments",
    fetcher: async () => [
      segment("opening caption", 0),
      segment("just before the cutoff", 39.5),
      segment("at the cutoff", 40),
      segment("later caption", 70),
    ],
  });

  assert.equal(result.transcript.hook, "opening caption just before the cutoff");
  assert.equal(result.transcript.outro, "at the cutoff later caption");
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
