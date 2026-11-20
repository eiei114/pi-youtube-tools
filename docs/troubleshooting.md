# Troubleshooting

## API key is missing

Run `/youtube:status` in Pi. It reports `source: none` when no key is available, without displaying a key. Add one with `/youtube:login` (enter it in Pi's API-key input prompt; the extension handles it locally and does not send it to the model), or set `YOUTUBE_API_KEY` in the environment that starts Pi. Restart Pi after changing that environment, then check `/youtube:status` again.

`YOUTUBE_API_KEY` takes precedence over the key stored by `/youtube:login`. The status command reports which source is active (`environment`, `stored`, or `none`), not whether that key is accepted by YouTube. `/youtube:logout` removes only the stored key; it does not unset `YOUTUBE_API_KEY`. If the environment variable is still set, it remains the active source after logout. To use the stored key instead, explicitly unset `YOUTUBE_API_KEY` in Pi's launch environment and restart Pi; changing it to another non-empty value will still take precedence.

## YouTube API returns 403

The API error includes `HTTP 403` and advises checking the key, enabled APIs, and quota. It does not identify which of those caused the response. First run `/youtube:status` and note the active source; an environment key can override a different stored key. Then, in Google Cloud Console for the project that owns that key, check that YouTube Data API v3 is enabled, the key's API and application restrictions allow this request, and the project has quota available. If quota is exhausted, wait for its reset or follow Google's quota-increase process.

`/youtube:status` only confirms that a key is configured; it does not validate the key, its restrictions, API access, or quota. Do not put a key in a prompt, issue, log, or chat. Never share its value when asking for help; share only the error status and non-secret diagnostic information.

## Transcript is unavailable

`youtube_transcript` returns `transcripts[videoId]: null` when no transcript is available and includes `transcriptDiagnostics[videoId]`. The text output shows the attempted `lang`, a reason, and a `next action`; the diagnostic may also include available languages. Use that output to choose the next step:

- `language_unavailable`: retry with one of the reported available caption languages.
- `captions_disabled_or_missing` or `empty_transcript`: try another language if appropriate, or choose another video.
- `video_unavailable`: verify the video ID or URL, then try another video if it is unavailable.
- `network_or_upstream_error`: retry later; if it persists, try another video.
- `fetch_failed`: retry, or try another language or video if it persists; the diagnostic may include a short raw error excerpt.

Caption availability is separate from API-key status. An unavailable transcript does not by itself mean the API key or YouTube Data API quota is the problem.
