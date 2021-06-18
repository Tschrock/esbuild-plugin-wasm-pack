import fs from 'fs';

import { expect } from 'chai';
import del from 'del';
import * as esbuild from 'esbuild';

import wasmPack from '../src';

before(() => {
    return del('./dist-test');
})

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
        expect(fs.existsSync('./dist-test/app.js')).to.be.true;
        expect(fs.existsSync('./dist-test/pack-test')).to.be.true;
    });
})
