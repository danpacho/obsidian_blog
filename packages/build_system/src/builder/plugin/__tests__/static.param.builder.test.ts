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
        expect(metaList).toEqual([
            { postId: 'img', page: '1' },
            { postId: 'link', page: '1' },
            { postId: 'markdown', page: '2' },
            { postId: 'nested/nested/nested', page: '2' },
        ])

        const hrefList = buildFiles.contents.map((e) => e.meta!.href)
        expect(hrefList).toEqual([
            'posts/1/img',
            'posts/1/link',
            'posts/2/markdown',
            'posts/2/nested/nested/nested',
        ])
    })
})
