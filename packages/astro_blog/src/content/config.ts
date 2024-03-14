import { defineCollection, z } from 'astro:content'

const blogMeta = z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    youtube: z.string().optional(),
})

const cartegoryMeta = z.object({
    title: z.string(),
    description: z.string(),
    banner: z.string().optional(),
    pubDate: z.coerce.date(),
})

const blog = defineCollection({
    type: 'content',
    // Type-check frontmatter using a schema
    schema: blogMeta,
})

const category = defineCollection({
    type: 'data',
    // Type-check frontmatter using a schema
    schema: cartegoryMeta,
})

export const collections = { blog, category }
