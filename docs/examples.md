# Examples

Workflow patterns for **pi-youtube-tools** inside Pi.

## Configure auth

```txt
/youtube:login
/youtube:status
```

Or set `YOUTUBE_API_KEY` before starting Pi. Environment variables override stored keys.

## Search → details → transcript

Typical research flow:

1. Search for videos on a topic.
2. Pull metadata for promising `videoId` values.
3. Fetch transcript segments when spoken content matters.

Ask Pi in natural language, for example:

```txt
Search YouTube for "Roblox Hunty Zombie gameplay" and summarize the top results.
```

```txt
Get details for video dQw4w9WgXcQ, including the description.
```

```txt
Get the hook and outro transcript for https://www.youtube.com/watch?v=dQw4w9WgXcQ in English.
```

## Tool parameters (reference)

### `youtube_search`

- `query` — search text (required)
- `maxResults` — 1–10, default 5
- `order` — `relevance`, `date`, or `viewCount`

### `youtube_video_details`

- `videoId` or `videoIds` — ID or URL (required)
- `includeDescription` — include truncated description (default false)

### `youtube_transcript`

- `videoId` or `videoIds` — ID or URL (required)
- `lang` — caption language code, default `en`
- `format` — `key_segments` (default) or `full_text`

## Local development

Load the package from a checkout:

```bash
pi -e .
```

Then run `/youtube:login` and exercise the tools in a Pi session.
