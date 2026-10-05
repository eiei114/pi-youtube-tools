# Roadmap

Maintenance roadmap for **pi-youtube-tools** — a native Pi extension that registers
YouTube Data API v3 tools (`youtube_search`, `youtube_video_details`,
`youtube_transcript`) plus `/youtube:login`, `/youtube:status`, and
`/youtube:logout` slash commands. No MCP daemon.

This file is maintainer-facing context. It is **not** shipped in the npm tarball
(see `package.json` `files`). Its job is to give the weekly maintenance seed
planner a bounded list of next micro-tasks without re-discovering project state
each run.

Status snapshot: **2026-W41**. Updated after the 0.1.13 release and the
completion of the timeout, transcript dependency, auth-source, and examples
maintenance seeds.

---

## Current release status

| Item | Value |
|---|---|
| npm package | [`pi-youtube-tools`](https://www.npmjs.com/package/pi-youtube-tools) |
| Latest version | **0.1.13** (published 2026-09-30) |
| Git tag | [`v0.1.13`](https://github.com/eiei114/pi-youtube-tools/releases/tag/v0.1.13) |
| Tools | `youtube_search`, `youtube_video_details`, `youtube_transcript` |
| Commands | `/youtube:login`, `/youtube:status`, `/youtube:logout` |
| Auth | `YOUTUBE_API_KEY` env var → stored key (`~/.pi/agent/pi-youtube-tools-auth.json`, mode 600) |
| Transcript dep | `youtube-transcript-plus` ^2.0.1 (installed 2.0.1) |
| Node runtime | `engines.node` **>= 20** (declared in 0.1.x) |
| CI | Node 22, `npm run ci` = typecheck + `node --test` + `npm pack --dry-run` |
| Publishing | npm Trusted Publishing (OIDC), `auto-release.yml` → `publish.yml`, no `NPM_TOKEN` |
| Dependency hygiene | Dependabot weekly (npm + github-actions), grouped minor/patch |

### Recent releases

- **0.1.13** (2026-09-30) — Pi SDK dependency update to 0.99.1.
- **0.1.8–0.1.12** (2026-09-27) — periodic patch bumps after the npm publish interval guard.
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

- **0.1.x patch** — close the remaining documentation and formatter-test gaps:
  troubleshooting coverage and boundary assertions for output truncation.
- **0.2.0 follow-up** — resilience groundwork is now shipped: API request
  timeouts and `youtube-transcript-plus` v2.0.1 retry support are present. Keep
  validating edge cases before planning any behavior-changing minor release.
- **Ongoing** — keep Dependabot PRs and the release workflow unblocked each
  week; no known dependency migration is currently waiting in this roadmap.

---

## Known technical debt

Concrete items found while refreshing this roadmap. Each is small and verifiable.
Items marked **done** were shipped between 2026-W29 and 2026-W41.

| ID | Area | Debt | Risk | Status |
|---|---|---|---|---|
| TD-1 | docs | `CHANGELOG.md` release history out of sync | Release history reads wrong | **done** (0.1.4) |
| TD-2 | errors | `InvalidVideoInputError` unused / plain `Error` thrown | Inconsistent error typing | **done** |
| TD-3 | video-id | Missing `live/`, `m.`, `music.` URL shapes | Live/mobile links fail to parse | **done** |
| TD-4 | formatting | Raw ISO 8601 durations in tool output | Output shows `PT10M30S` | **done** (0.1.x) |
| TD-5 | resilience | `youtube-api.ts` and `lib/transcript.ts` have no request timeout / AbortController | Hung upstream stalls the tool | **done** (0.1.x) |
| TD-6 | tests | No `tests/transcript.test.mjs` | Hook/outro regressions land silently | **done** |
| TD-7 | metadata | No `engines.node` in `package.json` | Runtime floor undocumented | **done** (0.1.x) |
| TD-8 | deps | `youtube-transcript-plus` 1.x → 2.x (Dependabot **PR #48**) | Misses upstream retry/backoff | **done** (0.1.x) |
| TD-9 | docs | No `docs/troubleshooting.md` for 403/quota/caption failures | Users and agents lack failure playbooks | open |
| TD-10 | observability | `/youtube:status` does not report key `source` (`environment` vs `stored`) | Debugging auth precedence is guesswork | **done** (0.1.x) |
| TD-11 | tests | No formatter snapshot tests for truncation markers | Output-shape regressions hard to spot | open |
| TD-12 | docs | No end-to-end "compare three videos" example in `docs/examples.md` | Onboarding gap for multi-tool workflows | **done** (0.1.x) |

### Open dependency work (as of 2026-W41)

No dependency migration is currently tracked as open. The former Dependabot
**PR #48** migration to `youtube-transcript-plus` **2.0.1** is complete.

---

## Improvement areas

- **Resilience** — keep timeout and transcript retry behavior covered as upstream dependencies evolve.
- **Docs** — add `docs/troubleshooting.md`; consider a short "add a new tool" section in `CONTRIBUTING.md`.
- **Tests** — formatter snapshot tests so truncation markers stay stable.
- **Maintenance** — keep Dependabot, release guards, and the roadmap synchronized.

---

## Candidate maintenance seeds

Each seed is bounded to **30–90 minutes**, has explicit acceptance criteria, and
maps to a real item above. The weekly seed planner can promote any of these into
a backlog issue. Seeds are independent unless noted.

> Convention: a seed is **done** when `npm run ci` is green, the change is behind
> a PR, and the acceptance bullets below are satisfied. No seed here requires a
> production action or a manual npm publish — those stay human-owned.

### S-11 · Add request timeouts (AbortController) to `youtube-api.ts`  *(code+tests, ~60–90 min, **done**)*

**Fixes:** TD-5 (API side) — **done** in the 2026-W39 maintenance batch.

**Why:** A stalled YouTube Data API response currently hangs the tool indefinitely. Agents waiting on a tool call have no feedback and may retry, wasting quota.

- Add a configurable `requestTimeoutMs` (default ~15s) to `YoutubeApiOptions` and `youtubeGet`, implemented with `AbortController` + `AbortSignal.timeout`.
- Translate `AbortError`/timeout into a clear `YoutubeApiError` message ("YouTube API request timed out after Nms").
- Add a test that an artificially stalled `fetchFn` rejects with the timeout error.

**Acceptance:**
- [x] A stalled fetch fails fast with a readable timeout error instead of hanging.
- [x] Existing API tests still pass; `npm run ci` green.

---

### S-12 · Bump `youtube-transcript-plus` to v2.0.1 and adopt resilience  *(deps+code+tests, ~60–90 min, **done**)*

**Fixes:** TD-5 (transcript side), TD-8. **Depends on:** PR #48 — **done** in the 2026-W37 maintenance batch.

**Why:** v2 adds retry with exponential backoff and AbortController support. The dependency is now adopted; keep the retry and timeout behavior covered as the integration evolves.

- Rebase/merge Dependabot **#48**, then validate `lib/transcript.ts` against the v2 API.
- Adopt v2 retry/backoff and pass through a timeout consistent with **S-11**.
- Evaluate the optional `videoDetails` option (decide whether to surface it or keep tool boundaries clean).
- Validate the v2 integration, keep the Node >= 20 requirement documented, and update release notes when a behavior-changing minor release is planned.

**Acceptance:**
- [x] `youtube-transcript-plus@2.x` in `package-lock.json`; `npm run ci` green.
- [x] Transcript fetches retry on transient errors and time out cleanly.
- [x] Node >= 20 remains documented; release/version bookkeeping is current.

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

### S-14 · Show API key source in `/youtube:status`  *(code+tests, ~30–45 min, **done**)*

**Fixes:** TD-10

**Why:** When both env var and stored key exist, only the env var is used — but status today does not say which source is active, making auth debugging slower for maintainers and agents.

- Extend the status command output to include `source: "environment" | "stored" | "none"` without exposing the key value.
- Add or extend `tests/auth-status.test.mjs` for each source case.

**Acceptance:**
- [x] Status output includes source when configured; never prints the key.
- [x] `npm run ci` green.

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

### S-16 · End-to-end "compare three videos" example  *(docs, ~30–45 min, **done**)*

**Fixes:** TD-12

**Why:** `docs/examples.md` has per-tool snippets but no single walkthrough showing search → details → transcript on multiple videos — the most common research pattern.

- Add a "Compare three videos" section that chains `youtube_search` → `youtube_video_details` → `youtube_transcript`.
- Show the natural-language prompt and the expected tool sequence with sample truncated output.

**Acceptance:**
- [x] New example section present and internally consistent with shipped parameters.
- [x] `npm run ci` green.

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
