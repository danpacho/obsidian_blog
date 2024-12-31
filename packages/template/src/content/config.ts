import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const POST_ROOT = './src/db/contents' as const

const post = defineCollection({
    // Type-check frontmatter using a schema
    schema: z.object({
        // Base Schema
        title: z.string(),
        description: z.string(),
        update: z.coerce.date(),
        // Static Param Schema
        href: z.string(),
        params: z.object({
            page: z.string(),
            postId: z.string(),
        }),
    }),
    loader: glob({ pattern: '**/*.md', base: POST_ROOT }),
})

export const collections = { post }
