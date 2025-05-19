import { describe, expect, it } from 'vitest'
import { Tester } from './tester'
import { ExcludeDraft } from '../core/build_tree/exclude_draft'

describe('ExcludeDraft', () => {
    it('should exclude drafted files', async () => {
        const plugin = new ExcludeDraft()
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
