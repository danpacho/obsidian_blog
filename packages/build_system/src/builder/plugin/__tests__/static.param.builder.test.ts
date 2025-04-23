import { describe, expect, it } from 'vitest'
import { StaticParamBuilderPlugin } from '../core/walk:tree/static.param.builder'
import { Tester } from './tester'

describe('StaticParamBuilderPlugin', () => {
    it('should inject static params to the content', async () => {
        const plugin = new StaticParamBuilderPlugin()
        plugin.injectDynamicConfig({
            prefix: 'posts',
            paramShape: '/[$page]/[...postId]',
            maxPage: 2,
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': plugin,
            },
        })

        const metaList = buildFiles.contents.map((e) => e.meta!.params)
        expect(metaList).toMatchInlineSnapshot(`
          [
            {
              "page": "1",
              "postId": "img",
            },
            {
              "page": "1",
              "postId": "link",
            },
            {
              "page": "2",
              "postId": "markdown",
            },
            undefined,
            {
              "page": "3",
              "postId": "nested/nested/nested/nested/nested/nested/nested/deeply_nested",
            },
            {
              "page": "3",
              "postId": "nested/nested/nested",
            },
            {
              "page": "4",
              "postId": "nested/nested/nested2",
            },
          ]
        `)

        const hrefList = buildFiles.contents
            .map((e) => e.meta?.href)
            .filter(Boolean)
        expect(hrefList).toMatchInlineSnapshot(`
          [
            "posts/1/img",
            "posts/1/link",
            "posts/2/markdown",
            "posts/3/nested/nested/nested/nested/nested/nested/nested/deeply_nested",
            "posts/3/nested/nested/nested",
            "posts/4/nested/nested/nested2",
          ]
        `)
    })
})
