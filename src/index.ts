import { Plugin, PluginBuild, OnStartResult, OnResolveResult } from 'esbuild';

import { BOLD, FG_BLUE, FG_RED, I_INFO, I_SUCCESS, I_WARN, RESET } from './console';
import { WasmPackOptions } from './options';
import { WasmPackProcess } from './process';

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
    private wasmProcess: WasmPackProcess | null = null;

    /**
     * The files to watch.
     */
    private watchFiles: string[] = [];

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
        build.onResolve({ filter: /.*/ }, async (): Promise<OnResolveResult> => {
            await this.wasmProcess?.waitForClose();
            return { watchFiles: this.watchFiles };
        });
    }

    /**
     * Runs `wasm-pack` with the configured options.
     */
    private async wasmPack(): Promise<OnStartResult> {
        this.info(`Compiling your crate in ${this.options.profile ?? '<default>'} mode...`);

        // Cancel any existing wasm-pack process
        if (this.wasmProcess) await this.wasmProcess.cancel();

        // Spawn wasm-pack
        this.wasmProcess = new WasmPackProcess(this.options);

        // Wait for it to exit
        const result = await this.wasmProcess.waitForClose();

        // Clear the current process
        this.wasmProcess = null;

        // Save the watch files
        if(result.watchFiles.length) {
            this.watchFiles = result.watchFiles;
        }

        // Return the results
        if (result.error) {
            if (result.canceled) {
                this.error(`Error canceling wasm-pack: ${result.error.message}.`);
                return { errors: [{ text: result.error.message, detail: result.error.stack }] };
            }
            else {
                this.error(`Error running wasm-pack: ${result.error.message}.`);
                return { errors: [{ text: result.error.message, detail: result.error.stack }] };
            }
        }

        if (result.canceled) {
            this.error('Build was canceled.');
            return { warnings: [{ text: 'Build was canceled' }] };
        }

        if (result.signal) {
            this.error(`Error running wasm-pack: process was killed with signal '${result.signal}'.`);
            return { errors: [{ text: `Error running wasm-pack: process was killed with signal '${result.signal}'.` }] };
        }

        if (result.code) {
            this.error('Rust compilation failed.');
            return { errors: [{ text: 'Rust compilation failed.' }] };
        }

        // Success
        this.success('Your crate was successfully compiled.');
        return {};
    }

    private success(msg: string) {
        if (this.logLevelInt <= 1) console.log(`\n${I_SUCCESS}${BOLD}${FG_BLUE}${msg}${RESET}\n`);
    }

    private info(msg: string) {
        if (this.logLevelInt <= 1) console.log(`\n${I_INFO}${BOLD}${FG_BLUE}${msg}${RESET}\n`);
    }

    private error(msg: string) {
        if (this.logLevelInt <= 3) console.log(`\n${I_WARN}${BOLD}${FG_RED}${msg}${RESET}\n`);
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
