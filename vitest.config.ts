import tsconfigPaths from 'vite-tsconfig-paths'
// eslint-disable-next-line import/no-unresolved
import { defineConfig } from 'vitest/config'

export default defineConfig({
    root: process.cwd(),
    plugins: [tsconfigPaths()],
    test: {
        root: 'packages',
    },
    resolve: {},
})
