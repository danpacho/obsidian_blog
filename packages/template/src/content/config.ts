import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const POST_ROOT = './src/db/posts' as const

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
        // Pagination Schema
        pagination: z.object({
            prev: z
                .object({
                    href: z.string(),
                    title: z.string(),
                    description: z.string(),
                })
                .optional(),
            next: z
                .object({
                    href: z.string(),
                    title: z.string(),
                    description: z.string(),
                })
                .optional(),
        }),
    }),
    loader: glob({ pattern: '**/*.md', base: POST_ROOT }),
})

export const collections = { post }
