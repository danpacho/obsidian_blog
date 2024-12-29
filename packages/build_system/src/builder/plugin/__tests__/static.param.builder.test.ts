import { describe, expect, it } from 'vitest'
import { StaticParamBuilderPlugin } from '../core/walk:tree/static.param.builder'
import { Tester } from './tester'

describe('StaticParamBuilderPlugin', () => {
    it('should inject static params to the content', async () => {
        const plugin = new StaticParamBuilderPlugin()
        plugin.injectDynamicConfig({
            paramShape: '/posts/$page/[...posts]',
            maxPage: 2,
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': plugin,
            },
        })

        const metaList = buildFiles.contents.map((e) => e.meta!.params)
        expect(metaList).toEqual([
            {
                posts: 'posts/1/img',
            },
            {
                posts: 'posts/1/link',
            },
            {
                posts: 'posts/2/markdown',
            },
            {
                posts: 'posts/2/nested/nested/nested',
            },
        ])
    })
})
