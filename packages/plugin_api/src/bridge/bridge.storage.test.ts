import { describe, expect, it } from 'vitest'

import { BuildBridgeStorage } from './bridge.storage'
describe('BridgeStorage', () => {
    const storage = BuildBridgeStorage.create({
        bridgeRoot: `${process.cwd()}/packages/plugin_api/src/bridge/__fixtures__`,
        storePrefix: 'store/build',
        configNames: [
            `build_system__build_contents`,
            `build_system__build_tree`,
            `build_system__walk_tree`,
        ],
    })

    it('should create a new instance of BuildBridgeStorage', () => {
        expect(storage).toBeDefined()
    })

    it('should load data before use', async () => {
        await storage.load()
    })

    it('should modify the dynamic config for include, exclude', async () => {
        const config = storage.config('build_system__build_contents')
        await config.updateAllDynamicConfigByUserConfig({
            'obsidian-reference': {
                $$load_status$$: 'include',
            },
        })
    })

    it('should inquire configs', () => {
        const res = storage.config('build_system__build_contents').storageRecord
        expect(res).toEqual({
            'obsidian-reference': {
                staticConfig: {
                    dynamicConfigSchema: {
                        disableCache: {
                            type: 'boolean',
                            description:
                                'Whether to disable caching for the plugin',
                            defaultValue: false,
                            optional: true,
                        },
                    },
                    name: 'obsidian-reference',
                    description:
                        'convert obsidian image and audio reference to html tag and update link tag',
                },
                dynamicConfig: {
                    $$load_status$$: 'include',
                    disableCache: false,
                },
            },
        })
    })

    it('should inquire history', () => {
        const historyKeys = [...storage.history.storage.keys()]
        expect(historyKeys).toStrictEqual([
            'build_system__internal',
            'build_system__build_tree',
            'build_system__walk_tree',
            'build_system__build_contents',
        ])
    })
})
