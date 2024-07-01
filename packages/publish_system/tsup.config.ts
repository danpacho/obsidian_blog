// import process from 'process'
import { defineConfig } from 'tsup'

// const prod = process.argv[2] === 'production'

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
