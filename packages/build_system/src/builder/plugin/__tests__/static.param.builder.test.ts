import { describe, expect, it } from 'vitest'
import { StaticParamBuilderPlugin } from '../core/walk:tree/static.param.builder'
import { Tester } from './tester'

describe('StaticParamBuilderPlugin', () => {
    it('should inject static params to the content', async () => {
        const plugin = new StaticParamBuilderPlugin()
        plugin.injectDynamicConfig({
            paramShape: '/[...posts]',
        })

        const { buildFileNames, buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': plugin,
            },
        })

        const metaList = buildFiles.contents.map((e) => e.meta!.params)
        const expectedPostParams = buildFileNames.contents.map((e) => {
            const param = e.split('.').slice(0, -1)[0]
            return {
                posts: param,
            }
        })
        expect(metaList).toEqual(expectedPostParams)
    })
})
