import { describe, expect, it } from 'vitest'

import { StaticParamBuilderPlugin } from '../core'
import { ExcludeDraftPlugin } from '../core/build_tree/exclude_draft'

import { Tester } from './tester'

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
            { postId: 'category/category', page: '1' },
            { postId: 'category/series_1', page: '1' },
            { postId: 'category/series_2', page: '2' },
            { postId: 'img', page: '2' },
            { postId: 'link', page: '3' },
            { postId: 'markdown', page: '3' },
            {
                postId: 'nested/nested/nested/nested/nested/nested/nested/deeply_nested',
                page: '4',
            },
            { postId: 'nested/nested/nested', page: '5' },
            { postId: 'nested/nested/nested2', page: '5' },
        ])

        const hrefList = buildFiles.contents
            .map((e) => e.meta?.href)
            .filter(Boolean)

        expect(hrefList).toStrictEqual([
            'posts/1/category/category',
            'posts/1/category/series_1',
            'posts/2/category/series_2',
            'posts/2/img',
            'posts/3/link',
            'posts/3/markdown',
            'posts/4/nested/nested/nested/nested/nested/nested/nested/deeply_nested',
            'posts/5/nested/nested/nested',
            'posts/5/nested/nested/nested2',
        ])
    })
})
