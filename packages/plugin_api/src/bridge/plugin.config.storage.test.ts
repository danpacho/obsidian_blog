import { describe, expect, it } from 'vitest'
import { PluginConfigStorage } from './plugin.config.storage'

describe('PluginConfigStorage', async () => {
    const store = new PluginConfigStorage({
        name: 'build_system::build_contents',
        root: `${process.cwd()}/packages/plugin_api/src/bridge/__fixtures__/store/build/build_system::walk_tree.json`,
    })

    await store.init()
    await store.load()

    it('should create a new instance of PluginConfigStorage', async () => {
        await store.updateAllDynamicConfigByUserConfig({
            'meta-validator': {
                newConfig: (a, b) => a + b,
                $$load_status$$: 'include',
            },
            'meta-builder': {
                $$load_status$$: 'exclude',
            },
        })

        const res = store.storageRecord

        expect(res['meta-validator']!.dynamicConfig!.$$load_status$$).toBe(
            'include'
        )
        expect(res['meta-builder']!.dynamicConfig!.$$load_status$$).toBe(
            'exclude'
        )
    })
})
