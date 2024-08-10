import { describe, expect, it } from 'vitest'
import { PluginConfigStorage } from './plugin.config.storage'

describe('PluginConfigStore', () => {
    const root = `${process.cwd()}/packages/helpers/src/plugin/__fixtures__/storage.json`
    const store = new PluginConfigStorage({
        name: 'plugin-config-store',
        root,
    })

    it('should update plugin configurations', async () => {
        const pluginName = 'myPlugin'
        const initialConfig = { name: 'value1', description: 'value2' }
        const updatedConfig = { name: 'newValue1', description: 'newValue2' }

        await store.addConfig(pluginName, { staticConfig: initialConfig })
        await store.updateConfig(pluginName, { staticConfig: updatedConfig })

        expect(store.get(pluginName)).toEqual({
            staticConfig: updatedConfig,
            dynamicConfig: null,
        })
    })

    it('should not add duplicate plugin configurations', async () => {
        const pluginName = 'myPlugin'
        const config = { name: 'value1', description: 'value2' }

        await store.addConfig(pluginName, { staticConfig: config })
        await store.addConfig(pluginName, { staticConfig: config })

        expect([...store.storage.keys()]).toStrictEqual([pluginName])
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
        expect(store.get(pluginName)).toStrictEqual({
            staticConfig: {
                name: 'value1',
                description: 'value2',
            },
            dynamicConfig: args,
        })
    })

    it('should inquire existing plugin configurations', () => {
        const pluginName = 'myPlugin'

        expect(store.get(pluginName)).toStrictEqual({
            staticConfig: {
                name: 'value1',
                description: 'value2',
            },
            dynamicConfig: {
                key: 'value',
            },
        })
    })

    it('should add function and regex correctly', async () => {
        const pluginName = 'myPlugin'
        const args = { key: 'value' }
        const add = (a: number, b: number) => a + b
        const regex = /test/

        await store.updateConfig(pluginName, {
            staticConfig: { name: 'value1', description: 'value2' },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            dynamicConfig: { ...args, add, regex },
        })

        expect(store.get(pluginName)).toStrictEqual({
            staticConfig: {
                name: 'value1',
                description: 'value2',
            },
            dynamicConfig: { key: 'value', add, regex },
        })

        expect(store.storageJson).toContain('add')
    })
})
