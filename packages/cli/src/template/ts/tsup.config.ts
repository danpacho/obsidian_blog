import { defineConfig } from 'tsup'

export default defineConfig((options) => ({
    entry: {
        build: 'src/build.ts',
        publish: 'src/publish.ts',
    },
    watch: options.watch ? ['src/**/*'] : false,
    clean: true,
    dts: true,
    outDir: 'dist',
    target: 'esnext',
    format: ['cjs'],
    sourcemap: false,
}))
