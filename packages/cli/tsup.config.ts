import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        index: 'src/index.ts',
    },
    watch: ['src/**/*'],
    clean: true,
    dts: true,
    outDir: 'dist',
    // noExternal: [],
    target: 'esnext',
    format: ['cjs', 'esm'],
    sourcemap: false,
})
