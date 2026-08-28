import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
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
    const destination = path.resolve('test/assets/tmp/grunt-output.png');
    fs.rmSync(path.dirname(destination), { recursive: true, force: true });

    const result = await register({ key, log: true }, [{ src: [fixture], dest: destination }]);

    expect(result.success).toBe(true);
    expect(fs.readFileSync(destination)).toEqual(compressed);
    fs.rmSync(path.dirname(destination), { recursive: true, force: true });
  });

  it('supports signature caching and ignores matching files', async () => {
    const signature = path.resolve('.grunt-sigs-test');
    fs.rmSync(signature, { force: true });
    const firstDestination = path.resolve('test/assets/tmp/first.png');
    const secondDestination = path.resolve('test/assets/tmp/second.png');
    mockApi();
    await register({ key, sigFile: signature }, [{ src: [fixture], dest: firstDestination }]);
    expect(fs.existsSync(signature)).toBe(true);

    const result = await register({ key, sigFile: signature }, [{ src: [fixture], dest: secondDestination }]);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(fs.existsSync(secondDestination)).toBe(false);
    fs.rmSync(signature, { force: true });
    fs.rmSync(path.dirname(firstDestination), { recursive: true, force: true });
  });

  it('overwrites sources when keepOriginal is false and handles ignored files', async () => {
    const source = path.resolve('test/assets/tmp/source.png');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.copyFileSync(fixture, source);
    mockApi();
    const result = await register({ key, keepOriginal: false, ignore: '*ignored.png' }, [{ src: [source], dest: path.resolve('unused.png') }]);
    expect(result.success).toBe(true);
    expect(fs.readFileSync(source)).toEqual(compressed);
    fs.rmSync(path.dirname(source), { recursive: true, force: true });
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
