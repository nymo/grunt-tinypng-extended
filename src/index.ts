import chalk from 'ansi-colors';
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import tinify from 'tinify';
import PluginError from 'plugin-error';
import minimist from 'minimist';
import log from 'fancy-log';
import { DEFAULT_OPTIONS, normalizeOptions, TinyPNGOptions } from './options';
import createStats from './stats';
import createSignatureStore, { SignatureFile } from './signature-store';
import createUtils, { PluginUtils } from './utils';

const PLUGIN_NAME = 'grunt-tinypng-extended';
const parseArgs = minimist(process.argv.slice(2));

type ValidationCallback = (error?: Error) => void;

interface GruntFileMapping {
    src: string[];
    dest: string;
}

interface Processor {
    conf: { token: string | null; options: TinyPNGOptions };
    hash: SignatureFile;
    stats: ReturnType<typeof createStats>;
    utils: PluginUtils;
    processFile(source: string, destination: string): Promise<boolean>;
}

function createProcessor(value: unknown): Processor {
    const options = normalizeOptions(value, parseArgs);
    if (!options.key) throw new PluginError(PLUGIN_NAME, 'Missing API key!');

    tinify.key = options.key;
    if (tinify.Client) {
        const client = tinify.Client as typeof tinify.Client & { RETRY_COUNT: number; RETRY_DELAY: number };
        client.RETRY_COUNT = Math.max(0, (options.retryAttempts || 1) - 1);
        client.RETRY_DELAY = options.retryDelay || 0;
    }

    const processor = {} as Processor;
    processor.conf = {
        token: Buffer.from(`api:${options.key}`).toString('base64'),
        options
    };
    processor.stats = createStats();
    processor.hash = createSignatureStore(options.sigFile).populate();
    processor.utils = createUtils({
        getOptions: () => processor.conf.options,
        logger: log,
        pluginName: PLUGIN_NAME
    });

    processor.processFile = async (source, destination) => {
        const relative = path.relative(process.cwd(), source) || source;
        const contents = fs.readFileSync(source);
        const file = { path: source, relative, cwd: process.cwd(), contents };

        if (processor.utils.glob(file, options.ignore)) {
            processor.stats.skipped++;
            return true;
        }

        let hash: string | null = null;
        if (options.sigFile && !processor.utils.glob(file, options.force)) {
            const comparison = processor.hash.compare(file) as { match: boolean; hash: string };
            hash = comparison.hash;
            if (comparison.match) {
                processor.stats.skipped++;
                processor.utils.log(`[skipping] ${chalk.green('✔ ')}${relative}`);
                return true;
            }
        }

        if (contents.length === 0) {
            processor.stats.skipped++;
            processor.utils.log(`Error: Empty or broken images could not be sent ${relative}`);
            return false;
        }

        try {
            let image = tinify.fromBuffer(contents);
            if (options.keepMetadata) image = image.preserve('copyright', 'creation', 'location');
            const compressed = Buffer.from(await image.toBuffer());

            if (typeof tinify.compressionCount === 'number') {
                processor.stats.compressionCount = tinify.compressionCount;
            }
            processor.stats.compressed++;
            processor.stats.total.in += contents.length;
            processor.stats.total.out += compressed.length;

            if (options.sigFile) {
                if (options.sameDest) {
                    const outputFile = { path: destination, cwd: process.cwd(), contents: compressed };
                    processor.hash.update(outputFile, processor.hash.calc(outputFile) as string);
                } else {
                    processor.hash.update(file, hash || processor.hash.calc(file) as string);
                }
            }

            const output = options.keepOriginal === false ? source : destination;
            gruntFileWrite(output, compressed);
            processor.utils.log(`[compressing] ${chalk.green('✔ ')}${relative}${chalk.gray(' (done)')}`);
            return true;
        } catch (error) {
            processor.stats.skipped++;
            processor.utils.log(processor.utils.apiError(error, file).message);
            return false;
        }
    };

    return processor;
}

// Kept separate so the processor remains straightforward to unit test and Grunt owns file semantics.
function gruntFileWrite(file: string, contents: Buffer): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
}

function summarize(processor: Processor): void {
    const stats = processor.stats;
    let info = util.format(
        'Skipped: %s image%s, Retries: %s, Compressed: %s image%s, Savings: %s (ratio: %s)',
        stats.skipped,
        stats.skipped === 1 ? '' : 's',
        stats.retries,
        stats.compressed,
        stats.compressed === 1 ? '' : 's',
        processor.utils.prettySize(stats.total.in - stats.total.out),
        stats.total.in ? Math.round(stats.total.out / stats.total.in * 10000) / 10000 : 0
    );
    if (typeof stats.compressionCount === 'number') info += util.format(', Monthly compressions: %s', stats.compressionCount);
    processor.utils.log(info, true);
}

interface GruntLike {
    registerMultiTask(name: string, description: string, task: () => void): void;
}

interface PluginFunction {
    (grunt: GruntLike): void;
    validate(key: string, callback?: ValidationCallback): Promise<void> | void;
}

const plugin: PluginFunction = function plugin(grunt: GruntLike): void {
    grunt.registerMultiTask(
        'tinypng',
        'Compress images with the TinyPNG API.',
        function(this: { options(defaults?: object): unknown; files: GruntFileMapping[]; async(): (success?: boolean) => void }) {
            const done = this.async();
            let processor: Processor;
            try {
                processor = createProcessor(this.options(DEFAULT_OPTIONS));
            } catch (error) {
                gruntError(grunt, error);
                done(false);
                return;
            }

            const mappings = this.files || [];
            const run = async (): Promise<boolean> => {
                let success = true;
                for (const mapping of mappings) {
                    const sources = mapping.src || [];
                            const results = await processSources(processor, sources, mapping.dest, Boolean(processor.conf.options.parallel), processor.conf.options.parallelMax || 1);
                    success = results && success;
                }
                if (processor.conf.options.sigFile) processor.hash.write();
                if (processor.conf.options.summarize || processor.conf.options.summarise) summarize(processor);
                return success;
            };

            run().then(done, error => {
                gruntError(grunt, error);
                done(false);
            });
        }
    );
}

async function processSources(processor: Processor, sources: string[], destination: string, parallel: boolean, parallelMax: number): Promise<boolean> {
    if (!parallel) {
        let success = true;
        for (const source of sources) {
            success = await processor.processFile(source, destinationFor(destination, source, sources)) && success;
        }
        return success;
    }

    let next = 0;
    let success = true;
    const worker = async (): Promise<void> => {
        while (next < sources.length) {
            const index = next++;
            const source = sources[index];
            success = await processor.processFile(source, destinationFor(destination, source, sources)) && success;
        }
    };
    await Promise.all(Array.from({ length: Math.min(Math.max(1, parallelMax), sources.length) }, worker));
    return success;
}

function destinationFor(destination: string, source: string, sources: string[]): string {
    if (sources.length === 1 && path.extname(destination)) return destination;
    return path.join(destination, path.basename(source));
}

function gruntError(grunt: GruntLike, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const target = grunt as GruntLike & { log?: { error(message: string): void } };
    if (target.log) target.log.error(message);
}

plugin.validate = ((key: string, callback?: ValidationCallback) => {
    tinify.key = key;
    const validation = tinify.validate();
    if (callback) {
        validation.then(() => callback(), callback);
        return;
    }
    return validation;
}) as PluginFunction['validate'];

export = plugin;
