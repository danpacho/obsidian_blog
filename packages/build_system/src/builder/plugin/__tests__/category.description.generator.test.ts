import { describe, expect, it } from 'vitest'
import { Tester } from './tester'
import { CategoryDescriptionGeneratorPlugin } from '../core/walk_tree'

describe('CategoryDescriptionGeneratorPlugin', () => {
    it('should generate category description file', async () => {
        const plugin = new CategoryDescriptionGeneratorPlugin()
        plugin.injectDynamicConfig({
            descriptionFileName: 'category.md',
        })

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': plugin,
            },
        })
    })
})
