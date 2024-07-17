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

        await store.addConfig(pluginName, { staticConfig: config })

        expect(store.hasConfig(pluginName)).toBe(true)
        expect(store.getConfig(pluginName)).toEqual({
            staticConfig: config,
            dynamicConfig: null,
        })
    })

    it('should update plugin configurations', async () => {
        const pluginName = 'myPlugin'
        const initialConfig = { name: 'value1', description: 'value2' }
        const updatedConfig = { name: 'newValue1', description: 'newValue2' }

        await store.addConfig(pluginName, { staticConfig: initialConfig })
        await store.updateConfig(pluginName, { staticConfig: updatedConfig })

        expect(store.getConfig(pluginName)).toEqual({
            staticConfig: updatedConfig,
            dynamicConfig: null,
        })
    })

    it('should not add duplicate plugin configurations', async () => {
        const pluginName = 'myPlugin'
        const config = { name: 'value1', description: 'value2' }

        await store.addConfig(pluginName, { staticConfig: config })
        await store.addConfig(pluginName, { staticConfig: config })

        expect(Object.values(store.store).length).toBe(1)
    })

    it('should inquire existing plugin configurations with args', async () => {
        const pluginName = 'myPlugin'
        const args = { key: 'value' }

        await store.updateConfig(pluginName, {
            staticConfig: { name: 'value1', description: 'value2' },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            dynamicConfig: args,
        })
        expect(store.getConfig(pluginName)).toStrictEqual({
            staticConfig: {
                name: 'value1',
                description: 'value2',
            },
            dynamicConfig: args,
        })
    })

    it('should inquire existing plugin configurations', () => {
        const pluginName = 'myPlugin'

        expect(store.getConfig(pluginName)).toStrictEqual({
            staticConfig: {
                name: 'value1',
                description: 'value2',
            },
            dynamicConfig: {
                key: 'value',
            },
        })
    })
})
