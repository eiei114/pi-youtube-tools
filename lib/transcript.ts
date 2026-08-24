import { fetchTranscript, type TranscriptResponse } from "youtube-transcript-plus";

export type TranscriptFormat = "full_text" | "key_segments";

export interface TranscriptSegment {
  offset: number;
  duration: number;
  text: string;
}

export interface TranscriptResult {
  format: TranscriptFormat;
  text?: string;
  hook?: string;
  outro?: string;
}

export type TranscriptReasonCode =
  | "empty_transcript"
  | "captions_disabled_or_missing"
  | "language_unavailable"
  | "video_unavailable"
  | "network_or_upstream_error"
  | "fetch_failed";

export interface TranscriptDiagnostic {
  reasonCode: TranscriptReasonCode;
  lang: string;
  message: string;
  nextAction: string;
  availableLangs?: string[];
  rawErrorExcerpt?: string;
}

export interface TranscriptWithDiagnosticsSuccess {
  transcript: TranscriptResult;
  diagnostic?: undefined;
}

export interface TranscriptWithDiagnosticsFailure {
  transcript: null;
  diagnostic: TranscriptDiagnostic;
}

export type TranscriptWithDiagnosticsResult =
  | TranscriptWithDiagnosticsSuccess
  | TranscriptWithDiagnosticsFailure;

export type TranscriptFetcher = (
  videoId: string,
  options: { lang?: string },
) => Promise<TranscriptResponse[]>;

export interface TranscriptOptions {
  lang?: string;
  format?: TranscriptFormat;
  fetcher?: TranscriptFetcher;
}

const HOOK_DURATION_SECONDS = 40;
const OUTRO_DURATION_SECONDS = 30;
const DEFAULT_LANG = "en";
const MAX_RAW_ERROR_EXCERPT_CHARS = 240;
const MAX_AVAILABLE_LANGS = 8;
const MAX_LANG_CHARS = 30;
const TRANSCRIPT_ERROR_NAMES = {
  disabled: "YoutubeTranscriptDisabledError",
  invalidVideoId: "YoutubeTranscriptInvalidVideoIdError",
  notAvailable: "YoutubeTranscriptNotAvailableError",
  notAvailableLanguage: "YoutubeTranscriptNotAvailableLanguageError",
  tooManyRequests: "YoutubeTranscriptTooManyRequestError",
  videoUnavailable: "YoutubeTranscriptVideoUnavailableError",
} as const;

function segmentStartSeconds(segment: TranscriptSegment): number {
  return segment.offset;
}

function extractHook(segments: TranscriptSegment[]): string {
  let hook = "";
  for (const segment of segments) {
    if (segmentStartSeconds(segment) < HOOK_DURATION_SECONDS) {
      hook += `${segment.text} `;
    } else {
      break;
    }
  }
  return hook.trim();
}

function extractOutro(segments: TranscriptSegment[]): string {
  if (segments.length === 0) return "";

  const lastStart = segmentStartSeconds(segments[segments.length - 1]!);
  const outroStart = Math.max(0, lastStart - OUTRO_DURATION_SECONDS);
  const outroSegments = segments.filter((segment) => segmentStartSeconds(segment) >= outroStart);
  return outroSegments.map((segment) => segment.text).join(" ").trim();
}

function toTranscriptResult(segments: TranscriptSegment[], format: TranscriptFormat): TranscriptResult {
  if (format === "full_text") {
    return {
      format,
      text: segments.map((segment) => segment.text).join(" "),
    };
  }

  return {
    format,
    hook: extractHook(segments),
    outro: extractOutro(segments),
  };
}

