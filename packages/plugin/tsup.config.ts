import { defineConfig } from 'tsup'

export default defineConfig((options) => ({
    entry: {
        index: 'src/index.ts',
        arg_parser: 'src/plugin/arg_parser/index.ts',
        bridge: 'src/plugin/bridge/index.ts',
    },
    watch: options.watch ? ['src/**/*'] : false,
    clean: false,
    dts: true, // Generate type declarations
    outDir: 'dist',
    target: 'esnext',
    sourcemap: false,
    format: ['esm', 'cjs'],
    shims: true,
}))
