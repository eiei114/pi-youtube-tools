# Release

This package uses npm Trusted Publishing with GitHub Actions OIDC.

Do not add `NPM_TOKEN` or long-lived npm tokens to GitHub Secrets.

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push or PR | Run `npm run ci` (typecheck, tests, pack dry-run) |
| `auto-release.yml` | Push to `main` when `package.json` changes | Create `v<version>` tag and GitHub release, then dispatch `publish.yml` |
| `publish.yml` | Version tag, GitHub release, or manual dispatch | Publish to npm with Trusted Publishing (OIDC) |

## One-time npm setup

On npmjs.com, configure Trusted Publishing for this package:

- Publisher: GitHub Actions
- Repository: this GitHub repository
- Workflow filename: `publish.yml`

## Publish

```bash
npm version patch
git push
```

On `main`, `.github/workflows/auto-release.yml` checks whether `package.json` version changed. If `v<version>` does not exist yet, it creates the tag, creates the GitHub Release, then explicitly dispatches `.github/workflows/publish.yml` for that tag.

The `v*.*.*` tag also triggers `.github/workflows/publish.yml`, which runs CI and publishes to npm when tags are pushed manually. Publishing also runs when a GitHub Release is published, and can be run manually from GitHub Actions with `workflow_dispatch`.

The workflow skips `name@version` if that exact package version already exists on npm.

## Verify tag → publish handoff

After merging a version bump to `main`:

1. Open **Actions → Auto Release** and confirm the run created `v<version>`.
2. Open **Actions → Publish to npm** and confirm a run started for the same tag (from the explicit dispatch or tag push).
3. Confirm npm shows the new version at `https://www.npmjs.com/package/pi-youtube-tools`.

## GitHub Actions requirements

- `permissions: id-token: write` on `publish.yml`
- `permissions: actions: write` on `auto-release.yml` so it can dispatch `publish.yml`
- GitHub-hosted runner
- Node.js 24, so the publish job uses a current npm CLI for Trusted Publishing
- No `NPM_TOKEN`
- `npm publish` from the configured workflow file

## First release checklist

- [ ] `package.json` name is final
- [ ] `repository.url` points to the real GitHub repository
- [ ] npm Trusted Publisher is configured
- [ ] `npm run ci` passes
- [ ] `npm pack --dry-run` contains only intended files
- [ ] `CHANGELOG.md` has the release date
