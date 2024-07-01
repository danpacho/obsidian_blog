// import process from 'process'
import builtins from 'builtin-modules'
import { defineConfig } from 'tsup'

// const prod = process.argv[2] === 'production'

export default defineConfig({
    entry: {
        main: 'src/index.ts',
    },
    banner: {
        js: '/* Obsidian-blogger plugin */',
    },
    watch: ['src/**/*'],
    // splitting: false,
    clean: false,
    // shims: true,
    dts: false,
    outDir: 'dist',
    name: 'obsidian-blogger',
    external: [
        'obsidian',
        'electron',
        '@codemirror/autocomplete',
        '@codemirror/collab',
        '@codemirror/commands',
        '@codemirror/language',
        '@codemirror/lint',
        '@codemirror/search',
        '@codemirror/state',
        '@codemirror/view',
        '@lezer/common',
        '@lezer/highlight',
        '@lezer/lr',
        ...builtins,
    ],
    noExternal: [
        '@obsidian_blogger/helpers/queue',
        '@obsidian_blogger/helpers/shell',
    ],
    format: 'cjs',
    sourcemap: false,
})
