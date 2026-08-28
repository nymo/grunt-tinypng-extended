# Changelog

All notable changes to `grunt-tinypng-extended` are documented here.

## [4.0.0] - 2026-08-28

### Added

- Initial Grunt port of `gulp-tinypng-extended`.
- Grunt multi-task integration using standard source/destination file mappings.
- Official Tinify client with PNG, JPEG, WebP, AVIF, metadata preservation, retries, and API-key validation.
- Signature caching, force/ignore matching, parallel processing, logging, and summaries.
- TypeScript source, compiled CommonJS output, mocked API tests, coverage, ESLint, and GitHub Actions workflows.

### Compatibility

- Requires Node.js 14 or newer and Grunt 1 or newer.
- The plugin writes compressed files to Grunt destinations by default; `keepOriginal: false` overwrites sources.
- No API key is required by automated tests.
