# Changelog

All notable changes to `grunt-tinypng-extended` are documented here.

## [1.0.0] - 2026-08-28

The first stable release of `grunt-tinypng-extended`.

### Features

- Compresses PNG, JPEG, WebP, AVIF, and other formats supported by the official Tinify API.
- Integrates with Grunt multi-tasks and standard source/destination file mappings.
- Preserves source paths and file extensions without resizing or format conversion.
- Avoids recompressing unchanged files with optional MD5 signature caching.
- Supports `sameDest` caching when source and destination files are the same.
- Supports force-processing and ignore patterns from configuration or the Grunt CLI.
- Processes files concurrently with configurable `parallel` and `parallelMax` settings.
- Retries temporary Tinify server and network failures.
- Preserves copyright, creation, and JPEG GPS metadata when `keepMetadata` is enabled.
- Writes compressed files to destinations or overwrites source files with `keepOriginal: false`.
- Provides optional per-file logging and compression summaries.
- Reports Tinify's current monthly compression count in summaries when available.
- Provides promise and callback forms of `tinypng.validate()` for API-key checks.
- Includes TypeScript declarations, automated tests, mocked API coverage, ESLint, and GitHub Actions workflows.

### Requirements

- Node.js 14 or newer.
- Grunt 1 or newer.
- A Tinify API key for live compression tasks.

Automated tests use mocked API requests and do not consume Tinify quota.
