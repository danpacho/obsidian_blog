import { describe, expect, it } from 'vitest'
import { PaginationBuilderPlugin } from '../core'
import { StaticParamBuilderPlugin } from '../core/walk:tree/static.param.builder'
import { Tester } from './tester'

describe('StaticParamBuilderPlugin', () => {
    const paginationBuilder = new PaginationBuilderPlugin()
    it('should inject static params to the content', async () => {
        const staticParamBuilder = new StaticParamBuilderPlugin()
        staticParamBuilder.injectDynamicConfig({
            prefix: 'posts',
            paramShape: '/[$page]/[...postId]',
            maxPage: 2,
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                // It is working step-by-step [static param builder -> pagination builder]
                'walk:tree': [staticParamBuilder, paginationBuilder],
            },
        })
        const meta = buildFiles.contents
            .map((e) => e.meta!.pagination)
            .filter(Boolean)
        expect(meta).toMatchInlineSnapshot(`
          [
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/1/link",
                "title": "Link.md",
              },
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/2/markdown",
                "title": "Markdown.md",
              },
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/1/img",
                "title": "Img.md",
              },
            },
            {
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/1/link",
                "title": "Link.md",
              },
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/3/nested/nested/nested",
                "title": "Nested.md",
              },
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/4/nested/nested/nested2",
                "title": "Nested2.md",
              },
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/3/nested/nested/nested/nested/nested/nested/nested/deeply_nested",
                "title": "DeeplyNested.md",
              },
            },
            {
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/3/nested/nested/nested",
                "title": "Nested.md",
              },
            },
          ]
        `)
    })

    it('should inject [category]/[...post] param', async () => {
        const staticParamBuilder = new StaticParamBuilderPlugin()
        staticParamBuilder.injectDynamicConfig({
            paramShape: '/[category]/[...post]',
            maxPage: 3,
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                // It is working step-by-step [static param builder -> pagination builder]
                'walk:tree': [staticParamBuilder, paginationBuilder],
            },
        })

        const meta = buildFiles.contents
            .map((e) => e.meta!.pagination)
            .filter(Boolean)
        expect(meta).toMatchInlineSnapshot(`
          [
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "link",
                "title": "Link.md",
              },
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "markdown",
                "title": "Markdown.md",
              },
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "img",
                "title": "Img.md",
              },
            },
            {
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "link",
                "title": "Link.md",
              },
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "nested/nested/nested",
                "title": "Nested.md",
              },
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "nested/nested/nested2",
                "title": "Nested2.md",
              },
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "nested/nested/nested/nested/nested/nested/nested/deeply_nested",
                "title": "DeeplyNested.md",
              },
            },
            {
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "nested/nested/nested",
                "title": "Nested.md",
              },
            },
          ]
        `)
    })
})
