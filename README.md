# Pi YouTube Tools

[![CI](https://github.com/eiei114/pi-youtube-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/eiei114/pi-youtube-tools/actions/workflows/ci.yml)
[![Publish](https://github.com/eiei114/pi-youtube-tools/actions/workflows/publish.yml/badge.svg)](https://github.com/eiei114/pi-youtube-tools/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/pi-youtube-tools.svg)](https://www.npmjs.com/package/pi-youtube-tools)
[![npm downloads](https://img.shields.io/npm/dm/pi-youtube-tools.svg)](https://www.npmjs.com/package/pi-youtube-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Pi package](https://img.shields.io/badge/pi-package-purple.svg)](https://pi.dev/packages)
[![Trusted Publishing](https://img.shields.io/badge/npm-Trusted%20Publishing-blue.svg)](docs/release.md)

> Native Pi tools for YouTube search, video metadata, and transcripts — no MCP daemon required.

## What this is

**pi-youtube-tools** is a native Pi extension that registers three YouTube tools via `registerTool()`. Install with `pi install`, configure an API key, and search or inspect videos without running a separate MCP server process.

This package targets the same workflows as external YouTube MCP servers, but ships as a Pi package: tools load in-process, auth stays local, and output is formatted for agent context limits.

## Tools

| Tool | Purpose |
|---|---|
| `youtube_search` | Search videos by query (default 5 results, max 10) |
| `youtube_video_details` | Title, channel, stats, optional truncated description |
| `youtube_transcript` | Fetch captions as hook/outro segments or capped full text |

### Slash commands

| Command | Purpose |
|---|---|
| `/youtube:login` | Enter and store a YouTube Data API key via Pi UI |
| `/youtube:status` | Secret-safe check of whether an API key is configured |
| `/youtube:logout` | Remove the stored API key (does not unset `YOUTUBE_API_KEY`) |

## Install

```bash
pi install npm:pi-youtube-tools
```

Or install from GitHub:

```bash
pi install git:github.com/eiei114/pi-youtube-tools
```

## API key setup

You need a [YouTube Data API v3](https://developers.google.com/youtube/v3) key.

**Auth precedence** (first match wins):

1. `YOUTUBE_API_KEY` environment variable
2. Key stored by `/youtube:login` in `~/.pi/agent/pi-youtube-tools-auth.json` (mode 600)

Configure with either method:

```txt
/youtube:login
```

```powershell
$env:YOUTUBE_API_KEY="your_google_api_key"
```

Check configuration:

```txt
/youtube:status
```

`/youtube:status` reports configured or missing only — it never prints the key. `/youtube:logout` clears the stored file; an environment variable still takes precedence on the next run.

## Typical workflow

1. **Discover** — `youtube_search` with a topic or game name.
2. **Inspect** — `youtube_video_details` for one or more `videoId` values from search results.
3. **Read captions** — `youtube_transcript` when spoken content matters.

`youtube_transcript` defaults to `key_segments` (intro hook + outro) to save tokens. Use `format: full_text` only when you need more of the transcript.

See [`docs/examples.md`](docs/examples.md) for copy-paste examples.

## Output guards

Tool responses are formatted for LLM context and Pi clipboard/TUI limits:

- Overall tool text is capped at **12,000** characters.
- Search results default to **5** items (max **10**); titles, channels, and snippets are compacted.
- Descriptions are truncated to **300** characters when `includeDescription` is true.
- Transcripts use **8,000** characters for full text or **2,000** per hook/outro segment.

Truncated sections end with a `[truncated N chars]` marker.

## Quick start (local)

```bash
pi -e .
```

```txt
/youtube:login
/youtube:status
```

Then ask Pi to search YouTube, fetch video details, or read a transcript.

## Package layout

| Path | Purpose |
|---|---|
| `extensions/` | Pi extension entrypoints and tool registration |
| `lib/` | YouTube API client, auth, formatters, transcript helpers |
| `docs/` | Setup, examples, and release docs |

## Development

```bash
npm install
npm run ci
```

## Release

This package uses npm Trusted Publishing (no `NPM_TOKEN` required).

```bash
npm version patch
git push
```

After merge to `main`, `auto-release.yml` creates the semver tag and GitHub release, then dispatches `publish.yml` for npm publication.

See [`docs/release.md`](docs/release.md) for setup details and how to verify the tag → publish handoff.

## Security

Pi packages can execute code with your local permissions. Review extensions before installing third-party packages.

Never commit or log `YOUTUBE_API_KEY`. `/youtube:login` stores keys locally and the extension UI handles the secret without sending it to the model.

For vulnerability reporting, see [`SECURITY.md`](SECURITY.md).

## Links

- npm: https://www.npmjs.com/package/pi-youtube-tools
- GitHub: https://github.com/eiei114/pi-youtube-tools
- Issues: https://github.com/eiei114/pi-youtube-tools/issues

## License

MIT
