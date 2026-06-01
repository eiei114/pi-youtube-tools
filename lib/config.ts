import { clearStoredApiKey, loadStoredApiKey, saveStoredApiKey } from "./auth-store.ts";

export type ApiKeySource = "environment" | "stored" | "missing";

export interface ResolvedApiKey {
  apiKey?: string;
  source: ApiKeySource;
}

export function resolveYoutubeApiKey(): ResolvedApiKey {
  const envValue = process.env.YOUTUBE_API_KEY?.trim();
  if (envValue) {
    return { apiKey: envValue, source: "environment" };
  }

  const storedValue = loadStoredApiKey();
  if (storedValue) {
    return { apiKey: storedValue, source: "stored" };
  }

  return { source: "missing" };
}

export function getYoutubeApiKey(): string | undefined {
  return resolveYoutubeApiKey().apiKey;
}

export function isYoutubeConfigured(): boolean {
  return Boolean(getYoutubeApiKey());
}

export function authStatusText(): string {
  const { source } = resolveYoutubeApiKey();
  if (source === "environment") {
    return "YouTube API key: configured via YOUTUBE_API_KEY environment variable.";
  }
  if (source === "stored") {
    return "YouTube API key: configured via pi-youtube-tools login.";
  }
  return "YouTube API key missing. Run /youtube:login or set YOUTUBE_API_KEY.";
}

export { saveStoredApiKey, clearStoredApiKey, loadStoredApiKey };
