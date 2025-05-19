import { describe, expect, it } from 'vitest'
import { Tester } from './tester'
import { MetaBuilderPlugin, SeriesInfoGeneratorPlugin } from '../core'

describe('SeriesInfoGeneratorPlugin', () => {
    it('should generate metadata', async () => {
        const metaBuilder = new MetaBuilderPlugin()
        const plugin = new SeriesInfoGeneratorPlugin()

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': [metaBuilder, plugin],
            },
        })

        const buildedMeta = buildFiles.contents
            .map((e) => e.meta)
            .filter(
                (e) =>
                    e !== null &&
                    Object.keys(e!).length !== 0 &&
                    'seriesInfo' in e
            )
            .map((e) => e!['seriesInfo'])

        expect(buildedMeta.length).toBe(2)
    })
})
