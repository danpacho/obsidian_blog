import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'

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
    integrations: [mdx(), sitemap(), react()],
})
