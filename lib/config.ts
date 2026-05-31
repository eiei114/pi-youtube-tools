export function getYoutubeApiKey(): string | undefined {
  const value = process.env.YOUTUBE_API_KEY?.trim();
  return value ? value : undefined;
}

export function isYoutubeConfigured(): boolean {
  return Boolean(getYoutubeApiKey());
}
