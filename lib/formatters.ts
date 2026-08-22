import type { SearchVideoResult, VideoDetails } from "./youtube-api.ts";
import type { TranscriptResult } from "./transcript.ts";

export const MAX_OUTPUT_CHARS = 12_000;
export const MAX_DESCRIPTION_CHARS = 300;
export const MAX_TRANSCRIPT_CHARS = 8_000;
export const MAX_TRANSCRIPT_SEGMENT_CHARS = 2_000;
const MAX_SEARCH_TITLE_CHARS = 120;
const MAX_SEARCH_CHANNEL_CHARS = 80;
const MAX_SEARCH_SNIPPET_CHARS = 120;
const TRUNCATION_MARKER_PATTERN = /\n\n\[truncated \d+ chars\]$/;

export function formatIso8601Duration(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2] && !match[3])) return undefined;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  if (hours > 0) {
    const parts = [`${hours}h`];
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(" ");
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function displayText(text: string): string {
  return decodeHtmlEntities(text);
}

function singleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncateInline(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function compactDisplayText(text: string, maxLength: number): string {
  return truncateInline(singleLine(displayText(text)), maxLength);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const markerMatch = text.match(TRUNCATION_MARKER_PATTERN);
  if (markerMatch) {
    const marker = markerMatch[0];
    const content = text.slice(0, -marker.length);
    const truncatedCount = Number(/\[truncated (\d+) chars\]$/.exec(marker)?.[1]);
    const expected = `${content.slice(0, maxLength)}\n\n[truncated ${truncatedCount} chars]`;
    if (content.length === maxLength && text === expected && Number.isFinite(truncatedCount)) {
      return text;
    }
    return `${content.slice(0, maxLength)}\n\n[truncated ${content.length - maxLength} chars]`;
  }
  return `${text.slice(0, maxLength)}\n\n[truncated ${text.length - maxLength} chars]`;
}

export function guardOutput(text: string, maxLength = MAX_OUTPUT_CHARS): string {
  return truncateText(text, maxLength);
}

export function formatDescription(description: string | undefined, include: boolean): string | undefined {
  if (!include || !description) return undefined;
  const decoded = displayText(description);
  if (decoded.length <= MAX_DESCRIPTION_CHARS) return decoded;
  return `${decoded.slice(0, MAX_DESCRIPTION_CHARS)}...`;
}

export function formatSearchResults(query: string, results: SearchVideoResult[]): string {
  if (results.length === 0) {
    return `YOUTUBE SEARCH\n\nQuery: ${query}\nResults: 0`;
  }

  const lines = [
    "YOUTUBE SEARCH",
    "",
    `Query: ${query}`,
    `Results: ${results.length}`,
    "",
  ];

  for (const [index, result] of results.entries()) {
    lines.push(`${index + 1}. ${compactDisplayText(result.title, MAX_SEARCH_TITLE_CHARS)}`);
    lines.push(`   videoId: ${result.videoId}`);
    lines.push(`   channel: ${compactDisplayText(result.channelTitle, MAX_SEARCH_CHANNEL_CHARS)} (${result.channelId})`);
    lines.push(`   published: ${result.publishedAt}`);
    if (result.descriptionSnippet) {
      lines.push(`   snippet: ${compactDisplayText(result.descriptionSnippet, MAX_SEARCH_SNIPPET_CHARS)}`);
    }
    lines.push("");
  }

  return guardOutput(lines.join("\n").trimEnd());
}

export function formatVideoDetailsMap(details: Record<string, VideoDetails | null>): string {
  const lines = ["YOUTUBE VIDEO DETAILS", ""];

  for (const [videoId, item] of Object.entries(details)) {
    lines.push(`## ${videoId}`);
    if (!item) {
      lines.push("not found");
      lines.push("");
      continue;
    }

    lines.push(`title: ${compactDisplayText(item.title, MAX_SEARCH_TITLE_CHARS)}`);
    lines.push(`channel: ${compactDisplayText(item.channelTitle, MAX_SEARCH_CHANNEL_CHARS)} (${item.channelId})`);
    lines.push(`published: ${item.publishedAt}`);
    const duration = formatIso8601Duration(item.duration) ?? "unknown";
    lines.push(`duration: ${duration}`);
    lines.push(`views: ${item.viewCount.toLocaleString("en-US")}`);
    lines.push(`likes: ${item.likeCount.toLocaleString("en-US")}`);
    lines.push(`comments: ${item.commentCount.toLocaleString("en-US")}`);
    if (item.description) {
      lines.push(`description: ${compactDisplayText(item.description, MAX_DESCRIPTION_CHARS)}`);
    }
    lines.push("");
  }

  return guardOutput(lines.join("\n").trimEnd());
}

export function formatTranscriptMap(
  transcripts: Record<string, TranscriptResult | null>,
): string {
  const lines = ["YOUTUBE TRANSCRIPTS", ""];

  for (const [videoId, transcript] of Object.entries(transcripts)) {
    lines.push(`## ${videoId}`);
    if (!transcript) {
      lines.push("transcript unavailable");
      lines.push("");
      continue;
    }

    if (transcript.format === "full_text") {
      lines.push("format: full_text");
      lines.push(truncateText(displayText(transcript.text ?? ""), MAX_TRANSCRIPT_CHARS));
    } else {
      lines.push("format: key_segments");
      lines.push("hook:");
      lines.push(truncateText(displayText(transcript.hook ?? ""), MAX_TRANSCRIPT_SEGMENT_CHARS));
      lines.push("");
      lines.push("outro:");
      lines.push(truncateText(displayText(transcript.outro ?? ""), MAX_TRANSCRIPT_SEGMENT_CHARS));
    }
    lines.push("");
  }

  return guardOutput(lines.join("\n").trimEnd());
}

export function formatToolError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function compactSearchResultDetails(results: SearchVideoResult[]): SearchVideoResult[] {
  return results.map((result) => ({
    ...result,
    title: compactDisplayText(result.title, MAX_SEARCH_TITLE_CHARS),
    channelTitle: compactDisplayText(result.channelTitle, MAX_SEARCH_CHANNEL_CHARS),
    descriptionSnippet: result.descriptionSnippet
      ? compactDisplayText(result.descriptionSnippet, MAX_SEARCH_SNIPPET_CHARS)
      : null,
  }));
}

export function compactVideoDetailsMap(
  details: Record<string, VideoDetails | null>,
): Record<string, VideoDetails | null> {
  return Object.fromEntries(
    Object.entries(details).map(([videoId, item]) => {
      if (!item) return [videoId, null];
      return [
        videoId,
        {
          ...item,
          title: compactDisplayText(item.title, MAX_SEARCH_TITLE_CHARS),
          channelTitle: compactDisplayText(item.channelTitle, MAX_SEARCH_CHANNEL_CHARS),
          duration: formatIso8601Duration(item.duration) ?? "unknown",
          description: item.description
            ? compactDisplayText(item.description, MAX_DESCRIPTION_CHARS)
            : undefined,
        },
      ];
    }),
  );
}

export function compactTranscriptDetails(
  transcripts: Record<string, TranscriptResult | null>,
): Record<string, TranscriptResult | null> {
  return Object.fromEntries(
    Object.entries(transcripts).map(([videoId, transcript]) => {
      if (!transcript) return [videoId, null];
      if (transcript.format === "full_text") {
        return [
          videoId,
          {
            ...transcript,
            text: truncateText(displayText(transcript.text ?? ""), MAX_TRANSCRIPT_CHARS),
          },
        ];
      }
      return [
        videoId,
        {
          ...transcript,
          hook: truncateText(displayText(transcript.hook ?? ""), MAX_TRANSCRIPT_SEGMENT_CHARS),
          outro: truncateText(displayText(transcript.outro ?? ""), MAX_TRANSCRIPT_SEGMENT_CHARS),
        },
      ];
    }),
  );
}
