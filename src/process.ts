import { ChildProcess, spawn } from 'child_process';

import { CompilerArtifact, Message } from './cargo-metadata';
import { WasmPackOptions } from './options';
import { WatchFilesLoader } from './watch';

export interface ExitState {
    error?: Error;
    canceled: boolean;
    code: number | null;
    signal: NodeJS.Signals | null;
    watchFiles: string[];
}

/**
 * Runs the wasm-pack command.
 */
export class WasmPackProcess {
    /**
     * The child process.
     */
    private _process: ChildProcess;

    /**
     * A promise that resolves when the child process exits.
     */
    private _promise: Promise<ExitState>;

    /**
     * Asynchonously waits for the process to exit.
     * @returns A promise that resolves once the process has exited.
     */
    public waitForClose(): Promise<ExitState> { return this._promise; }

    /**
     * If the process was canceled or not.
     */
    private _canceled = false;

    /**
     * Gets if the process was canceled.
     */
    public get canceled(): boolean { return this._canceled; }

    /**
     * The resolve function for the exit promise.
     */
    private _resolve!: (value: ExitState | PromiseLike<ExitState>) => void;

    /**
     * The error if there was an error spawning or killing the process.
     */
    private _error?: Error;

    /**
     * The loader for loading the list of watchfiles.
     */
    private _watchFiles: WatchFilesLoader;

    /**
     * The last artifact that was compiled.
     */
    private _lastArtifact?: CompilerArtifact;

    constructor(options: WasmPackOptions) {
        // Create the exit promise
        this._promise = new Promise<ExitState>(resolve => this._resolve = resolve);

        // Resolve the wasm-pack executable path
        const wasmPackPath = process.env['WASM_PACK_PATH'] || options.wasmPackPath || 'wasm-pack';

        // Build the argument list
        const argsList: string[] = ['build'];
        if (options.logLevel) argsList.push('--log-level', options.logLevel);
        if (options.profile) argsList.push('--' + options.profile);
        if (options.noTypescript) argsList.push('--no-typescript');
        if (options.mode) argsList.push('--mode', options.mode);
        if (options.outDir) argsList.push('--out-dir', options.outDir);
        if (options.outName) argsList.push('--out-name', options.outName);
        if (options.scope) argsList.push('--scope', options.scope);
        if (options.target) argsList.push('--target', options.target);
        if (options.extraPackOptions) argsList.push(...options.extraPackOptions);
        if (options.path) argsList.push(options.path);
        argsList.push('--', ...options.extraOptions || [], '--message-format=json');

        // Loader for watch files
        this._watchFiles = new WatchFilesLoader(options.path);

        // Spawn the wasm-pack process
        this._process = spawn(wasmPackPath, argsList, {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'ipc', 'inherit'],
            detached: false,
            serialization: 'json',
            shell: false,
        });

        // Hook up the process events
        this._process.on('error', this._onError.bind(this));
        this._process.on('message', this._onMessage.bind(this));
        this._process.on('close', this._onClose.bind(this));
    }

    /**
     * Cancels a currently running process.
     * @returns A promise that resolves once the process has exited.
     */
    public cancel(): Promise<ExitState> {
        if (!this._canceled) {
            this._canceled = true;
            this._process.kill();
        }
        return this._promise;
    }

    /**
     * Called when there's an error spawning, killing, or messaging the child process.
     * @param err The error.
     */
    private _onError(err: Error): void {
        this._error = err;
    }

    /**
     * Called when the child process sends a message.
     * @param message The message object.
     */
    private _onMessage(message: Message): void {
        // cargo doesn't actually tell us what the main package_id is, so
        // for now just assume the last artifact is the right one.
        if (message.reason == 'compiler-artifact') {
            this._lastArtifact = message;
        }
        if (message.reason == 'build-finished' && message.success && this._lastArtifact) {
            // Assume the first output file is the one we want.
            const artifactPath = this._lastArtifact.filenames[0];
            if (artifactPath) {
                this._watchFiles.loadDepInfo(artifactPath);
            }
        }
    }

    /**
     * Called after the child process has ended and it's stdio streams have been closed.
     * @param code The exit code, if the process exited normally.
     * @param signal The signal that terminated the process.
     */
    private _onClose(code: number | null, signal: NodeJS.Signals | null): void {
        this._resolve(
            this._watchFiles.getWatchFiles().then(
                watchFiles => ({
                    canceled: this._canceled,
                    error: this._error,
                    code,
                    signal,
                    watchFiles
                })
            )
        );
    }
}
