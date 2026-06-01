import { getYoutubeApiKey } from "./config.ts";
import { MissingApiKeyError, YoutubeApiError } from "./errors.ts";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface SearchVideoResult {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  descriptionSnippet: string | null;
}

export interface VideoDetails {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  duration: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  description?: string;
}

export interface YoutubeApiOptions {
  fetchFn?: typeof fetch;
  apiKey?: string;
}

export type SearchOrder = "relevance" | "date" | "viewCount";

function requireApiKey(override?: string): string {
  const key = override ?? getYoutubeApiKey();
  if (!key) throw new MissingApiKeyError();
  return key;
}

export function parseYouTubeNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function youtubeGet(
  path: string,
  params: Record<string, string>,
  options: YoutubeApiOptions = {},
): Promise<unknown> {
  const fetchFn = options.fetchFn ?? fetch;
  const apiKey = requireApiKey(options.apiKey);
  const url = new URL(`${YOUTUBE_API_BASE}${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("key", apiKey);

  const res = await fetchFn(url.toString());
  const data = (await res.json()) as {
    error?: { message?: string; errors?: Array<{ reason?: string }> };
  };

  if (!res.ok) {
    const message = data.error?.message ?? `YouTube API request failed (HTTP ${res.status})`;
    if (res.status === 403) {
      throw new YoutubeApiError(`${message} Check API key, enabled APIs, and quota.`, data.error);
    }
    throw new YoutubeApiError(message, data.error);
  }

  return data;
}

export async function searchVideos(
  query: string,
  options: {
    maxResults?: number;
    order?: SearchOrder;
    fetchFn?: typeof fetch;
    apiKey?: string;
  } = {},
): Promise<SearchVideoResult[]> {
  const maxResults = Math.min(Math.max(options.maxResults ?? 5, 1), 10);
  const data = (await youtubeGet(
    "/search",
    {
      part: "snippet",
      q: query,
      maxResults: String(maxResults),
      type: "video",
      order: options.order ?? "relevance",
    },
    { fetchFn: options.fetchFn, apiKey: options.apiKey },
  )) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        channelId?: string;
        channelTitle?: string;
        publishedAt?: string;
      };
    }>;
  };

  return (data.items ?? [])
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      videoId: item.id!.videoId!,
      title: item.snippet?.title ?? "",
      channelId: item.snippet?.channelId ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      publishedAt: item.snippet?.publishedAt ?? "",
      descriptionSnippet: item.snippet?.description ?? null,
    }));
}

export async function getVideoDetails(
  videoIds: string[],
  options: {
    includeDescription?: boolean;
    fetchFn?: typeof fetch;
    apiKey?: string;
  } = {},
): Promise<Record<string, VideoDetails | null>> {
  const uniqueIds = [...new Set(videoIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const data = (await youtubeGet(
    "/videos",
    {
      part: "snippet,statistics,contentDetails",
      id: uniqueIds.join(","),
    },
    { fetchFn: options.fetchFn, apiKey: options.apiKey },
  )) as {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
        channelId?: string;
        channelTitle?: string;
        publishedAt?: string;
      };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails?: { duration?: string };
    }>;
  };

  const byId = new Map<string, VideoDetails>();
  for (const item of data.items ?? []) {
    if (!item.id) continue;

    const details: VideoDetails = {
      id: item.id,
      title: item.snippet?.title ?? "",
      channelId: item.snippet?.channelId ?? "",
      channelTitle: item.snippet?.channelTitle ?? "",
      publishedAt: item.snippet?.publishedAt ?? "",
      duration: item.contentDetails?.duration ?? null,
      viewCount: parseYouTubeNumber(item.statistics?.viewCount),
      likeCount: parseYouTubeNumber(item.statistics?.likeCount),
      commentCount: parseYouTubeNumber(item.statistics?.commentCount),
    };

    if (options.includeDescription && item.snippet?.description) {
      details.description = item.snippet.description;
    }

    byId.set(item.id, details);
  }

  const result: Record<string, VideoDetails | null> = {};
  for (const id of uniqueIds) {
    result[id] = byId.get(id) ?? null;
  }
  return result;
}

export const __testing = {
  youtubeGet,
};
