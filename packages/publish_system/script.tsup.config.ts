import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        publish_test: './scripts/publish_test.ts',
    },
    tsconfig: './scripts/tsconfig.json',
    watch: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    shims: true,
    format: ['esm'],
    target: 'esnext',
    dts: false,
    outDir: 'dist',
    external: ['fs', 'path', 'dotenv'],
})
