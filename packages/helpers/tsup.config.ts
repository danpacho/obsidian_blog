// import process from 'process'
import builtins from 'builtin-modules'
import { defineConfig } from 'tsup'

// const prod = process.argv[2] === 'production'

export default defineConfig({
    entry: {
        main: 'src/index.ts',
    },
    watch: ['src/**/*'],
    clean: true,
    dts: false,
    outDir: 'dist',
    external: [...builtins, 'glob'],
    // noExternal: [],
    target: 'esnext',
    sourcemap: false,
})
