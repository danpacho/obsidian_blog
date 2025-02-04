import { describe, expect, it } from 'vitest'
import { MetaImgPathMatcher } from '../core/walk:tree/meta.img.path.matcher'
import { Tester } from './tester'

describe('MetaImgPathMatcher', () => {
    it('should match image path in metadata', async () => {
        const { buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': new MetaImgPathMatcher(),
            },
        })
        const meta = buildFiles.contents
            .map((file) => file.meta)
            .find((meta) => (meta ? 'banner' in meta : false))

        expect(meta!.banner).toContain('/images')
        expect(meta!.banner).toContain('img.png')
    })
})
