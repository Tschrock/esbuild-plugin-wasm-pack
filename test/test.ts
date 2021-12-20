import { promises as fs } from 'fs';

import { expect } from 'chai';
import del from 'del';
import * as esbuild from 'esbuild';

import wasmPack from '../src';
import { Future } from './Future';

before(async () => {
    // Clean the test dir
    await del('./dist-test');
});

after(async () => {
    // Reset the test file content
    await fs.writeFile('./test/pack-test/src/test with spaces.txt', 'Hello World!\n');
})

const exists = (path: string) => fs.access(path).then(() => true, () => false);

describe('esbuild', () => {
    it('should pack the wasm module without errors', async function () {
        this.timeout(5000);
        const results = await esbuild.build({
            entryPoints: ['./test/app.ts'],
            bundle: true,
            outfile: './dist-test/app.js',
            plugins: [
                wasmPack({
                    path: './test/pack-test',
                    outDir: '../../dist-test/pack-test',
                    outName: 'test',
                })
            ],
        });
        expect(results.errors).to.be.empty;
        expect(results.warnings).to.be.empty;
        expect(await exists('./dist-test/app.js')).to.be.true;
        expect(await exists('./dist-test/pack-test')).to.be.true;
    });
    it('should watch the source files', async function () {
        this.timeout(5000);
        let watchFuture = new Future<esbuild.BuildResult>();
        let result = await esbuild.build({
            entryPoints: ['./test/app.ts'],
            bundle: true,
            outfile: './dist-test/app.js',
            plugins: [
                wasmPack({
                    path: './test/pack-test',
                    outDir: '../../dist-test/pack-test',
                    outName: 'test',
                })
            ],
            watch: {
                onRebuild(error, result) {
                    if (result) watchFuture.resolve(result);
                    else watchFuture.reject(error || new Error('No Results'));
                    watchFuture = new Future();
                }
            }
        });

        // Check for build results
        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(await exists('./dist-test/app.js')).to.be.true;
        expect(await exists('./dist-test/pack-test')).to.be.true;

        // Clean the test dir
        await del('./dist-test');
        expect(await exists('./dist-test/app.js')).to.be.false;

        // Trigger a file change
        const f = watchFuture;
        await fs.appendFile('./test/pack-test/src/test with spaces.txt', 'Foo Bar!\n');

        // Wait for the next compile
        result = await f;

        // Check for build results
        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(await exists('./dist-test/app.js')).to.be.true;
        expect(await exists('./dist-test/pack-test')).to.be.true;

        // Clean the test dir
        await del('./dist-test');
        expect(await exists('./dist-test/app.js')).to.be.false;

        // Trigger another file change
        const f2 = watchFuture;
        await fs.appendFile('./test/pack-test/src/test with spaces.txt', 'Foo Bar!\n');

        // Wait for the next compile
        result = await f2;

        // Check for build results
        expect(result.errors).to.be.empty;
        expect(result.warnings).to.be.empty;
        expect(await exists('./dist-test/app.js')).to.be.true;
        expect(await exists('./dist-test/pack-test')).to.be.true;

        // Stop esbuild
        result.stop && result.stop();
    });
})
