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

**pi-youtube-tools** adds YouTube Data API tools directly to Pi via `registerTool()`. Install with `pi install`, set `YOUTUBE_API_KEY`, and search or inspect videos without running a separate MCP server process.

Use it when you want `@kirbah/mcp-youtube`-style capabilities inside Pi packages and skills, especially for game research and transcript workflows.

## Features

- `youtube_search` — search videos by query (planned)
- `youtube_video_details` — title, channel, stats, description (planned)
- `youtube_transcript` — fetch captions/transcript text (planned)
- `/youtube:status` — secret-safe API key configuration check
- LLM-friendly formatters with output size guards (planned)
- Optional bundled skill for gameplay video research (planned)

## Install

```bash
pi install npm:pi-youtube-tools
```

Or install from GitHub:

```bash
pi install git:github.com/eiei114/pi-youtube-tools
```

Set your API key:

```powershell
$env:YOUTUBE_API_KEY="your_google_api_key"
```

## Quick start

Try this package locally:

```bash
pi -e .
```

Then run:

```txt
/youtube:status
```

## Package contents

| Path | Purpose |
|---|---|
| `extensions/` | Pi TypeScript extension entrypoints |
| `lib/` | YouTube API client, config, formatters |
| `skills/` | Agent Skills (gameplay research, etc.) |
| `prompts/` | Prompt templates |
| `docs/` | Setup and release docs |

## Development

```bash
npm install
npm run ci
```

## Release

This package is set up for npm Trusted Publishing, so no `NPM_TOKEN` is required.

```bash
npm version patch
git push --follow-tags
```

See [`docs/release.md`](docs/release.md) for setup details.

## Template checklist

After creating a repository from this template, follow [`docs/template-checklist.md`](docs/template-checklist.md).

More docs:

- [`docs/typescript.md`](docs/typescript.md)
- [`docs/examples.md`](docs/examples.md)
- [`docs/github-template.md`](docs/github-template.md)
- [`docs/repository-settings.md`](docs/repository-settings.md)

## Security

Pi packages can execute code with your local permissions. Review extensions before installing third-party packages.

Never commit or log `YOUTUBE_API_KEY`. `/youtube:status` reports configured/missing only.

For vulnerability reporting, see [`SECURITY.md`](SECURITY.md).

## Links

- npm: https://www.npmjs.com/package/pi-youtube-tools
- GitHub: https://github.com/eiei114/pi-youtube-tools
- Issues: https://github.com/eiei114/pi-youtube-tools/issues
- Vault docs: `4_Project/pi-youtube-tools/` in obsidian-note

## License

MIT
