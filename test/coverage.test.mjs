import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const nock = require('nock');
const tinypng = require('../index');
const createUtils = require('../dist/utils.js').default;
const createSignatureStore = require('../dist/signature-store.js').default;

const key = 'coverage-test-key';
const source = path.resolve('test/assets/image.png');
const output = path.resolve('test/assets/tmp/coverage.png');
const image = fs.readFileSync(source);
const small = fs.readFileSync('test/assets/image_small.png');

afterEach(() => {
  nock.cleanAll();
  fs.rmSync(path.dirname(output), { recursive: true, force: true });
  fs.rmSync('.coverage-sigs', { force: true });
});

function mockSuccessfulApi(withMetadata = false) {
  nock('https://api.tinify.com').post('/shrink').reply(201, { output: { url: 'https://api.tinify.com/output' } }, { location: 'https://api.tinify.com/output', 'compression-count': '2' });
  if (withMetadata) {
    nock('https://api.tinify.com').post('/output', { preserve: ['copyright', 'creation', 'location'] }).reply(201, small);
  } else {
    nock('https://api.tinify.com').get('/output').reply(200, small);
  }
}

function run(options = {}, files = [{ src: [source], dest: output }]) {
  let task;
  const grunt = { registerMultiTask(_name, _description, callback) { task = callback; }, log: { error() {} } };
  tinypng(grunt);
  return new Promise(resolve => task.call({
    options(defaults) { return { ...defaults, key, ...options }; },
    files,
    async() { return (success) => resolve(success); }
  }));
}

describe('additional Grunt coverage', () => {
  it('covers utility matching, aliases, and size formatting', () => {
    const utils = createUtils({ getOptions: () => ({ log: false }), logger: () => {}, pluginName: 'test' });
    const file = { path: '/tmp/image.png', relative: 'image.png' };
    expect(utils.glob(file, true)).toBe(true);
    expect(utils.glob(file, false)).toBe(false);
    expect(utils.glob(file, '[')).toBe(false);
    expect(utils.prettySize(0)).toBe('0.00 B');
    expect(utils.prettySize(1024)).toBe('1.00 KB');
  });

  it('loads, compares, and writes signatures', () => {
    const store = createSignatureStore('.coverage-sigs');
    const file = { path: source, cwd: process.cwd(), contents: image };
    const hash = store.calc(file);
    store.update(file, hash).write();
    expect(createSignatureStore('.coverage-sigs').populate().compare(file).match).toBe(true);
  });

  it('supports metadata preservation and summarized output', async () => {
    mockSuccessfulApi(true);
    expect(await run({ key, keepMetadata: true, summarise: true })).toBe(true);
  });

  it('returns a failed task for API errors while continuing the task lifecycle', async () => {
    nock('https://api.tinify.com').post('/shrink').reply(400, { error: 'BadRequest', message: 'invalid image' });
    expect(await run({ key, retryAttempts: 1 })).toBe(false);
  });
});
