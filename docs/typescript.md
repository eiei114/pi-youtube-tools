# TypeScript Guide

This is a TypeScript-first Pi package template.

## Layout

```txt
extensions/*.ts      Pi extension entrypoints
lib/*.ts             Shared TypeScript helpers
skills/*/SKILL.md    Agent Skills
prompts/*.md         Prompt templates
themes/*.json        Themes
tests/*.test.mjs     Smoke tests
tests/*.test.ts      Optional TypeScript tests if you add a TS test runner
```

Pi loads TypeScript extensions directly, so no build step is required for normal use.

## Strict mode

`tsconfig.json` keeps `strict: true`. Prefer fixing types over loosening compiler options.

## Extension entrypoints

Two entrypoint styles are shown:

- `extensions/hello.ts`: single-file extension
- `extensions/index.ts`: index-style extension that imports shared code from `lib/`

For larger packages, keep entrypoints thin and put reusable logic in `lib/`.

## TypeBox schemas

Use TypeBox schemas for custom tool parameters.

```ts
import { Type } from "typebox";

const parameters = Type.Object({
  name: Type.String({ description: "Name to greet" }),
});
```

## String enums

For string choices, use the local `StringEnum` helper from `lib/schema.ts`.

```ts
import { StringEnum } from "../lib/schema.ts";

const mode = StringEnum(["short", "friendly"], {
  description: "Greeting style",
});
```

This emits a JSON Schema `enum`, which is friendlier to model providers than a union of string literals.

## Runtime dependencies vs peer dependencies

Pi bundles core packages for extension authors. Keep Pi-provided packages as `peerDependencies` and also install them as `devDependencies` for local typechecking.

Use `peerDependencies` for:

- `@earendil-works/pi-coding-agent`
- `@earendil-works/pi-ai`
- `@earendil-works/pi-tui`
- `typebox`

Use `dependencies` for runtime packages your extension imports that Pi does not provide.

Use `devDependencies` for local-only tools such as TypeScript, test runners, and linters.

## Package contents

Control npm package contents with `package.json` `files`. Prefer this over `.npmignore` so the published package stays explicit.