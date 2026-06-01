export class MissingApiKeyError extends Error {
  constructor() {
    super("YOUTUBE_API_KEY is not configured. Set the env var and run /youtube:status.");
    this.name = "MissingApiKeyError";
  }
}

export class YoutubeApiError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "YoutubeApiError";
    this.cause = cause;
  }
}

export class InvalidVideoInputError extends Error {
  constructor(input: string) {
    super(`Could not parse YouTube video ID from: ${input}`);
    this.name = "InvalidVideoInputError";
  }
}
