import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");

test("package declares pi resources", () => {
  assert.deepEqual(packageJson.pi.extensions, ["./extensions"]);
  assert.equal(packageJson.pi.skills, undefined);
  assert.equal(packageJson.pi.prompts, undefined);
  assert.equal(packageJson.pi.themes, undefined);
});

test("package is discoverable as a Pi package", () => {
  assert.ok(packageJson.keywords.includes("pi-package"));
});

test("package uses public publish config", () => {
  assert.equal(packageJson.publishConfig.access, "public");
});

test("CHANGELOG documents the current package version", () => {
  const versionPattern = new RegExp(`^## \\[${packageJson.version.replace(/\./g, "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}`, "m");
  assert.match(changelog, versionPattern, `CHANGELOG.md must include a dated section for version ${packageJson.version}`);
});

test("CHANGELOG has no placeholder release dates", () => {
  assert.doesNotMatch(changelog, /YYYY-MM-DD/, "CHANGELOG.md must not contain placeholder release dates");
});

const youtubeToolsSource = await readFile(new URL("../extensions/youtube-tools.ts", import.meta.url), "utf8");
const { MAX_DESCRIPTION_CHARS } = await import("../lib/formatters.ts");

test("youtube_video_details schema documents the description truncation cap", () => {
  const includeDescriptionSchema = youtubeToolsSource.match(
    /includeDescription:\s*Type\.Optional\(\s*Type\.Boolean\(\{[\s\S]*?\}\),\s*\)/,
  )?.[0];

  assert.ok(
    includeDescriptionSchema,
    "youtube_video_details must register an includeDescription parameter",
  );
  assert.match(
    includeDescriptionSchema,
    /MAX_DESCRIPTION_CHARS/,
    "includeDescription description must reference MAX_DESCRIPTION_CHARS",
  );
  assert.match(
    includeDescriptionSchema,
    /up to \$\{MAX_DESCRIPTION_CHARS\} chars per video/,
    "includeDescription description must use MAX_DESCRIPTION_CHARS template to avoid stale limits",
  );
  assert.doesNotMatch(
    includeDescriptionSchema,
    /up to 500 chars/,
    "includeDescription description must not retain the stale 500-char limit",
  );
  assert.equal(MAX_DESCRIPTION_CHARS, 300, "MAX_DESCRIPTION_CHARS export must be 300");
});