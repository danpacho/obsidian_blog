import { defineConfig } from 'tsup'

export default defineConfig((options) => ({
    entry: {
        index: 'src/index.ts',
        components: 'src/components/index.ts',
        hooks: 'src/hooks/index.ts',
        tools: 'src/tools/index.ts',
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
