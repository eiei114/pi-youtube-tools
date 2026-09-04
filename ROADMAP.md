# Roadmap

Maintenance roadmap for **pi-youtube-tools** — a native Pi extension that registers
YouTube Data API v3 tools (`youtube_search`, `youtube_video_details`,
`youtube_transcript`) plus `/youtube:login`, `/youtube:status`, and
`/youtube:logout` slash commands. No MCP daemon.

This file is maintainer-facing context. It is **not** shipped in the npm tarball
(see `package.json` `files`). Its job is to give the weekly maintenance seed
planner a bounded list of next micro-tasks without re-discovering project state
each run.

Status snapshot: **2026-W36**. Update this file whenever a release ships or a
seed is completed.

---

## Current release status

| Item | Value |
|---|---|
| npm package | [`pi-youtube-tools`](https://www.npmjs.com/package/pi-youtube-tools) |
| Latest version | **0.1.7** (published 2026-08-25) |
| Git tag | [`v0.1.7`](https://github.com/eiei114/pi-youtube-tools/releases/tag/v0.1.7) |
| Tools | `youtube_search`, `youtube_video_details`, `youtube_transcript` |
| Commands | `/youtube:login`, `/youtube:status`, `/youtube:logout` |
| Auth | `YOUTUBE_API_KEY` env var → stored key (`~/.pi/agent/pi-youtube-tools-auth.json`, mode 600) |
| Transcript dep | `youtube-transcript-plus` ^1.1.2 (installed 1.2.0) |
| Node runtime | `engines.node` **>= 20** (declared in 0.1.x) |
| CI | Node 22, `npm run ci` = typecheck + `node --test` + `npm pack --dry-run` |
| Publishing | npm Trusted Publishing (OIDC), `auto-release.yml` → `publish.yml`, no `NPM_TOKEN` |
| Dependency hygiene | Dependabot weekly (npm + github-actions), grouped minor/patch |

### Recent releases

- **0.1.7** (2026-08-25) — transcript unavailable diagnostics with bounded reason codes, attempted language, and next-action hints.
- **0.1.6** (2026-08-22) — managed OSS dependency and maintenance PR batch.
- **0.1.5** (2026-08-04) — patch bump for Discord release webhook verification.
- **0.1.4** (2026-07-20) — reconciled CHANGELOG history; added this `ROADMAP.md`.
- **0.1.3** (2026-07-04) — sponsor funding links (Buy Me a Coffee + GitHub FUNDING.yml).

---

## Priorities (north star)

1. **Stay lean and correct.** Three tools, predictable output, no daemon. Every
   change must keep `npm run ci` green and the tarball intentional.
2. **Agent-context-friendly output.** Caps and truncation exist to protect the
   LLM context window and Pi TUI/clipboard limits. Do not regress them.
3. **Safe, local auth.** The API key never reaches the model. Keep the
   env-var → stored-file precedence and the secret-safe status command.
4. **Low-friction maintenance.** Dependabot + Trusted Publishing + the
   `version:check` PR guard should keep the release pipeline self-service.

## Short-term goals (next 1–2 releases)

- **0.1.x patch** — close remaining docs and observability gaps that need no
  behavior change for users: troubleshooting guide, API-key source in status,
  formatter snapshot tests. Ship as one patch release if bundled.
- **0.2.0 minor** — resilience: request timeouts/AbortController on every
  outbound fetch, and adoption of `youtube-transcript-plus` v2 (retry with
  exponential backoff). Minor bump because transcript behavior may shift and
  the dependency floor is already Node >= 20.
- **Ongoing** — keep Dependabot PRs unblocked each week; the only open major
  bump is **PR #48** (`youtube-transcript-plus` 2.0.1).

---

## Known technical debt

Concrete items found while refreshing this roadmap. Each is small and verifiable.
Items marked **done** were shipped between 2026-W29 and 2026-W36.

| ID | Area | Debt | Risk | Status |
|---|---|---|---|---|
| TD-1 | docs | `CHANGELOG.md` release history out of sync | Release history reads wrong | **done** (0.1.4) |
| TD-2 | errors | `InvalidVideoInputError` unused / plain `Error` thrown | Inconsistent error typing | **done** |
| TD-3 | video-id | Missing `live/`, `m.`, `music.` URL shapes | Live/mobile links fail to parse | **done** |
| TD-4 | formatting | Raw ISO 8601 durations in tool output | Output shows `PT10M30S` | **done** (0.1.x) |
| TD-5 | resilience | `youtube-api.ts` and `lib/transcript.ts` have no request timeout / AbortController | Hung upstream stalls the tool | open |
| TD-6 | tests | No `tests/transcript.test.mjs` | Hook/outro regressions land silently | **done** |
| TD-7 | metadata | No `engines.node` in `package.json` | Runtime floor undocumented | **done** (0.1.x) |
| TD-8 | deps | `youtube-transcript-plus` 1.x → 2.x (Dependabot **PR #48**) | Misses upstream retry/backoff | open |
| TD-9 | docs | No `docs/troubleshooting.md` for 403/quota/caption failures | Users and agents lack failure playbooks | open |
| TD-10 | observability | `/youtube:status` does not report key `source` (`environment` vs `stored`) | Debugging auth precedence is guesswork | open |
| TD-11 | tests | No formatter snapshot tests for truncation markers | Output-shape regressions hard to spot | open |
| TD-12 | docs | No end-to-end "compare three videos" example in `docs/examples.md` | Onboarding gap for multi-tool workflows | open |

### Open dependency PRs (as of 2026-W36)

- **#48** `youtube-transcript-plus` 1.2.0 → **2.0.1** (major). Needs validation + minor bump to 0.2.0.

---

## Improvement areas

- **Resilience** — timeouts + retry on both API and transcript paths (blocks 0.2.0).
- **Docs** — `docs/troubleshooting.md`; a short "add a new tool" section in `CONTRIBUTING.md`.
- **Examples** — one end-to-end example combining all three tools in `docs/examples.md`.
- **Tests** — formatter snapshot tests so truncation markers stay stable.
- **Observability** — surface API key `source` in `/youtube:status` without exposing the secret.

---

## Candidate maintenance seeds

Each seed is bounded to **30–90 minutes**, has explicit acceptance criteria, and
maps to a real item above. The weekly seed planner can promote any of these into
a backlog issue. Seeds are independent unless noted.

> Convention: a seed is **done** when `npm run ci` is green, the change is behind
> a PR, and the acceptance bullets below are satisfied. No seed here requires a
> production action or a manual npm publish — those stay human-owned.

### S-11 · Add request timeouts (AbortController) to `youtube-api.ts`  *(code+tests, ~60–90 min)*

**Fixes:** TD-5 (API side)

**Why:** A stalled YouTube Data API response currently hangs the tool indefinitely. Agents waiting on a tool call have no feedback and may retry, wasting quota.

- Add a configurable `requestTimeoutMs` (default ~15s) to `YoutubeApiOptions` and `youtubeGet`, implemented with `AbortController` + `AbortSignal.timeout`.
- Translate `AbortError`/timeout into a clear `YoutubeApiError` message ("YouTube API request timed out after Nms").
- Add a test that an artificially stalled `fetchFn` rejects with the timeout error.

**Acceptance:**
- [ ] A stalled fetch fails fast with a readable timeout error instead of hanging.
- [ ] Existing API tests still pass; `npm run ci` green.

---

### S-12 · Bump `youtube-transcript-plus` to v2.0.1 and adopt resilience  *(deps+code+tests, ~60–90 min)*

**Fixes:** TD-5 (transcript side), TD-8. **Depends on:** PR #48.

**Why:** v2 adds retry with exponential backoff and AbortController support. Staying on 1.x means transcript fetches miss upstream reliability fixes and blocks the 0.2.0 resilience release theme.

- Rebase/merge Dependabot **#48**, then validate `lib/transcript.ts` against the v2 API.
- Adopt v2 retry/backoff and pass through a timeout consistent with **S-11**.
- Evaluate the optional `videoDetails` option (decide whether to surface it or keep tool boundaries clean).
- Bump `pi-youtube-tools` **minor** (0.1.7 → 0.2.0), update `CHANGELOG.md`, note the Node >= 20 requirement.

**Acceptance:**
- [ ] `youtube-transcript-plus@2.x` in `package-lock.json`; `npm run ci` green.
- [ ] Transcript fetches retry on transient errors and time out cleanly.
- [ ] Version bump is minor, `CHANGELOG.md` updated, `version:check` passes.

---

### S-13 · Troubleshooting doc for common failures  *(docs, ~45–60 min)*

**Fixes:** TD-9

**Why:** Transcript diagnostics (0.1.7) improved runtime feedback, but there is no standalone doc agents or users can reference for 403/quota/caption failures and auth precedence.

- Add `docs/troubleshooting.md` covering: missing API key, 403/quota, disabled YouTube Data API v3, transcript unavailable, and the env-var-vs-stored-key precedence.
- Link it from `README.md` and `docs/examples.md`.

**Acceptance:**
- [ ] `docs/troubleshooting.md` exists and is linked from README.
- [ ] Covers the four failure cases above; `npm run ci` green.

---

### S-14 · Show API key source in `/youtube:status`  *(code+tests, ~30–45 min)*

**Fixes:** TD-10

**Why:** When both env var and stored key exist, only the env var is used — but status today does not say which source is active, making auth debugging slower for maintainers and agents.

- Extend the status command output to include `source: "environment" | "stored" | "none"` without exposing the key value.
- Add or extend `tests/auth-status.test.mjs` for each source case.

**Acceptance:**
- [ ] Status output includes source when configured; never prints the key.
- [ ] `npm run ci` green.

---

### S-15 · Formatter snapshot tests for truncation markers  *(tests, ~30–45 min)*

**Fixes:** TD-11

**Why:** Output caps and `[truncated N chars]` markers are core to the agent-context contract. A regression in `formatters.ts` is easy to miss without snapshot-style assertions.

- Add snapshot or golden-string tests in `tests/formatters.test.mjs` for `formatSearchMap`, `formatVideoDetailsMap`, and transcript formatting at boundary lengths.
- Cover the truncation marker format explicitly.

**Acceptance:**
- [ ] Tests fail if truncation marker format or cap behavior changes unexpectedly.
- [ ] `npm run ci` green; no change to shipped formatter behavior.

---

### S-16 · End-to-end "compare three videos" example  *(docs, ~30–45 min)*

**Fixes:** TD-12

**Why:** `docs/examples.md` has per-tool snippets but no single walkthrough showing search → details → transcript on multiple videos — the most common research pattern.

- Add a "Compare three videos" section that chains `youtube_search` → `youtube_video_details` → `youtube_transcript`.
- Show the natural-language prompt and the expected tool sequence with sample truncated output.

**Acceptance:**
- [ ] New example section present and internally consistent with shipped parameters.
- [ ] `npm run ci` green.

---

## How to use this roadmap

- **Weekly seed planner:** pick the next undone `S-NN` whose dependencies are met
  and whose risk fits the week. Promote it to a backlog issue with the
  acceptance criteria copied in.
- **When a release ships:** update **Current release status**, move the shipped
  seeds under their version in `CHANGELOG.md`, and mark the seed row here.
- **When debt is found:** add a `TD-NN` row and, if it is 30–90 min of work, a
  matching `S-NN` seed with acceptance criteria.
- **Out of scope for AI agents:** release/publish, secrets, billing, permissions,
  and production actions stay human-owned (per the project charter).
