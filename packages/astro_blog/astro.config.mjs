import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import { defineConfig } from 'astro/config'

// TODO: astro PWA
// https://github.com/shaunchander/astro-pwa-starter#-getting-started-guide

// https://astro.build/config
export default defineConfig({
    site: 'https://example.com',
    markdown: {
        gfm: true,
        rehypePlugins: [],
        remarkPlugins: [],
        remarkRehype: {},
        shikiConfig: {
            theme: 'one-dark-pro',
        },
        syntaxHighlight: 'shiki',
    },
    image: {},
    vite: {},
    integrations: [mdx(), sitemap(), react(), tailwind()],
})
