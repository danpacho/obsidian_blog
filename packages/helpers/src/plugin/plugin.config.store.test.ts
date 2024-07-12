import { describe, expect, it } from 'vitest'
import { PluginConfigStore } from './plugin.config.store'

describe('PluginConfigStore', () => {
    const root = `${process.cwd()}/packages/helpers/src/plugin/__fixtures__/storage.json`
    const store = new PluginConfigStore({
        name: 'plugin-config-store',
        root,
    })
    it('should reset the store', async () => {
        await store.reset()
        expect(store.store).toEqual({})
    })

    it('should add and retrieve plugin configurations', async () => {
        const pluginName = 'myPlugin'
        const config = { name: 'value1', description: 'value2' }

        await store.addConfig(pluginName, config)

        expect(store.hasConfig(pluginName)).toBe(true)
        expect(store.getConfig(pluginName)).toEqual(config)
    })

    it('should update plugin configurations', async () => {
        const pluginName = 'myPlugin'
        const initialConfig = { name: 'value1', description: 'value2' }
        const updatedConfig = { name: 'newValue1', description: 'newValue2' }

        await store.addConfig(pluginName, initialConfig)
        await store.updateConfig(pluginName, updatedConfig)

        expect(store.getConfig(pluginName)).toEqual(updatedConfig)
    })

    it('should not add duplicate plugin configurations', async () => {
        const pluginName = 'myPlugin'
        const config = { name: 'value1', description: 'value2' }

        await store.addConfig(pluginName, config)
        await store.addConfig(pluginName, config)

        expect(Object.values(store.store).length).toBe(1)
    })

    it('should inquire existing plugin configurations', () => {
        const pluginName = 'myPlugin'

        expect(store.getConfig(pluginName)).toStrictEqual({
            name: 'newValue1',
            description: 'newValue2',
        })
    })
})
