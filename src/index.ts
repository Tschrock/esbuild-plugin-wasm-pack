import { Plugin, PluginBuild, OnStartResult } from 'esbuild';

import { BOLD, FG_BLUE, FG_RED, RESET } from './console';
import { WasmPackOptions } from './options';
import { CancelableProcess } from './process';

export { WasmPackOptions };

/**
 * The log levels.
 */
const logLevels = ['info', 'warn', 'error'];

/**
 * An esbuild plugin that runs wasm-pack when a build starts.
 */
class WasmPackPlugin implements Plugin {
    /**
     * The esbuild plugin name.
     */
    public readonly name = 'wasm-pack';

    /**
     * The log level.
     */
    private logLevelInt = 0;

    /**
     * The wasm-pack process, if it's running.
     */
    private wasmProcess: CancelableProcess | null = null;

    /**
     * Creates a new WasmPackPlugin.
     * @param options The wasm-pack options.
     */
    constructor(private options: WasmPackOptions = {}) {
        // Set the log level
        this.logLevelInt = logLevels.indexOf((options.logLevel ?? 'info').toLowerCase());
    }

    /**
     * Sets up the build
     */
    setup(build: PluginBuild): void {
        // Run wasm-pack on build start
        build.onStart(() => this.wasmPack());

        // Force all resolutions to wait until the build is done
        build.onResolve({ filter: /.*/ }, async (): Promise<undefined> => {
            await this.wasmProcess?.waitForClose();
            return undefined;
        });
    }

    /**
     * Runs `wasm-pack` with the configured options.
     */
    private async wasmPack(): Promise<OnStartResult> {
        this.info(`\nℹ️  Compiling your crate in ${this.options.profile ?? '<default>'} mode...\n`);

        // Resolve the wasm-pack executable path
        const wasmPackPath = process.env['WASM_PACK_PATH'] || this.options.wasmPackPath || 'wasm-pack';

        // Build the argument list
        const argsList: string[] = ['build'];
        if (this.options.logLevel) argsList.push('--log-level', this.options.logLevel);
        if (this.options.profile) argsList.push('--' + this.options.profile);
        if (this.options.noTypescript) argsList.push('--no-typescript');
        if (this.options.mode) argsList.push('--mode', this.options.mode);
        if (this.options.outDir) argsList.push('--out-dir', this.options.outDir);
        if (this.options.outName) argsList.push('--out-name', this.options.outName);
        if (this.options.scope) argsList.push('--scope', this.options.scope);
        if (this.options.target) argsList.push('--target', this.options.target);
        if (this.options.extraPackOptions) argsList.push(...this.options.extraPackOptions);
        if (this.options.path) argsList.push(this.options.path);
        if (this.options.extraOptions) argsList.push('--', ...this.options.extraOptions);

        // Cancel any existing wasm-pack process
        if (this.wasmProcess) await this.wasmProcess.cancel();

        // Spawn wasm-pack
        this.wasmProcess = CancelableProcess.spawn(wasmPackPath, argsList, { stdio: 'inherit' });

        // Wait for it to exit
        const result = await this.wasmProcess.waitForClose();

        // Clear the current process
        this.wasmProcess = null;

        // Return the results
        if (result.error) {
            if (result.canceled) {
                this.error(`\n⚠️  Error canceling wasm-pack: ${result.error.message}\n`);
                return { errors: [{ text: result.error.message, detail: result.error.stack }] };
            }
            else {
                this.error(`\n⚠️  Error running wasm-pack: ${result.error.message}\n`);
                return { errors: [{ text: result.error.message, detail: result.error.stack }] };
            }
        }

        if (result.canceled) {
            this.error('\n⚠️  Build was canceled\n');
            return { warnings: [{ text: 'Build was canceled' }] };
        }

        if (result.signal) {
            this.error(`\n⚠️  Error running wasm-pack: process was killed with signal '${result.signal}'.\n`);
            return { errors: [{ text: `Error running wasm-pack: process was killed with signal '${result.signal}'.` }] };
        }

        if (result.code) {
            this.error('\n⚠️  Rust compilation failed.\n');
            return { errors: [{ text: 'Rust compilation failed.' }] };
        }

        // Success
        this.info('\n✅  Your crate was successfully compiled\n');
        return {};
    }

    private info(msg: string) {
        if (this.logLevelInt <= 1) console.log(`${BOLD}${FG_BLUE}${msg}${RESET}`);
    }

    private error(msg: string) {
        if (this.logLevelInt <= 3) console.log(`${BOLD}${FG_RED}${msg}${RESET}`);
    }
}

/**
 * Runs wasm-pack when a build starts.
 */
function wasmPack(options: WasmPackOptions = {}): Plugin {
    const plugin = new WasmPackPlugin(options);
    return { name: plugin.name, setup: plugin.setup.bind(plugin) };
}

export { wasmPack, wasmPack as default };
