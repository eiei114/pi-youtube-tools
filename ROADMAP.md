# Roadmap

Maintenance roadmap for **pi-youtube-tools** — a native Pi extension that registers
YouTube Data API v3 tools (`youtube_search`, `youtube_video_details`,
`youtube_transcript`) plus `/youtube:login`, `/youtube:status`, and
`/youtube:logout` slash commands. No MCP daemon.

This file is maintainer-facing context. It is **not** shipped in the npm tarball
(see `package.json` `files`). Its job is to give the weekly maintenance seed
planner a bounded list of next micro-tasks without re-discovering project state
each run.

Status snapshot: **2026-W29**. Update this file whenever a release ships or a
seed is completed.

---

## Current release status

| Item | Value |
|---|---|
| npm package | [`pi-youtube-tools`](https://www.npmjs.com/package/pi-youtube-tools) |
| Latest version | **0.1.3** (published 2026-07-04) |
| Git tag | [`v0.1.3`](https://github.com/eiei114/pi-youtube-tools/releases/tag/v0.1.3) |
| Tools | `youtube_search`, `youtube_video_details`, `youtube_transcript` |
| Commands | `/youtube:login`, `/youtube:status`, `/youtube:logout` |
| Auth | `YOUTUBE_API_KEY` env var → stored key (`~/.pi/agent/pi-youtube-tools-auth.json`, mode 600) |
| Transcript dep | `youtube-transcript-plus` ^1.1.2 (installed 1.2.0) |
| CI | Node 22, `npm run ci` = typecheck + `node --test` + `npm pack --dry-run` |
| Publishing | npm Trusted Publishing (OIDC), `auto-release.yml` → `publish.yml`, no `NPM_TOKEN` |
| Dependency hygiene | Dependabot weekly (npm + github-actions), grouped minor/patch |

### Recent releases

- **0.1.3** (2026-07-04) — sponsor funding links (Buy Me a Coffee + GitHub FUNDING.yml).
- **0.1.2** (2026-06-18) — README/examples rewrite to match shipped 3-tool behavior; API key precedence docs.
- **0.1.1** (2026-06-01) — output-size guards: search capped at 5 (max 10), stricter truncation.
- **0.1.0** (2026-06-01) — initial template + CI + Trusted Publishing.

> ⚠️ `CHANGELOG.md` is currently out of sync: the 0.1.3 sponsor entry is missing,
> the sponsor item still sits under `[Unreleased]`, and `[0.1.0]` still shows the
> `YYYY-MM-DD` placeholder. See seed **S-01**.

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

## Short-term goals (next 2–3 releases)

- **0.1.x patch** — close the cheap correctness gaps that need no behavior change
  for users: stale CHANGELOG, dead error class, video-id URL coverage,
  human-readable durations. Ship as one or two patch releases.
- **0.2.0 minor** — resilience: request timeouts/AbortController on every
  outbound fetch, and adoption of `youtube-transcript-plus` v2 (retry with
  exponential backoff). Minor bump because transcript behavior and the
  runtime requirement (Node >= 20) move.
- **Ongoing** — keep Dependabot PRs unblocked each week and keep test coverage
  ahead of the formatter/transcript logic that is easiest to regress.

---

## Known technical debt

Concrete items found while writing this roadmap. Each is small and verifiable.

| ID | Area | Debt | Risk |
|---|---|---|---|
| TD-1 | docs | `CHANGELOG.md` missing `[0.1.3]`, sponsor still under `[Unreleased]`, `[0.1.0]` date placeholder `YYYY-MM-DD` | Release history reads wrong to humans and the auto-release handoff |
| TD-2 | errors | `InvalidVideoInputError` is defined in `lib/errors.ts` but never thrown; `video-id.ts` `requireVideoId()` throws a plain `Error` | Dead code + inconsistent error typing for callers |
| TD-3 | video-id | `URL_PATTERNS` misses `youtube.com/live/` and `m.youtube.com` hosts | Live/VOD links and mobile URLs fail to parse |
| TD-4 | formatting | `contentDetails.duration` (ISO 8601, e.g. `PT10M30S`) is passed through raw | Output shows `PT10M30S` instead of `10:30` |
| TD-5 | resilience | `youtube-api.ts` and `lib/transcript.ts` have no request timeout / AbortController | A hung upstream stalls the tool with no error |
| TD-6 | tests | No `tests/transcript.test.mjs`; `transcript.ts` exports `__testing` (`extractHook`/`extractOutro`) but they are untested | Hook/outro boundary regressions land silently |
| TD-7 | metadata | `package.json` has no `engines.node`; CI runs Node 22, `youtube-transcript-plus` v2 will require Node >= 20 | Runtime floor is implicit/undocumented |
| TD-8 | deps | `youtube-transcript-plus` 1.x → 2.0.0 (Dependabot **PR #25**) is open but major-bump-cooldown-blocked; v2 adds retry/backoff, AbortController, optional `videoDetails` | Misses upstream reliability improvements |

### Open dependency PRs (as of 2026-W29)

- **#25** `youtube-transcript-plus` 1.2.0 → **2.0.0** (major; cooldown). Needs validation + minor bump.
- **#26** dev-deps group: `@earendil-works/pi-coding-agent` 0.80.6, `typebox` 1.3.6, `@types/node` 25.9.5.

---

## Improvement areas

- **Tests** — add `transcript.test.mjs`; consider formatter snapshots for the
  three `format*Map` outputs so truncation markers stay stable.
- **Docs** — a short "add a new tool" section in `CONTRIBUTING.md` and a
  `docs/troubleshooting.md` for the common 403/quota/caption cases.
- **Examples** — one end-to-end example combining all three tools in
  `docs/examples.md` (multi-video compare).
- **Resilience** — timeouts + retry on both API and transcript paths.
- **Observability** — surface the API key `source` (`environment` vs `stored`)
  in `/youtube:status` details without exposing the secret.

---

## Candidate maintenance seeds

Each seed is bounded to **30–90 minutes**, has explicit acceptance criteria, and
maps to a real item above. The weekly seed planner can promote any of these into
a backlog issue. Seeds are independent unless noted.

> Convention: a seed is **done** when `npm run ci` is green, the change is behind
> a PR, and the acceptance bullets below are satisfied. No seed here requires a
> production action or a manual npm publish — those stay human-owned.

### S-01 · Reconcile CHANGELOG.md with shipped releases  *(docs, ~30–45 min)*

**Fixes:** TD-1

- Move the sponsor entry out of `[Unreleased]` into a new `## [0.1.3] - 2026-07-04` section.
- Replace the `[0.1.0] - YYYY-MM-DD` placeholder with `2026-06-01`.
- Leave a clean, empty `## [Unreleased]` heading at the top.
- Keep `package.json` version unchanged (docs-only; not in the npm `files` list, so `version:check` allows it).

**Acceptance:**
- [ ] `CHANGELOG.md` has empty `[Unreleased]`, dated `[0.1.3]`, and `[0.1.0] - 2026-06-01`.
- [ ] `npm run version:check BASE_REF=origin/main` passes with no bump.

---

### S-02 · Throw `InvalidVideoInputError` from `requireVideoId`  *(code, ~30 min)*

**Fixes:** TD-2

- In `lib/video-id.ts`, make `requireVideoId()` throw `InvalidVideoInputError` (already exported from `lib/errors.ts`) instead of a plain `Error`.
- Update the one inline `throw new Error(...)` in `extensions/youtube-tools.ts` transcript path to use the same class, or let `requireVideoId` handle it.
- Verify `tests/video-id.test.mjs` still asserts the thrown type.

**Acceptance:**
- [ ] `instanceof InvalidVideoInputError` is true for unparseable input.
- [ ] `npm run ci` green; existing video-id tests updated and passing.

---

### S-03 · Parse more YouTube URL shapes in `video-id.ts`  *(code, ~30–45 min)*

**Fixes:** TD-3

- Extend `URL_PATTERNS` to cover `youtube.com/live/<id>`, `m.youtube.com/watch?v=`, and `music.youtube.com/watch?v=`.
- Add unit cases to `tests/video-id.test.mjs` for each new shape plus a negative case.

**Acceptance:**
- [ ] `extractVideoId("https://www.youtube.com/live/abc12345678")` returns the id.
- [ ] Mobile and music subdomains resolve; non-YouTube URLs return `undefined`.
- [ ] `npm run ci` green.

---

### S-04 · Human-readable video durations  *(code+tests, ~45–60 min)*

**Fixes:** TD-4

- Add `formatIso8601Duration("PT10M30S")` → `"10:30"` (or `"1h 2m"` for >= 1h) in `lib/formatters.ts`.
- Use it in `formatVideoDetailsMap` / `compactVideoDetailsMap` for the `duration` field, keeping the raw value out of the text output.
- Add cases to `tests/formatters.test.mjs` (PT0S, PT45S, PT10M, PT1H2M3S, malformed/`null`).

**Acceptance:**
- [ ] A `PT10M30S` duration renders as `10:30` in tool output.
- [ ] `null`/malformed durations render as `unknown`.
- [ ] `npm run ci` green.

---

### S-05 · Add `tests/transcript.test.mjs`  *(tests, ~45–60 min)*

**Fixes:** TD-6

- Cover `transcript.ts` `__testing` exports: `segmentStartSeconds`, `extractHook` (segments under/over the 40s hook window), and `extractOutro` (last-30s window on short and long segment lists).
- Add a `getTranscript` shape test using a stubbed `fetchTranscript` (dependency-inject or mock the module) for both `key_segments` and `full_text`.

**Acceptance:**
- [ ] New test file runs under `npm test` and covers hook/outro boundaries.
- [ ] No change to shipped transcript behavior.
- [ ] `npm run ci` green.

---

### S-06 · Add request timeouts (AbortController) to `youtube-api.ts`  *(code+tests, ~60–90 min)*

**Fixes:** TD-5 (API side)

- Add a configurable `requestTimeoutMs` (default ~15s) to `YoutubeApiOptions` and `youtubeGet`, implemented with `AbortController` + `AbortSignal.timeout`.
- Translate `AbortError`/timeout into a clear `YoutubeApiError` message ("YouTube API request timed out after Nms").
- Add a test that an artificially stalled `fetchFn` rejects with the timeout error.

**Acceptance:**
- [ ] A stalled fetch fails fast with a readable timeout error instead of hanging.
- [ ] Existing API tests still pass; `npm run ci` green.

---

### S-07 · Declare `engines.node` in `package.json`  *(metadata, ~30 min)*

**Fixes:** TD-7

- Add `"engines": { "node": ">=20" }` (aligns with CI Node 22 and the `youtube-transcript-plus` v2 floor).
- Optionally add an `engines-strict` note to `CONTRIBUTING.md`.

**Acceptance:**
- [ ] `package.json` declares the Node floor.
- [ ] `npm install` / `npm run ci` unaffected; `npm pack --dry-run` still clean.

---

### S-08 · Bump `youtube-transcript-plus` to v2.0.0 and adopt resilience  *(deps+code+tests, ~60–90 min)*

**Fixes:** TD-5 (transcript side), TD-8. **Depends on:** PR #25 unblocked (major cooldown).

- Rebase/merge Dependabot **#25**, then validate `lib/transcript.ts` against the v2 API.
- Adopt v2 retry/backoff and pass through an `AbortController`/timeout consistent with **S-06**.
- Evaluate the optional `videoDetails` option (decide whether to surface it or keep tool boundaries clean).
- Bump `pi-youtube-tools` **minor** (0.1.3 → 0.2.0), update `CHANGELOG.md`, note the Node >= 20 requirement.

**Acceptance:**
- [ ] `youtube-transcript-plus@2.x` in `package-lock.json`; `npm run ci` green.
- [ ] Transcript fetches retry on transient errors and time out cleanly.
- [ ] Version bump is minor, `CHANGELOG.md` updated, `version:check` passes.

---

### S-09 · Troubleshooting doc for common failures  *(docs, ~45–60 min)*

**Improvement area:** Docs

- Add `docs/troubleshooting.md` covering: missing API key, 403/quota, disabled YouTube Data API v3, transcript unavailable, and the env-var-vs-stored-key precedence.
- Link it from `README.md` and `docs/examples.md`.

**Acceptance:**
- [ ] `docs/troubleshooting.md` exists and is linked from README.
- [ ] Covers the four failure cases above; `npm run ci` green.

---

### S-10 · End-to-end example in `docs/examples.md`  *(docs, ~30–45 min)*

**Improvement area:** Examples

- Add a single "compare three videos" walkthrough that chains `youtube_search` → `youtube_video_details` → `youtube_transcript`.
- Show the natural-language prompt and the expected tool sequence.

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
