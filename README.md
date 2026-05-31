# PACKAGE_DISPLAY_NAME

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)
[![Publish](https://github.com/OWNER/REPO/actions/workflows/publish.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/PACKAGE_NAME.svg)](https://www.npmjs.com/package/PACKAGE_NAME)
[![npm downloads](https://img.shields.io/npm/dm/PACKAGE_NAME.svg)](https://www.npmjs.com/package/PACKAGE_NAME)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Pi package](https://img.shields.io/badge/pi-package-purple.svg)](https://pi.dev/packages)
[![Trusted Publishing](https://img.shields.io/badge/npm-Trusted%20Publishing-blue.svg)](docs/release.md)

> One-line pitch for this TypeScript-first Pi package.

## What this is

Briefly explain what this TypeScript-first package adds to Pi and who should use it.

## Features

- Feature 1
- Feature 2
- Feature 3

## Install

```bash
pi install npm:PACKAGE_NAME
```

Or install from GitHub:

```bash
pi install git:github.com/OWNER/REPO
```

## Quick start

Try this package locally:

```bash
pi -e .
```

Then run:

```txt
/your-command
```

## Package contents

| Path | Purpose |
|---|---|
| `extensions/` | Pi TypeScript extension entrypoints (`*.ts` and `index.ts`) |
| `lib/` | Shared TypeScript helpers |
| `skills/` | Agent Skills |
| `prompts/` | Prompt templates |
| `themes/` | Pi themes |
| `docs/` | Release and setup docs |

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

For vulnerability reporting, see [`SECURITY.md`](SECURITY.md).

## Links

- npm: https://www.npmjs.com/package/PACKAGE_NAME
- GitHub: https://github.com/OWNER/REPO
- Issues: https://github.com/OWNER/REPO/issues

## License

MIT
