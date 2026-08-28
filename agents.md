# Agent instructions

## Project overview

`grunt-tinypng-extended` is a CommonJS Grunt plugin that sends image files to the official Tinify API and writes optimized buffers through Grunt file mappings. The implementation is TypeScript compiled to `dist/`.

## Layout

- `index.js` — CommonJS entry point loading the compiled plugin.
- `src/index.ts` — Grunt `registerMultiTask` integration and Tinify processing.
- `src/options.ts` — defaults and CLI option normalization.
- `src/signature-store.ts` — signature cache handling.
- `src/stats.ts` — task statistics.
- `src/utils.ts` — logging, matching, API errors, and size formatting.
- `test/` — Vitest tests and binary fixtures; Tinify calls are mocked with Nock.
- `dist/` — generated output; do not edit manually.

## Conventions

- Keep the public API Grunt-oriented: configure `tinypng` with `files` mappings and load the task with `grunt.loadNpmTasks`.
- Preserve binary buffers and source/destination semantics.
- Never use a live API key in tests or commit credentials.
- Make implementation changes in `src/`, then run `npm run build`.
- Update `README.md` and `CHANGELOG.md` for user-visible behavior changes.

## Commands

```sh
npm install
npm run build
npm test
npm run coverage
npm run lint
```

Do not run a manual Grunt task with a real `TINYPNG_KEY` unless API usage is intentional.
