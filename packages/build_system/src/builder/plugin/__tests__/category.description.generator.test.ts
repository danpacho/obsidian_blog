import { describe, it } from 'vitest'

import { CategoryDescriptionGeneratorPlugin } from '../core/walk_tree'

import { Tester } from './tester'

describe('CategoryDescriptionGeneratorPlugin', () => {
    it('should generate category description file', async () => {
        const plugin = new CategoryDescriptionGeneratorPlugin()
        plugin.injectDynamicConfig({
            descriptionFileName: 'category.md',
        })

        await Tester.pipe({
            plugin: {
                'walk:tree': plugin,
            },
        })
    })
})
