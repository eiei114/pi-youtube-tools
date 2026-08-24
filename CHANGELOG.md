# Changelog

All notable changes to this project will be documented in this file.

This project follows semantic versioning.

## Unreleased

## [0.1.7] - 2026-08-25

### Changed

- Added patch-level transcript unavailable diagnostics with bounded reason codes, attempted language, and next-action hints while preserving `transcripts[id] === null` fallbacks.

## [0.1.6] - 2026-08-22

### Changed

- Merge the 2026-08-22 managed OSS dependency and maintenance PR batch.

## [0.1.5] - 2026-08-04

### Changed

- Bump package version for the Discord release webhook verification.

## [0.1.4] - 2026-07-20

### Changed

- Reconciled CHANGELOG release history: dated `[0.1.3]` sponsor entry and `[0.1.0] - 2026-06-01`.
- Added `ROADMAP.md` for maintenance seeding and technical-debt tracking.

## [0.1.3] - 2026-07-04

### Changed

- Add Buy Me a Coffee sponsor button to README and native GitHub funding link via `.github/FUNDING.yml`.

## [0.1.2] - 2026-06-18

### Changed

- Rewrote README and public examples to match the shipped 3-tool native Pi extension.
- Documented API key precedence, slash commands, output guards, and the search → details → transcript workflow.
- Removed stale template and "planned" wording from user-facing docs.

## [0.1.1] - 2026-06-01

### Fixed

- Reduced YouTube tool output volume so large search, details, and transcript responses are less likely to overflow Pi clipboard/TUI buffers.
- Capped default search breadth and returned compact tool details to keep agent context lean.

### Changed

- `youtube_search` now defaults to 5 results and caps requested results at 10.
- Transcript and description formatting now use stricter truncation limits.

## [0.1.0] - 2026-06-01

### Added

- Initial Pi package template.
- Example extension, Agent Skill, prompt, and theme.
- CI and npm Trusted Publishing workflow.
