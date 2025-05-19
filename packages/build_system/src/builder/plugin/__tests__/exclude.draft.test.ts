import { describe, expect, it } from 'vitest'
import { Tester } from './tester'
import { ExcludeDraftPlugin } from '../core/build_tree/exclude_draft'

describe('ExcludeDraft', () => {
    it('should exclude drafted files', async () => {
        const plugin = new ExcludeDraftPlugin()
        plugin.injectDynamicConfig({
            draftPropertyName: '$draft$',
        })

        const { buildFileNames } = await Tester.pipe({
            plugin: {
                'build:tree': plugin,
            },
        })

        expect(
            buildFileNames.contents.some((e) => e.includes('drafted.md'))
        ).toBe(false)
    })
})
