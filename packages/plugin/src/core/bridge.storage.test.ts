import { describe, expect, it } from 'vitest'
import { BuildBridgeStorage } from './bridge.storage'

describe('BridgeStorage', () => {
    const storage = BuildBridgeStorage.create({
        bridgeRoot: `${process.cwd()}/packages/plugin/src/core/__fixtures__`,
        storePrefix: 'store/build',
        configNames: [
            'build_system::build_contents',
            'build_system::build_tree',
            'build_system::walk_tree',
        ],
    })

    it('should create a new instance of BuildBridgeStorage', () => {
        expect(storage).toBeDefined()
    })

    it('should be initialized', async () => {
        await storage.load()
        expect(storage).toBeDefined()
    })

    it('should inquire configs', () => {
        const res = storage.config('build_system::build_contents').storageRecord
        expect(res).toEqual({
            'obsidian-reference': {
                staticConfig: {
                    name: 'obsidian-reference',
                    description:
                        'convert obsidian image and audio reference to html tag and update link tag',
                },
                dynamicConfig: null,
            },
        })
    })

    it('should inquire history', () => {
        const historyKeys = [...storage.history.storage.keys()]
        expect(historyKeys).toStrictEqual([
            'build_system::internal',
            'build_system::build_tree',
            'build_system::walk_tree',
            'build_system::build_contents',
        ])
    })
})
