import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        hot_reload: 'scripts/index.ts',
    },
    watch: ['script/**/*'],
    tsconfig: './scripts/tsconfig.json',
    splitting: false,
    sourcemap: false,
    clean: false,
    shims: true,
    format: ['esm'],
    target: 'esnext',
    dts: false,
    outDir: 'dist',
})
