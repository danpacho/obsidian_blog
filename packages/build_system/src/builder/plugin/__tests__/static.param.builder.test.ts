import { describe, expect, it } from 'vitest'
import { Tester } from './tester'
import { StaticParamBuilderPlugin } from '../core'
import { ExcludeDraftPlugin } from '../core/build_tree/exclude_draft'

describe('StaticParamBuilderPlugin', () => {
    it('should inject static params to the content', async () => {
        const draft = new ExcludeDraftPlugin()
        const plugin = new StaticParamBuilderPlugin()
        plugin.injectDynamicConfig({
            prefix: 'posts',
            paramShape: '/[$page]/[...postId]',
            maxPage: 2,
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'build:tree': draft,
                'walk:tree': plugin,
            },
        })

        const metaList = buildFiles.contents
            .map((e) => e.meta!.params)
            .filter(Boolean)
        expect(metaList).toStrictEqual([
            { postId: 'img', page: '1' },
            { postId: 'link', page: '1' },
            { postId: 'markdown', page: '2' },
            {
                postId: 'nested/nested/nested/nested/nested/nested/nested/deeply_nested',
                page: '3',
            },
            { postId: 'nested/nested/nested', page: '3' },
            { postId: 'nested/nested/nested2', page: '4' },
        ])

        const hrefList = buildFiles.contents
            .map((e) => e.meta?.href)
            .filter(Boolean)

        expect(hrefList).toStrictEqual([
            'posts/1/img',
            'posts/1/link',
            'posts/2/markdown',
            'posts/3/nested/nested/nested/nested/nested/nested/nested/deeply_nested',
            'posts/3/nested/nested/nested',
            'posts/4/nested/nested/nested2',
        ])
    })
})
