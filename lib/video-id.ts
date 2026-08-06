import { InvalidVideoInputError } from "./errors.ts";

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

const URL_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:[^&]*&)*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
];

export function extractVideoId(input: string): string | undefined {
  const trimmed = input.trim();
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed;

  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

export function requireVideoId(input: string): string {
  const videoId = extractVideoId(input);
  if (!videoId) {
    throw new InvalidVideoInputError(input);
  }
  return videoId;
}

export function resolveVideoIds(inputs: string[]): string[] {
  return [...new Set(inputs.map((input) => requireVideoId(input)))];
}
