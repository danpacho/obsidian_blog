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

        const imgFileNames = res.buildFiles.assets
            .filter((e) => e.fileName.includes('.png'))
            .map((e) => e.fileName)

        const imgPath__replaced_origin_build_path = imgFileNames.map((e) =>
            e.replace(res.buildPath.assets, '')
        )

        imgPath__replaced_origin_build_path.forEach((e) => {
            expect(imgFile?.content).toContain(`src="/${e}"`)
        })
    })
})
