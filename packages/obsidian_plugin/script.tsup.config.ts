import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        hot_reload: 'scripts/index.ts',
    },
    tsconfig: './scripts/tsconfig.json',
    format: ['esm'],
    target: 'esnext',
    splitting: false,
    sourcemap: false,
    clean: false,
    shims: true,
    dts: false,
    outDir: 'dist',
    external: ['dotenv'],
})
