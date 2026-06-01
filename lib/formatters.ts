import type { SearchVideoResult, VideoDetails } from "./youtube-api.ts";
import type { TranscriptResult } from "./transcript.ts";

export const MAX_OUTPUT_CHARS = 45_000;
export const MAX_DESCRIPTION_CHARS = 500;
export const MAX_TRANSCRIPT_CHARS = 12_000;

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

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
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
    lines.push(`${index + 1}. ${displayText(result.title)}`);
    lines.push(`   videoId: ${result.videoId}`);
    lines.push(`   channel: ${displayText(result.channelTitle)} (${result.channelId})`);
    lines.push(`   published: ${result.publishedAt}`);
    if (result.descriptionSnippet) {
      const snippet = truncateText(displayText(result.descriptionSnippet), 180);
      lines.push(`   snippet: ${snippet.replace(/\s+/g, " ")}`);
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

    lines.push(`title: ${displayText(item.title)}`);
    lines.push(`channel: ${displayText(item.channelTitle)} (${item.channelId})`);
    lines.push(`published: ${item.publishedAt}`);
    lines.push(`duration: ${item.duration ?? "unknown"}`);
    lines.push(`views: ${item.viewCount.toLocaleString("en-US")}`);
    lines.push(`likes: ${item.likeCount.toLocaleString("en-US")}`);
    lines.push(`comments: ${item.commentCount.toLocaleString("en-US")}`);
    if (item.description) {
      lines.push(`description: ${item.description}`);
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
      lines.push(truncateText(displayText(transcript.hook ?? ""), 4_000));
      lines.push("");
      lines.push("outro:");
      lines.push(truncateText(displayText(transcript.outro ?? ""), 4_000));
    }
    lines.push("");
  }

  return guardOutput(lines.join("\n").trimEnd());
}

export function formatToolError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
