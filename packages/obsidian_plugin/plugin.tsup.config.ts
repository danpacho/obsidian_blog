// import process from 'process'
import builtins from 'builtin-modules'
import { defineConfig } from 'tsup'

const prod = process.argv[2] === 'production'

export default defineConfig((options) => ({
    name: 'obsidian-blogger',
    entry: {
        main: 'src/index.ts',
    },
    banner: {
        js: '/* Obsidian-blogger plugin */',
    },
    watch: options.watch ? ['src/**/*'] : false,
    clean: false,
    dts: false,
    outDir: 'dist',
    bundle: true,
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
        '@obsidian_blogger/plugin_api',
        '@obsidian_blogger/plugin_api/constants',
        '@obsidian_blogger/plugin_api/arg_parser',
        '@obsidian_blogger/design_system',
        '@obsidian_blogger/design_system/components',
        '@obsidian_blogger/design_system/hooks',
        '@obsidian_blogger/design_system/tools',
        '@obsidian_blogger/helpers',
        '@obsidian_blogger/helpers/queue',
        '@obsidian_blogger/helpers/logger',
        '@obsidian_blogger/helpers/shell',
        '@obsidian_blogger/helpers/storage',
        '@obsidian_blogger/helpers/arg_parser',
        'react',
        'react-dom',
    ],
    format: 'cjs',
    target: 'es2018',
    sourcemap: prod ? false : 'inline',
    treeshake: true,
}))
