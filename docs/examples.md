# Examples

Workflow patterns for **pi-youtube-tools** inside Pi.

## Configure auth

```txt
/youtube:login
/youtube:status
```

`/youtube:status` reports whether a key is configured and which source is active — never the key itself:

```txt
YouTube API key: configured via pi-youtube-tools login. (source: stored)
```

Possible `source` values: `environment`, `stored`, or `none`.

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

## Compare three videos (end-to-end)

Use this when you need to pick the best video from a small set — search, compare metadata, then skim intro hooks.

**Natural-language prompt:**

```txt
Search YouTube for "TypeScript generics tutorial", pick the top three results, compare their view counts and durations, and summarize the intro hook from each transcript.
```

**Expected tool sequence:**

1. **`youtube_search`** — discover candidates (default 5 results; agent typically picks 3).

   ```json
   { "query": "TypeScript generics tutorial", "maxResults": 5, "order": "relevance" }
   ```

   Sample output shape:

   ```txt
   YOUTUBE SEARCH

   Query: TypeScript generics tutorial
   Results: 5

   1. TypeScript Generics Explained
      videoId: abc12345678
      channel: Dev Channel (UCxxxxxxxxxxx)
      published: 2025-06-01T12:00:00Z
      snippet: Learn generics with practical examples…
   ```

2. **`youtube_video_details`** — compare stats for three `videoId` values from search.

   ```json
   {
     "videoIds": ["abc12345678", "def98765432", "ghi11223344"],
     "includeDescription": false
   }
   ```

   Sample output shape:

   ```txt
   YOUTUBE VIDEO DETAILS

   ## abc12345678
   title: TypeScript Generics Explained
   channel: Dev Channel
   duration: 12:34
   views: 125000
   likes: 4200
   comments: 180
   ```

3. **`youtube_transcript`** — fetch hook/outro segments for the same three IDs (token-friendly default).

   ```json
   {
     "videoIds": ["abc12345678", "def98765432", "ghi11223344"],
     "lang": "en",
     "format": "key_segments"
   }
   ```

   Sample output shape:

   ```txt
   YOUTUBE TRANSCRIPTS

   ## abc12345678
   format: key_segments
   hook:
   In this video we'll cover TypeScript generics from first principles…

   outro:
   Thanks for watching — links in the description…
   ```

If a video has no captions, `details.transcripts[videoId]` is `null` and `details.transcriptDiagnostics[videoId]` explains why (for example `lang_not_available`) and what to try next.

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

If a transcript is unavailable, the tool still returns `details.transcripts[videoId]` as `null`. Check `details.transcriptDiagnostics[videoId]` for the attempted language, reason code, short message, and next action (for example: retry later, try another `lang`, or choose another video).

## Local development

Load the package from a checkout:

```bash
pi -e .
```

Then run `/youtube:login` and exercise the tools in a Pi session.
