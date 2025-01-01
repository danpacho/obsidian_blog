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
        const imgFilename = res.buildFiles.assets.find((e) =>
            e.fileName.includes('.png')
        )
        const imgPath__replaced_origin_build_path = imgFilename?.path.replace(
            res.buildPath.assets,
            ''
        )

        expect(imgFile?.content).toContain(
            `<img src="${imgPath__replaced_origin_build_path}" alt="img.png" />`
        )
    })
})
