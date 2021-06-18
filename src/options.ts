/**
 * The options to be passed to wasm-pack.
 */
export interface WasmPackOptions {
    /**
     * The maximum level of messages that should be logged by wasm-pack.
     *
     * Possible values: `info`, `warn`, `error`
     *
     * Default: `info`
     */
    logLevel?: 'info' | 'warn' | 'error';
    /**
     * Sets the build profile
     *
     * Options:
     * - `dev` - Create a development build. Enables debug info, and disables optimizations.
     * - `profiling` - Create a profiling build. Enables optimizations and debug info.
     * - `release` - Create a release build. Enables optimizations and disables debug info.
     */
    profile?: 'dev' | 'profiling' | 'release';
    /**
     * By default a *.d.ts file is generated for the generated JS file. This flag will disable generating this TypeScript file.
     */
    noTypescript?: boolean;
    /**
     * Sets steps to be run.
     *
     * Possible values: `no-install`, `normal`, `force`
     *
     * Default: `normal`
     */
    mode?: 'no-install' | 'normal' | 'force';
    /**
     * Sets the output directory with a relative path.
     *
     * Default: `pkg`
     */
    outDir?: string;
    /**
     * Sets the output file names. Defaults to package name.
     */
    outName?: string;
    /**
     * The npm scope to use in package.json, if any.
     */
    scope?: string;
    /**
     * Sets the target environment.
     *
     * Possible values: `bundler`, `nodejs`, `web`, `no-modules`
     *
     * Default: `bundler`
     */
    target?: 'bundler' | 'nodejs' | 'bundler' | 'no-modules';
    /**
     * The path to the Rust crate. If not set, searches up the path from the current directory.
     */
    path?: string;
    /**
     * List of extra options to pass to `cargo build`.
     */
    extraOptions?: string[];
    /**
     * List of extra options to pass to `wasm-pack`.
     */
    extraPackOptions?: string[];
    /**
     * Overrides the path to the wasm-pack executable. This can also be set via
     * the `WASM_PACK_PATH` environment variable.
     */
    wasmPackPath?: string;
}