function errorName(error: unknown): string | undefined {
  if (error instanceof Error) return error.name;
  if (typeof error === "object" && error && "name" in error) {
    const name = (error as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

function isErrorNamed(error: unknown, expectedName: string): boolean {
  return errorName(error) === expectedName;
}

function sanitizeOneLine(value: string, maxLength: number): string {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1))}…`;
}

function rawErrorText(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

function sanitizeRawErrorExcerpt(error: unknown): string {
  const excerpt = sanitizeOneLine(rawErrorText(error), MAX_RAW_ERROR_EXCERPT_CHARS);
  return excerpt || "Unknown transcript fetch failure";
}

function cleanAvailableLangs(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const langs = value
    .map((item) => sanitizeOneLine(String(item), MAX_LANG_CHARS))
    .filter((item) => item.length > 0)
    .slice(0, MAX_AVAILABLE_LANGS);
  return langs.length > 0 ? langs : undefined;
}

function unknownErrorProperty(error: unknown, property: string): unknown {
  if (typeof error === "object" && error && property in error) {
    return (error as Record<string, unknown>)[property];
  }
  return undefined;
}

function isLikelyNetworkOrUpstreamError(error: unknown): boolean {
  if (isErrorNamed(error, TRANSCRIPT_ERROR_NAMES.tooManyRequests)) return true;

  const name = errorName(error);
  if (name === "AbortError" || name === "TimeoutError") return true;

  if (!(error instanceof TypeError)) return false;
  return /fetch failed|network|timeout|timed out|econnreset|etimedout|enotfound|eai_again/i.test(
    error.message,
  );
}

function diagnosticForReason(reasonCode: TranscriptReasonCode, lang: string): TranscriptDiagnostic {
  switch (reasonCode) {
    case "empty_transcript":
      return {
        reasonCode,
        lang,
        message: `Transcript fetch completed for lang "${lang}" but returned no caption segments.`,
        nextAction: "Try another caption language or choose another video.",
      };
    case "captions_disabled_or_missing":
      return {
        reasonCode,
        lang,
        message: `Captions are disabled or missing for lang "${lang}" on this video.`,
        nextAction: "Choose another video, or try a different language if captions may exist.",
      };
    case "video_unavailable":
      return {
        reasonCode,
        lang,
        message: "The video is unavailable or could not be fetched for transcript lookup.",
        nextAction: "Verify the video ID or URL, or choose another video.",
      };
    case "network_or_upstream_error":
      return {
        reasonCode,
        lang,
        message: `The transcript provider or network failed while requesting lang "${lang}".`,
        nextAction: "Retry later; if it repeats, try another video.",
      };
    case "language_unavailable":
    case "fetch_failed":
      throw new Error(`Use a specialized diagnostic builder for ${reasonCode}.`);
  }
}

function diagnosticFromError(error: unknown, lang: string): TranscriptDiagnostic {
  if (isErrorNamed(error, TRANSCRIPT_ERROR_NAMES.notAvailableLanguage)) {
    const errorLang = unknownErrorProperty(error, "lang");
    const attemptedLang = typeof errorLang === "string" ? sanitizeOneLine(errorLang, MAX_LANG_CHARS) : lang;
    const availableLangs = cleanAvailableLangs(unknownErrorProperty(error, "availableLangs"));
    return {
      reasonCode: "language_unavailable",
      lang: attemptedLang,
      message: availableLangs
        ? `Transcript language "${attemptedLang}" is unavailable. Available languages include ${availableLangs.join(", ")}.`
        : `Transcript language "${attemptedLang}" is unavailable for this video.`,
      nextAction: "Retry with an available caption language.",
      availableLangs,
    };
  }

  if (
    isErrorNamed(error, TRANSCRIPT_ERROR_NAMES.disabled) ||
    isErrorNamed(error, TRANSCRIPT_ERROR_NAMES.notAvailable)
  ) {
    return diagnosticForReason("captions_disabled_or_missing", lang);
  }

  if (
    isErrorNamed(error, TRANSCRIPT_ERROR_NAMES.videoUnavailable) ||
    isErrorNamed(error, TRANSCRIPT_ERROR_NAMES.invalidVideoId)
  ) {
    return diagnosticForReason("video_unavailable", lang);
  }

  if (isLikelyNetworkOrUpstreamError(error)) {
    return diagnosticForReason("network_or_upstream_error", lang);
  }

  return {
    reasonCode: "fetch_failed",
    lang,
    message: `Transcript fetch failed for lang "${lang}" with an unexpected provider error.`,
    nextAction: "Retry later, or try another video/language if the failure persists.",
    rawErrorExcerpt: sanitizeRawErrorExcerpt(error),
  };
}

export async function getTranscriptWithDiagnostics(
  videoId: string,
  options: TranscriptOptions = {},
): Promise<TranscriptWithDiagnosticsResult> {
  const lang = options.lang ?? DEFAULT_LANG;
  const format = options.format ?? "key_segments";
  const transcriptFetcher: TranscriptFetcher = options.fetcher ?? fetchTranscript;

  try {
    const raw = await transcriptFetcher(videoId, { lang });
    const segments: TranscriptSegment[] = raw.map((item) => ({
      offset: item.offset,
      duration: item.duration,
      text: item.text,
    }));

    if (segments.length === 0) {
      return {
        transcript: null,
        diagnostic: diagnosticForReason("empty_transcript", lang),
      };
    }

    return {
      transcript: toTranscriptResult(segments, format),
    };
  } catch (error) {
    return {
      transcript: null,
      diagnostic: diagnosticFromError(error, lang),
    };
  }
}

export async function getTranscript(
  videoId: string,
  options: { lang?: string; format?: TranscriptFormat } = {},
): Promise<TranscriptResult | null> {
  const result = await getTranscriptWithDiagnostics(videoId, options);
  return result.transcript;
}

export const __testing = {
  extractHook,
  extractOutro,
  segmentStartSeconds,
  sanitizeRawErrorExcerpt,
};
