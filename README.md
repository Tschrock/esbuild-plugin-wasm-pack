esbuild-plugin-wasm-pack
========================

An [esbuild](https://esbuild.github.io/) plugin that runs [wasm-pack]() before each build.


## Requirements
- node >=0.12.0
- esbuild >= 0.11.15
- rust/cargo
- wasm-pack

\*Make sure you have `wasm-pack` installed and in your PATH.\*


## Installation

```
npm install --save-dev esbuild-plugin-wasm-pack
```

or

```
yarn add --dev esbuild-plugin-wasm-pack
```


## Usage
Simply add it to your esbuild plugins list

```ts
// build.ts
import esbuild from 'esbuild';
import wasmpack from 'esbuild-plugin-wasm-pack';

esbuild.build({
    ...
    plugins: [
        wasmpack({
            // options (see below)
        })
    ]
    ...
});
```


## Configuration

The configuration options match the arguments to `wasm-pack build`.

| Option             | Type     | Default Value        | Description |
|--------------------|----------|----------------------|-------------|
| `logLevel`         | string   | `"info"`             | The maximum level of messages that should be logged by wasm-pack.<br>Possible values: `info`, `warn`, `error` |
| `profile`          | string   | `"dev"`              | Sets the build profile<br>Options:<ul><li>`dev` - Create a development build. Enables debug info and disables optimizations.</li><li>`profiling` - Create a profiling build. Enables optimizations and debug info.</li><li>`release` - Create a release build. Enables optimizations and disables debug info.</li></ul> |
| `noTypescript`     | boolean  | `false`              | By default a *.d.ts file is generated for the generated JS file. This flag will disable generating this TypeScript file. |
| `mode`             | string   | `"normal"`           | Sets steps to be run.<br>Possible values: `no-install`, `normal`, `force` |
| `outDir`           | string   | `"pkg"`              | Sets the output directory with a relative path. |
| `outName`          | string   | &lt;package name&gt; | Sets the output file names. Defaults to package name. |
| `scope`            | string   | -                    | The npm scope to use in package.json, if any. |
| `target`           | string   | `"bundler"`          | Sets the target environment.<br>Possible values: `bundler`, `nodejs`, `web`, `no-modules` |
| `path`             | string   | -                    | The path to the Rust crate. If not set, searches up the path from the current directory. |
| `extraOptions`     | string[] | `[]`                 | A list of extra options to pass to `cargo build`. |
| `extraPackOptions` | string[] | `[]`                 | A list of extra options to pass to `wasm-pack` |
| `wasmPackPath`     | string   | -                    | Overrides the path to the wasm-pack executable. This can also be set via the `WASM_PACK_PATH` environment variable. |


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
