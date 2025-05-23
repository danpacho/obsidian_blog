import { defineConfig } from 'tsup'

export default defineConfig((options) => ({
    entry: {
        index: 'src/index.ts',
        arg_parser: 'src/arg_parser/index.ts',
        constants: 'src/constants/index.ts',
        bridge: 'src/bridge/index.ts',
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
