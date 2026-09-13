import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const nock = require('nock');
const tinypng = require('../index');

const fixture = path.resolve('test/assets/image.png');
const compressed = fs.readFileSync('test/assets/image_small.png');
const key = 'test-api-key';

function register(options, files) {
  let task;
  const errors = [];
  const grunt = {
    registerMultiTask(_name, _description, callback) { task = callback; },
    log: { error(message) { errors.push(message); } }
  };
  tinypng(grunt);
  return new Promise((resolve) => {
    const context = {
      options(defaults) { return { ...defaults, ...options }; },
      files,
      async() { return (success = true) => resolve({ success, errors }); }
    };
    task.call(context);
  });
}

function mockApi() {
  nock('https://api.tinify.com')
    .post('/shrink')
    .reply(201, { output: { url: 'https://api.tinify.com/output' } }, {
      location: 'https://api.tinify.com/output',
      'compression-count': '1'
    });
  nock('https://api.tinify.com').get('/output').reply(200, compressed);
}

afterEach(() => nock.cleanAll());

describe('grunt-tinypng-extended', () => {
  it('registers a Grunt multi-task and writes compressed files to destinations', async () => {
    mockApi();
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'grunt-tinypng-'));
    const destination = path.join(temporaryDirectory, 'grunt-output.png');

    try {
      const result = await register({ key, log: true }, [{ src: [fixture], dest: destination }]);

      expect(result.success).toBe(true);
      expect(fs.readFileSync(destination)).toEqual(compressed);
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('supports signature caching and ignores matching files', async () => {
    const signature = path.resolve('.grunt-sigs-test');
    fs.rmSync(signature, { force: true });
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'grunt-tinypng-'));
    const firstDestination = path.join(temporaryDirectory, 'first.png');
    const secondDestination = path.join(temporaryDirectory, 'second.png');

    try {
      mockApi();
      await register({ key, sigFile: signature }, [{ src: [fixture], dest: firstDestination }]);
      expect(fs.existsSync(signature)).toBe(true);

      const result = await register({ key, sigFile: signature }, [{ src: [fixture], dest: secondDestination }]);
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(fs.existsSync(secondDestination)).toBe(false);
    } finally {
      fs.rmSync(signature, { force: true });
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('overwrites sources when keepOriginal is false and handles ignored files', async () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'grunt-tinypng-'));
    const source = path.join(temporaryDirectory, 'source.png');
    fs.copyFileSync(fixture, source);

    try {
      mockApi();
      const result = await register({ key, keepOriginal: false, ignore: '*ignored.png' }, [{ src: [source], dest: path.resolve('unused.png') }]);
      expect(result.success).toBe(true);
      expect(fs.readFileSync(source)).toEqual(compressed);
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('requires an API key and exposes promise and callback validation', async () => {
    const missing = await register({}, []);
    expect(missing.success).toBe(false);
    expect(missing.errors[0]).toMatch(/missing api key/i);

    nock('https://api.tinify.com').post('/shrink').reply(200);
    await tinypng.validate(key);
    nock('https://api.tinify.com').post('/shrink').reply(200);
    await new Promise((resolve, reject) => tinypng.validate(key, error => error ? reject(error) : resolve()));
  });
});
