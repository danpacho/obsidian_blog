import tsconfigPaths from 'vite-tsconfig-paths'
// eslint-disable-next-line import/no-unresolved
import { defineConfig } from 'vitest/config'

export default defineConfig({
    root: process.cwd(),
    plugins: [tsconfigPaths()],
    test: {
        root: 'packages',
        coverage: {
            reporter: ['html', 'text'],
            provider: 'v8',
            include: [
                'publish_system/src/**',
                'build_system/src/**',
                'helpers/src/**',
                'cli/src/**',
            ],
        },
    },
    resolve: {},
})
