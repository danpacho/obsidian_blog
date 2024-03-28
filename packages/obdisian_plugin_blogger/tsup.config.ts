import process from 'process'
import builtins from 'builtin-modules'
import { defineConfig } from 'tsup'

const production = process.argv[2] === 'production'

export default defineConfig({
    entry: {
        hot_reload: 'script/index.ts',
        main: 'src/index.ts',
    },
    banner: {
        js: '/* Obsidian-blogger plugin */',
    },
    watch: ['src/**/*', 'script/**/*'],
    splitting: false,
    sourcemap: production ? false : 'inline',
    clean: true,
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    name: 'obsidian-blogger',
    external: ['obsidian', 'electron', ...builtins],
})
