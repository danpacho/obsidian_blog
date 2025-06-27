import { describe, expect, it } from 'vitest'

import { MetaBuilderPlugin } from '../core'

import { Tester } from './tester'

describe('MetaBuilder', () => {
    it('should generate metadata', async () => {
        const plugin = new MetaBuilderPlugin()

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': plugin,
            },
        })

        const buildedMeta = buildFiles.contents
            .map((e) => e.meta)
            .filter((e) => e !== null && Object.keys(e!).length !== 0)
        expect(
            buildedMeta.every((e) => 'description' in e! && 'update' in e)
        ).toBe(true)
    })

    it('should generate category', async () => {
        const plugin = new MetaBuilderPlugin()

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': plugin,
            },
        })

        const buildedMeta = buildFiles.contents
            .map((e) => e.meta)
            .filter((e) => e !== null && Object.keys(e!).length !== 0)
        expect(buildedMeta.find((e) => 'category' in e!)!['category']).toBe(
            'category'
        )
    })

    it('should generate series', async () => {
        const plugin = new MetaBuilderPlugin()

        const { buildFiles } = await Tester.pipe({
            plugin: {
                'walk:tree': plugin,
            },
        })

        const buildedMeta = buildFiles.contents
            .map((e) => e.meta)
            .filter((e) => e !== null && Object.keys(e!).length !== 0)
        expect(
            buildedMeta.find((e) => 'series' in e!)!['series']
        ).toStrictEqual({
            name: 'series',
            order: 1,
        })
    })
})
