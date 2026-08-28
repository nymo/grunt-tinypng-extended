# grunt-tinypng-extended

[![NPM Version](https://img.shields.io/npm/v/grunt-tinypng-extended?label=npm)](https://www.npmjs.com/package/grunt-tinypng-extended)
[![CI](https://github.com/nymo/grunt-tinypng-extended/actions/workflows/test.yml/badge.svg)](https://github.com/nymo/grunt-tinypng-extended/actions/workflows/test.yml)
[![Lint](https://github.com/nymo/grunt-tinypng-extended/actions/workflows/lint.yml/badge.svg)](https://github.com/nymo/grunt-tinypng-extended/actions/workflows/lint.yml)
[![License](https://img.shields.io/github/license/nymo/grunt-tinypng-extended)](LICENSE)

Compress PNG, JPEG, WebP, AVIF, and other TinyPNG-supported images in a Grunt build using the official [Tinify API](https://tinypng.com/developers). The plugin supports signature caching, retries, parallel processing, metadata preservation, logging, and summaries.

## Requirements

- Node.js 14 or newer
- Grunt 1 or newer
- A [Tinify API key](https://tinypng.com/developers)

Images are uploaded to Tinify for processing. Do not use this plugin for assets that must remain inside your build environment.

## Installation

```sh
npm install --save-dev grunt-tinypng-extended
```

Set the key through the environment rather than committing it:

```sh
export TINYPNG_KEY=your_api_key
```

## Quick start

```js
module.exports = function (grunt) {
  grunt.initConfig({
    tinypng: {
      images: {
        options: {
          key: process.env.TINYPNG_KEY,
          sigFile: '.tinypng-sigs',
          summarize: true,
          log: true
        },
        files: [{
          expand: true,
          cwd: 'src/images',
          src: ['**/*.{png,jpg,jpeg,webp,avif}'],
          dest: 'dist/images/'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-tinypng-extended');
  grunt.registerTask('default', ['tinypng:images']);
};
```

Run `npx grunt`. Grunt expands the file mappings, and the plugin writes each compressed file to its mapped destination. The source path and extension are preserved; images are not resized or converted.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `key` | `string` | `''` | Required Tinify API key. |
| `sigFile` | `string \| false` | `false` | JSON file storing source signatures. |
| `sameDest` | `boolean` | `false` | Hash the compressed destination when source and destination are the same. |
| `keepOriginal` | `boolean` | `true` | Write compressed output to the Grunt destination. Set `false` to overwrite sources. |
| `keepMetadata` | `boolean` | `false` | Preserve copyright, creation, and JPEG GPS metadata. |
| `force` | `boolean \| string` | `false` | Process all files or files matching a glob despite the cache. Also supports `--force`. |
| `ignore` | `boolean \| string` | `false` | Skip all files or files matching a glob. Also supports `--ignore`. |
| `parallel` | `boolean` | `true` | Compress files concurrently. |
| `parallelMax` | `integer` | `5` | Reserved concurrency limit for compatibility; Grunt mappings control the work set. |
| `retryAttempts` | `integer` | `10` | Maximum attempts for temporary API/network errors. |
| `retryDelay` | `integer` | `10000` | Delay between retry attempts in milliseconds. |
| `log` | `boolean` | `false` | Log per-file processing messages. |
| `summarize` | `boolean` | `false` | Print compression statistics after the task. |
| `summarise` | `boolean` | `false` | Compatibility alias for `summarize`. |

### Ignore and force

```sh
npx grunt tinypng:images --ignore='**/icons/*.png'
npx grunt tinypng:images --force='**/icons/*.png'
```

### Overwrite source files

```js
options: {
  key: process.env.TINYPNG_KEY,
  keepOriginal: false,
  sameDest: true
}
```

When `keepOriginal` is false, the mapped destination is ignored and each source file is replaced in place.

### Metadata and API usage

Set `keepMetadata: true` to preserve metadata supported by Tinify. Set `summarize: true` to report savings and the account-wide monthly compression count returned by Tinify.

## Validate a key

Validation is opt-in and makes an API request:

```js
const tinypng = require('grunt-tinypng-extended');
await tinypng.validate(process.env.TINYPNG_KEY);
```

A callback form is also supported:

```js
tinypng.validate(process.env.TINYPNG_KEY, error => {
  if (error) throw error;
});
```

## Error handling and security

The task logs failed files and continues processing the remaining mapping. It returns a failed Grunt result when any file cannot be compressed. Use environment variables or your CI secret store for API keys. Never commit keys to `Gruntfile.js`, tests, or source control.

## Development

```sh
npm install
npm run build
npm test
npm run coverage
npm run lint
```

Tests mock the Tinify API with Nock and never consume API quota.
