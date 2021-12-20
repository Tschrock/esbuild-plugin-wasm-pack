
import { promises as fs } from 'fs';
import path from 'path';

import { walk } from './walk';

const globFiles = /\.rs$/; // Watch all rust files
const globSkipDirs = /^\.|^node_modules$/; // Skip dot folders and node_modules

/**
 * Handles loading the list of watch files.
 * This has some extra promise shinanigans so we can start loading the dep-info
 * file as soon as we know where it is instead of waiting for wasm-pack to
 * exit. Probably an insignificant time save, but
 */
export class WatchFilesLoader {
    /**
     * The promise for loading the dep-info file.
     */
    private _depInfoPromise?: Promise<string[]>;
    /**
     * The crate's root directory.
     */
    private _crateRoot: string;
    constructor(crateRoot: string = process.cwd()) {
        this._crateRoot = crateRoot;
    }
    /**
     * Loads the dep-info file for an artifact.
     * @param path The path to the artifact.
     */
    public loadDepInfo(path: string): void {
        this._depInfoPromise = loadFromDepInfo(path);
    }
    /**
     * Gets a list of files to watch.
     */
    public getWatchFiles(): Promise<string[]> {
        return this._depInfoPromise ?? loadFromGlob(this._crateRoot);
    }
}

/**
 * Gets a list of files to watch.
 * Recursively looks for *.rs files, starting at the crate root. Skips symlinks, dot folders, and `node_modules`.
 * @param path The path to the crate.
 * @returns A promise for a list of watch files.
 */
async function loadFromGlob(path: string): Promise<string[]> {
    const watchFiles: string[] = [];
    // Walk through the directory tree, looking for rust files.
    for await (const ent of walk(path, d => !globSkipDirs.test(d.name), f => globFiles.test(f.name))) {
        watchFiles.push(ent.path);
    }
    return watchFiles;
}

/**
 * Gets a list of files to watch from an artifact's dep-info file.
 * @param path The path to the artifact.
 * @returns A promise for a list of watch files.
 */
async function loadFromDepInfo(artifactPath: string): Promise<string[]> {
    // We assume that the dep-info file has the same directory and name as the artifact file
    const { dir, name } = path.parse(artifactPath);
    const depInfoPath = path.format({ dir, name, ext: '.d' });

    // Read the file
    const fileData = await fs.readFile(depInfoPath, { encoding: 'utf8' });

    // Parse the dep-info
    const depInfo = parseRustcDepInfo(fileData);

    // Get the deps for the artifact path ,or fallback to first, or none.
    return depInfo.get(artifactPath) || depInfo.values().next().value || [];
}

/**
 * Parses the rustc dep-info. There's no documentation for this format, so
 * this is ported from cargo's implementation.
 * @see https://github.com/rust-lang/cargo/blob/0bbfc5e/src/cargo/core/compiler/fingerprint.rs#L2003
 * @param data The rustc dep-info data.
 * @returns A map of artifacts and their dependencies.
 */
function parseRustcDepInfo(data: string): Map<string, string[]> {
    return new Map(data.split('\n')
        .map(l => [l, l.indexOf(': ')] as const)
        .filter(f => f[1] !== -1)
        .map(([l, i]) => {
            const target = l.slice(0, i);
            const deps = l.slice(i + 2).split(' ');
            const ret = [];
            let file;
            while ((file = deps.shift())) {
                while (file.endsWith('\\')) {
                    const next = deps.shift();
                    if (!next) throw new Error('malformed dep-info format, trailing \\');
                    file = file.slice(0, -1) + ' ' + next;
                }
                ret.push(file);
            }
            return [target, ret];
        }));
}
