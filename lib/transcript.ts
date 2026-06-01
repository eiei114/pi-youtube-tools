import { fetchTranscript } from "youtube-transcript-plus";

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

const HOOK_DURATION_SECONDS = 40;
const OUTRO_DURATION_SECONDS = 30;

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

export async function getTranscript(
  videoId: string,
  options: { lang?: string; format?: TranscriptFormat } = {},
): Promise<TranscriptResult | null> {
  const lang = options.lang ?? "en";
  const format = options.format ?? "key_segments";

  try {
    const raw = await fetchTranscript(videoId, { lang });
    const segments: TranscriptSegment[] = raw.map((item) => ({
      offset: item.offset,
      duration: item.duration,
      text: item.text,
    }));

    if (segments.length === 0) return null;

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
  } catch {
    return null;
  }
}

export const __testing = {
  extractHook,
  extractOutro,
  segmentStartSeconds,
};
