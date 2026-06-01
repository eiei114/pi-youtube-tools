# Changelog

All notable changes to this project will be documented in this file.

This project follows semantic versioning.

## [0.1.1] - 2026-06-01

### Fixed

- Reduced YouTube tool output volume so large search, details, and transcript responses are less likely to overflow Pi clipboard/TUI buffers.
- Capped default search breadth and returned compact tool details to keep agent context lean.

### Changed

- `youtube_search` now defaults to 5 results and caps requested results at 10.
- Transcript and description formatting now use stricter truncation limits.

## [0.1.0] - YYYY-MM-DD

### Added

- Initial Pi package template.
- Example extension, Agent Skill, prompt, and theme.
- CI and npm Trusted Publishing workflow.
