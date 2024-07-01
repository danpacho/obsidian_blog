import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        hot_reload: 'script/index.ts',
    },
    watch: ['script/**/*'],
    splitting: false,
    sourcemap: false,
    clean: false,
    shims: true,
    format: ['esm'],
    target: 'esnext',
    dts: false,
    outDir: 'dist',
})
