import { describe, expect, it } from 'vitest'

import { ObsidianReferencePlugin } from '../core'

import { Tester } from './tester'

describe('ObsidianReferencePlugin', () => {
    it('should reference obsidian images', async () => {
        const plugin = new ObsidianReferencePlugin()
        const res = await Tester.pipe({
            plugin: {
                'build:contents': plugin,
            },
        })

        const imgFile = res.buildFiles.contents.find(
            (e) => e.fileName === 'img.md'
        )
        const content = imgFile?.content!

        const imgFileNames = res.buildFiles.assets
            .filter((e) => e.fileName.includes('.png'))
            .map((e) => e.fileName)

        const imgPath__replaced_origin_build_path = imgFileNames.map((e) =>
            e.replace(res.buildPath.assets, '')
        )

        imgPath__replaced_origin_build_path.forEach((e) => {
            expect(imgFile?.content).toContain(`src="/${e}"`)
        })

        expect(content).toContain(`width="150px"`)
        expect(content).toContain(`height="50px"`)
        expect(content).toContain(`alt="Custom Alt"`)
        expect(content).toContain(`class="obsidian-outline-anchor"`)
        expect(content).toContain(`alt="Cover"`)
        expect(content).toContain(`width="200px"`)
        expect(content).toContain(`height="100px"`)
        expect(content).toContain(`width="75px"`)
    })
})
