import { describe, expect, it } from 'vitest'
import { PaginationBuilderPlugin, StaticParamBuilderPlugin } from '../core'
import { Tester } from './tester'
import { ExcludeDraftPlugin } from '../core/build_tree/exclude_draft'

describe('StaticParamBuilderPlugin', () => {
    const paginationBuilder = new PaginationBuilderPlugin()

    function omit(obj: Record<string, unknown>, keyToOmit: string) {
        const { [keyToOmit]: _, ...rest } = obj
        return rest
    }

    it('should inject static params to the content', async () => {
        const draft = new ExcludeDraftPlugin()
        const staticParamBuilder = new StaticParamBuilderPlugin()
        staticParamBuilder.injectDynamicConfig({
            prefix: 'posts',
            paramShape: '/[$page]/[...postId]',
            maxPage: 2,
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'build:tree': draft,
                // It is working step-by-step [static param builder -> pagination builder]
                'walk:tree': [staticParamBuilder, paginationBuilder],
            },
        })
        const meta = buildFiles.contents
            .map((e) => e.meta!.pagination)
            .filter(Boolean)
            .map((e) => {
                // filter update(live gen time)
                const te = e as unknown as {
                    next: Record<string, unknown>
                    prev: Record<string, unknown>
                }
                const next = omit(te?.next ?? {}, 'update')
                const prev = omit(te?.prev ?? {}, 'update')
                return {
                    next,
                    prev,
                }
            })
        expect(meta).toMatchInlineSnapshot(`
          [
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/1/link",
                "params": {
                  "page": "1",
                  "postId": "link",
                },
                "title": "Link.md",
              },
              "prev": {},
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/2/markdown",
                "params": {
                  "page": "2",
                  "postId": "markdown",
                },
                "title": "Markdown.md",
              },
              "prev": {
                "banner": "![[img.png]]",
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/1/img",
                "params": {
                  "page": "1",
                  "postId": "img",
                },
                "title": "Img.md",
              },
            },
            {
              "next": {},
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/1/link",
                "params": {
                  "page": "1",
                  "postId": "link",
                },
                "title": "Link.md",
              },
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/3/nested/nested/nested",
                "params": {
                  "page": "3",
                  "postId": "nested/nested/nested",
                },
                "title": "Nested.md",
              },
              "prev": {},
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/4/nested/nested/nested2",
                "params": {
                  "page": "4",
                  "postId": "nested/nested/nested2",
                },
                "title": "Nested2.md",
              },
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/3/nested/nested/nested/nested/nested/nested/nested/deeply_nested",
                "params": {
                  "page": "3",
                  "postId": "nested/nested/nested/nested/nested/nested/nested/deeply_nested",
                },
                "title": "DeeplyNested.md",
              },
            },
            {
              "next": {},
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "posts/3/nested/nested/nested",
                "params": {
                  "page": "3",
                  "postId": "nested/nested/nested",
                },
                "title": "Nested.md",
              },
            },
          ]
        `)
    })

    it('should inject [category]/[...post] param', async () => {
        const draft = new ExcludeDraftPlugin()
        const staticParamBuilder = new StaticParamBuilderPlugin()
        staticParamBuilder.injectDynamicConfig({
            paramShape: '/[category]/[...post]',
            maxPage: 3,
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'build:tree': [draft],
                // It is working step-by-step [static param builder -> pagination builder]
                'walk:tree': [staticParamBuilder, paginationBuilder],
            },
        })

        const meta = buildFiles.contents
            .map((e) => e.meta!.pagination)
            .filter(Boolean)
            .map((e) => {
                // filter update(live gen time)
                const te = e as unknown as {
                    next: Record<string, unknown>
                    prev: Record<string, unknown>
                }
                const next = omit(te?.next ?? {}, 'update')
                const prev = omit(te?.prev ?? {}, 'update')
                return {
                    next,
                    prev,
                }
            })

        expect(meta).toMatchInlineSnapshot(`
          [
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "link",
                "params": {
                  "category": "link",
                },
                "title": "Link.md",
              },
              "prev": {},
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "markdown",
                "params": {
                  "category": "markdown",
                },
                "title": "Markdown.md",
              },
              "prev": {
                "banner": "![[img.png]]",
                "description": "DEFAULT DESCRIPTION",
                "href": "img",
                "params": {
                  "category": "img",
                },
                "title": "Img.md",
              },
            },
            {
              "next": {},
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "link",
                "params": {
                  "category": "link",
                },
                "title": "Link.md",
              },
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "nested/nested/nested",
                "params": {
                  "category": "nested",
                  "post": "nested/nested",
                },
                "title": "Nested.md",
              },
              "prev": {},
            },
            {
              "next": {
                "description": "DEFAULT DESCRIPTION",
                "href": "nested/nested/nested2",
                "params": {
                  "category": "nested",
                  "post": "nested/nested2",
                },
                "title": "Nested2.md",
              },
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "nested/nested/nested/nested/nested/nested/nested/deeply_nested",
                "params": {
                  "category": "nested",
                  "post": "nested/nested/nested/nested/nested/nested/deeply_nested",
                },
                "title": "DeeplyNested.md",
              },
            },
            {
              "next": {},
              "prev": {
                "description": "DEFAULT DESCRIPTION",
                "href": "nested/nested/nested",
                "params": {
                  "category": "nested",
                  "post": "nested/nested",
                },
                "title": "Nested.md",
              },
            },
          ]
        `)
    })
})
