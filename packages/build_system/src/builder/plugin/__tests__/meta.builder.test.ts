import { describe, expect, it } from 'vitest'
import { Tester } from './tester'
import { MetaBuilderPlugin } from '../core'

describe('MetaBuilder', () => {
    it('should generate metadata', async () => {
        const plugin = new MetaBuilderPlugin()

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': plugin,
            },
        })

        console.log(buildFiles.contents.map((e) => e.meta))
    })
})
