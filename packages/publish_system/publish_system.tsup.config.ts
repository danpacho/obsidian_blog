// import process from 'process'
import { defineConfig } from 'tsup'

// const prod = process.argv[2] === 'production'

export default defineConfig((options) => ({
    entry: {
        index: 'src/index.ts',
    },
    watch: options.watch ? ['src/**/*'] : false,
    clean: false,
    dts: true,
    outDir: 'dist',
    // noExternal: [],
    target: 'esnext',
    format: ['cjs', 'esm'],
    sourcemap: false,
}))
