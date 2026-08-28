# grunt-tinypng-extended

[![NPM Version](https://img.shields.io/npm/v/grunt-tinypng-extended?label=npm)](https://www.npmjs.com/package/grunt-tinypng-extended)
[![NPM Downloads](https://img.shields.io/npm/dm/grunt-tinypng-extended?label=downloads)](https://www.npmjs.com/package/grunt-tinypng-extended)
[![CI](https://github.com/nymo/grunt-tinypng-extended/actions/workflows/test.yml/badge.svg)](https://github.com/nymo/grunt-tinypng-extended/actions/workflows/test.yml)
[![Lint](https://github.com/nymo/grunt-tinypng-extended/actions/workflows/lint.yml/badge.svg)](https://github.com/nymo/grunt-tinypng-extended/actions/workflows/lint.yml)
[![License](https://img.shields.io/github/license/nymo/grunt-tinypng-extended)](LICENSE)

> Compress PNG, JPEG, WebP, AVIF, and other supported images in a Grunt task using the official [Tinify API](https://tinypng.com/developers).

`grunt-tinypng-extended` is a Grunt plugin that sends image files to Tinify/TinyPNG, receives the optimized result, and writes it through standard Grunt source/destination mappings. It includes signature caching, retries, parallel processing, metadata preservation, useful logging, and safe handling of failed files.

## Why use this plugin?

- Integrates directly into an existing Grunt workflow.
- Uses the maintained official [`tinify`](https://www.npmjs.com/package/tinify) Node.js client.
- Avoids recompressing unchanged files with an optional signature file.
- Supports concurrent processing for faster builds.
- Writes compressed files to Grunt destinations or overwrites the originals.
- Preserves copyright, creation, and JPEG GPS metadata when requested.
- Continues processing the remaining files when an individual image fails, while returning a failed Grunt task result.
- Includes retry support for temporary Tinify/API and network failures.
- Supports PNG, JPEG, WebP, and AVIF input when those extensions are included in the source mapping.
- Reports Tinify's current monthly compression count in task summaries, helping teams monitor API usage and quota.
- Provides an explicit API-key validation method for CI and preflight checks.

## Features 

### Modern image-format support

Process modern image assets alongside traditional formats in one Grunt target:

```js
files: [{
  expand: true,
  cwd: 'src/images',
  src: ['**/*.{png,jpg,jpeg,webp,avif}'],
  dest: 'dist/images/'
}]
```

WebP and AVIF files are sent to the official Tinify API as buffers and written through the normal Grunt file mapping. Existing paths and extensions are preserved, so adding modern formats does not require a separate task.

### GPS metadata preservation

Set `keepMetadata: true` to preserve metadata supported by Tinify, including copyright information, creation date, and GPS location data for JPEG images:

```js
options: {
  key: process.env.TINYPNG_KEY,
  keepMetadata: true
}
```

GPS location metadata is supported for JPEG files. Metadata preservation can increase the output size and should only be enabled when the information is required.

### Built-in API usage visibility

Enable `summarize: true` to see file savings and the Tinify account's current monthly compression count:

```text
Skipped: 2 images, Retries: 0, Compressed: 4 images, Savings: 18.42 KB (ratio: 0.6832), Monthly compressions: 27
```

The monthly count is account-wide, not limited to the current Grunt target.

## Requirements

- Node.js `14` or newer
- Grunt `1` or newer
- A [Tinify API key](https://tinypng.com/developers)
- Source files that contain binary image data; Grunt reads these files as buffers

Tinify uploads image data to its API for processing. Do not use this plugin for images that must not leave your build environment.

## Installation

Install the plugin in your Grunt project:

```sh
npm install --save-dev grunt-tinypng-extended
```

## Quick start

Set the API key in your environment rather than committing it to your repository:

```sh
export TINYPNG_KEY=your_api_key
```

Create or update your `Gruntfile.js`:

```js
const path = require('node:path');

module.exports = function (grunt) {
  grunt.initConfig({
    tinypng: {
      images: {
        options: {
          key: process.env.TINYPNG_KEY,
          sigFile: path.join(__dirname, '.tinypng-sigs'),
          summarize: true,
          log: true
        },
        files: [{
          expand: true,
          cwd: path.join(__dirname, 'src/images'),
          src: ['**/*.{png,jpg,jpeg,webp,avif}'],
          dest: path.join(__dirname, 'dist/images/')
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-tinypng-extended');
  grunt.registerTask('images', ['tinypng:images']);
};
```

Run the target:

```sh
npx grunt images
```

The first run uploads each image. Later runs skip images whose source content has not changed when `sigFile` is enabled. The plugin preserves each file's relative path and extension; it does not convert or resize images.

### Grunt file mappings

The plugin works with normal Grunt `files` mappings. Expanded mappings are recommended when processing a directory:

```js
files: [{
  expand: true,
  cwd: 'src/assets',
  src: ['**/*.{png,jpg,jpeg}'],
  dest: 'public/assets/'
}]
```

A direct one-file mapping is also supported:

```js
files: [{
  src: 'src/logo.png',
  dest: 'public/logo.png'
}]
```

## Signature caching

Use `sigFile` to store an MD5 signature for each processed source image:

```js
options: {
  key: process.env.TINYPNG_KEY,
  sigFile: '.tinypng-sigs'
}
```

Commit the signature file if you want the cache to be shared by your team or CI builds. The signature is based on the source image, so changing the source causes it to be compressed again.

If the source and destination are the same, set `sameDest: true` so signatures are calculated against the compressed destination file correctly:

```js
options: {
  key: process.env.TINYPNG_KEY,
  sigFile: '.tinypng-sigs',
  sameDest: true
}
```

## Force processing

Force all files to be processed again:

```sh
npx grunt images --force
```

Force files matching a glob:

```sh
npx grunt images --force='icons/*.png'
```

The `force` option can also be set in the target configuration:

```js
options: {
  key: process.env.TINYPNG_KEY,
  force: true
}
```

## Ignore files

Skip files matching a glob:

```sh
npx grunt images --ignore='**/icons/*.png'
```

Or configure it in the target:

```js
options: {
  key: process.env.TINYPNG_KEY,
  ignore: '**/icons/*.png'
}
```

Set `ignore: true` to skip every file in the target.

## Preserve metadata

Tinify removes most metadata by default to achieve smaller files. Preserve copyright, creation, and JPEG GPS location metadata with:

```js
options: {
  key: process.env.TINYPNG_KEY,
  keepMetadata: true
}
```

Preserving metadata can increase the output size. GPS location preservation applies to JPEG images supported by Tinify.

## Write to a destination or overwrite the source

By default, compressed files are written to the destination in the Grunt mapping:

```js
options: {
  key: process.env.TINYPNG_KEY,
  keepOriginal: true
}
```

To overwrite the original files instead, set `keepOriginal: false`:

```js
options: {
  key: process.env.TINYPNG_KEY,
  keepOriginal: false,
  sameDest: true
}
```

When overwriting, the mapping destination is not used for the compressed file. Use this mode carefully and keep backups or source control available.

## Parallel processing

Parallel processing is enabled by default:

```js
options: {
  key: process.env.TINYPNG_KEY,
  parallel: true,
  parallelMax: 5
}
```

Increase `parallelMax` carefully. Every uploaded image consumes Tinify API quota, and aggressive concurrency may trigger rate limits.

Disable parallel processing when deterministic sequential behavior is preferred:

```js
options: {
  key: process.env.TINYPNG_KEY,
  parallel: false
}
```

## Logging and summaries

Enable per-file logging:

```js
options: {
  key: process.env.TINYPNG_KEY,
  log: true
}
```

Print a summary after processing:

```js
options: {
  key: process.env.TINYPNG_KEY,
  summarize: true
}
```

The older spelling `summarise` is also accepted for compatibility.

Example summary:

```text
Skipped: 2 images, Retries: 0, Compressed: 4 images, Savings: 18.42 KB (ratio: 0.6832), Monthly compressions: 27
```

`Monthly compressions` is the account-wide compression count returned by Tinify. It is not the number of files processed by the current Grunt target.

## Configuration reference

The plugin is configured inside a Grunt target's `options` object:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `key` | `string` | `''` | Tinify API key. Required. |
| `sigFile` | `string \| false` | `false` | File used to store source signatures. |
| `sameDest` | `boolean` | `false` | Use when source and destination are the same path. |
| `keepOriginal` | `boolean` | `true` | Write compressed output to the mapping destination. Set to `false` to overwrite the source. |
| `keepMetadata` | `boolean` | `false` | Preserve copyright, creation, and JPEG GPS location metadata. |
| `force` | `boolean \| string` | `false` | Process all files or files matching a glob regardless of signatures. |
| `ignore` | `boolean \| string` | `false` | Skip all files or files matching a glob. |
| `parallel` | `boolean` | `true` | Process files concurrently. |
| `parallelMax` | `integer` | `5` | Maximum number of concurrent files. |
| `retryAttempts` | `integer` | `10` | Maximum attempts for temporary API/network failures. |
| `retryDelay` | `integer` | `10000` | Delay in milliseconds between retry attempts. |
| `log` | `boolean` | `false` | Log processing messages and errors. |
| `summarize` | `boolean` | `false` | Print processing statistics when the target completes. |
| `summarise` | `boolean` | `false` | Compatibility alias for `summarize`. |

The API key can also be passed as a string when using the underlying plugin registration function, but Grunt projects should normally use the target `options` object.

## Error handling

The task logs errors for individual files and continues processing the remaining files in the target. The Grunt task returns a failed result if one or more files could not be compressed, allowing CI and build systems to detect the failure.

The official Tinify client classifies API failures as account, client, server, or connection errors. Temporary server and connection failures are retried according to `retryAttempts` and `retryDelay`. Invalid image data and account problems should be fixed rather than retried indefinitely.

## API key security

Never commit an API key to `Gruntfile.js`, source control, test fixtures, or published configuration.

Recommended approaches include:

```sh
export TINYPNG_KEY=your_api_key
```

or loading the key from your CI secret store or a local, ignored `.env` file.

The plugin uses the official Tinify client and HTTPS certificate verification. Images are uploaded to the Tinify API, so review Tinify's terms and your project's data-handling requirements before using it in production.

## Validate an API key

Use `tinypng.validate()` to perform an explicit Tinify API-key and connectivity check before starting a build. It supports both promises and callbacks:

```js
const tinypng = require('grunt-tinypng-extended');

await tinypng.validate(process.env.TINYPNG_KEY);
console.log('Tinify API key is valid.');
```

Callback form:

```js
tinypng.validate(process.env.TINYPNG_KEY, function (error) {
  if (error) throw error;
  console.log('Tinify API key is valid.');
});
```

Validation is opt-in and makes an API request. It is useful in CI or deployment preflight checks, but it is not run automatically for every Grunt target.

## Development

The TypeScript source is located in `src/`. The compiled CommonJS JavaScript and declaration files are generated in `dist/`; this directory is created during builds and packaging.

Install dependencies:

```sh
npm install
```

Build the TypeScript source:

```sh
npm run build
```

Run the test suite. The test command builds the project first:

```sh
npm test
```

Run coverage:

```sh
npm run coverage
```

Run linting:

```sh
npm run lint
```

Tests mock TinyPNG requests with Nock. They never require a live API key or consume API quota.

## License

Licensed under the [GPL-3.0-only](LICENSE) license.
