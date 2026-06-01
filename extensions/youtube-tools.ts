import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { StringEnum } from "../lib/schema.ts";
import { searchVideos, getVideoDetails } from "../lib/youtube-api.ts";
import { getTranscript, type TranscriptFormat } from "../lib/transcript.ts";
import { extractVideoId, resolveVideoIds } from "../lib/video-id.ts";
import {
  formatSearchResults,
  formatToolError,
  formatTranscriptMap,
  formatVideoDetailsMap,
  formatDescription,
} from "../lib/formatters.ts";

function toolText(text: string, details: Record<string, unknown> = {}) {
  return { content: [{ type: "text" as const, text }], details };
}

function toolError(error: unknown) {
  const message = formatToolError(error);
  return toolText(message, { error: message });
}

export function registerYoutubeTools(pi: ExtensionAPI) {
  pi.registerTool({
    name: "youtube_search",
    label: "YouTube Search",
    description:
      "Search YouTube videos by query using YouTube Data API v3. Returns videoId, title, channel, and snippet for gameplay or topic research.",
    promptSnippet: "Search YouTube videos by query and return lean video metadata",
    promptGuidelines: [
      "Use youtube_search when you need to discover YouTube videos by topic, game name, or keyword.",
      "Prefer youtube_search over web search for structured YouTube video discovery.",
      "Follow with youtube_video_details or youtube_transcript once you have a videoId.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search query, e.g. 'Roblox Hunty Zombie gameplay'." }),
      maxResults: Type.Optional(
        Type.Number({ default: 10, description: "Maximum results to return (1-25, default 10)." }),
      ),
      order: Type.Optional(
        StringEnum(["relevance", "date", "viewCount"], {
          default: "relevance",
          description: "Sort order for search results.",
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      try {
        const results = await searchVideos(params.query, {
          maxResults: params.maxResults,
          order: params.order,
        });
        const text = formatSearchResults(params.query, results);
        return toolText(text, { query: params.query, count: results.length, results });
      } catch (error) {
        return toolError(error);
      }
    },
  });

  pi.registerTool({
    name: "youtube_video_details",
    label: "YouTube Video Details",
    description:
      "Get structured metadata and statistics for one or more YouTube videos by videoId or URL.",
    promptSnippet: "Get YouTube video metadata, stats, and optional description",
    promptGuidelines: [
      "Use youtube_video_details after youtube_search or when the user provides a YouTube URL/videoId.",
      "Set includeDescription=true only when a longer description is needed; it increases token usage.",
    ],
    parameters: Type.Object({
      videoId: Type.Optional(
        Type.String({ description: "Single YouTube video ID or URL." }),
      ),
      videoIds: Type.Optional(
        Type.Array(Type.String(), {
          description: "Multiple YouTube video IDs or URLs (max 10).",
          maxItems: 10,
        }),
      ),
      includeDescription: Type.Optional(
        Type.Boolean({
          default: false,
          description: "Include truncated description text (up to 500 chars per video).",
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      try {
        const inputs = [
          ...(params.videoId ? [params.videoId] : []),
          ...(params.videoIds ?? []),
        ];
        if (inputs.length === 0) {
          return toolText("Provide videoId or videoIds.", { error: "missing_input" });
        }

        const ids = resolveVideoIds(inputs);
        const raw = await getVideoDetails(ids, {
          includeDescription: params.includeDescription === true,
        });

        const details = Object.fromEntries(
          Object.entries(raw).map(([id, item]) => {
            if (!item) return [id, null];
            const description = formatDescription(item.description, params.includeDescription === true);
            return [
              id,
              description === undefined ? { ...item, description: undefined } : { ...item, description },
            ];
          }),
        );

        const text = formatVideoDetailsMap(details);
        return toolText(text, { count: ids.length, details });
      } catch (error) {
        return toolError(error);
      }
    },
  });

  pi.registerTool({
    name: "youtube_transcript",
    label: "YouTube Transcript",
    description:
      "Fetch a YouTube transcript by videoId or URL. Defaults to intro hook + outro segments to save tokens.",
    promptSnippet: "Fetch YouTube transcript segments for a video",
    promptGuidelines: [
      "Use youtube_transcript when you need spoken content from a specific YouTube video.",
      "Default format key_segments returns hook/outro only; use full_text when the entire transcript is required.",
      "Transcript availability depends on captions; unavailable videos return transcript unavailable.",
    ],
    parameters: Type.Object({
      videoId: Type.Optional(
        Type.String({ description: "Single YouTube video ID or URL." }),
      ),
      videoIds: Type.Optional(
        Type.Array(Type.String(), {
          description: "Multiple YouTube video IDs or URLs (max 5).",
          maxItems: 5,
        }),
      ),
      lang: Type.Optional(
        Type.String({ default: "en", description: "Caption language code, e.g. en, ja." }),
      ),
      format: Type.Optional(
        StringEnum(["key_segments", "full_text"], {
          default: "key_segments",
          description: "key_segments returns hook/outro; full_text returns the entire transcript.",
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      try {
        const inputs = [
          ...(params.videoId ? [params.videoId] : []),
          ...(params.videoIds ?? []),
        ];
        if (inputs.length === 0) {
          return toolText("Provide videoId or videoIds.", { error: "missing_input" });
        }

        const ids = inputs.map((input) => {
          const id = extractVideoId(input);
          if (!id) throw new Error(`Could not parse YouTube video ID from: ${input}`);
          return id;
        });
        const uniqueIds = [...new Set(ids)];
        const format = (params.format ?? "key_segments") as TranscriptFormat;
        const lang = params.lang ?? "en";

        const entries = await Promise.all(
          uniqueIds.map(async (id) => [id, await getTranscript(id, { lang, format })] as const),
        );
        const transcripts = Object.fromEntries(entries);
        const text = formatTranscriptMap(transcripts);
        return toolText(text, { count: uniqueIds.length, transcripts });
      } catch (error) {
        return toolError(error);
      }
    },
  });
}
