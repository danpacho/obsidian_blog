import { describe, expect, it } from 'vitest'
import { PaginationBuilderPlugin } from '../core'
import { StaticParamBuilderPlugin } from '../core/walk:tree/static.param.builder'
import { Tester } from './tester'

describe('StaticParamBuilderPlugin', () => {
    it('should inject static params to the content', async () => {
        const staticParamBuilder = new StaticParamBuilderPlugin()
        staticParamBuilder.injectDynamicConfig({
            prefix: 'posts',
            paramShape: '/[$page]/[...postId]',
            maxPage: 2,
        })
        const paginationBuilder = new PaginationBuilderPlugin()

        const { buildFiles } = await Tester.pipe({
            plugin: {
                // It is working step-by-step [static param builder -> pagination builder]
                'walk:tree': [staticParamBuilder, paginationBuilder],
            },
        })
        const meta = buildFiles.contents.map((e) => e.meta!.pagination)
        expect(meta).toEqual([
            {
                next: {
                    href: 'posts/1/link',
                    title: 'Link.md',
                    description: 'DEFAULT DESCRIPTION',
                },
            },
            {
                prev: {
                    href: 'posts/1/img',
                    title: 'Img.md',
                    description: 'DEFAULT DESCRIPTION',
                },
                next: {
                    href: 'posts/2/markdown',
                    title: 'Markdown.md',
                    description: 'DEFAULT DESCRIPTION',
                },
            },
            {
                prev: {
                    href: 'posts/1/link',
                    title: 'Link.md',
                    description: 'DEFAULT DESCRIPTION',
                },
                next: {
                    href: 'posts/2/nested/nested/nested/nested/nested/nested/nested/deeply_nested',
                    title: 'DeeplyNested.md',
                    description: 'DEFAULT DESCRIPTION',
                },
            },
            {
                prev: {
                    href: 'posts/2/markdown',
                    title: 'Markdown.md',
                    description: 'DEFAULT DESCRIPTION',
                },
                next: {
                    href: 'posts/3/nested/nested/nested',
                    title: 'Nested.md',
                    description: 'DEFAULT DESCRIPTION',
                },
            },
            {
                prev: {
                    href: 'posts/2/nested/nested/nested/nested/nested/nested/nested/deeply_nested',
                    title: 'DeeplyNested.md',
                    description: 'DEFAULT DESCRIPTION',
                },
                next: {
                    href: 'posts/3/nested/nested/nested2',
                    title: 'Nested2.md',
                    description: 'DEFAULT DESCRIPTION',
                },
            },
            {
                prev: {
                    href: 'posts/3/nested/nested/nested',
                    title: 'Nested.md',
                    description: 'DEFAULT DESCRIPTION',
                },
            },
        ])
    })
})
