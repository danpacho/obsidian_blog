import { describe, expect, it } from 'vitest'
import { PluginConfigStore } from './plugin.config.store'

describe('PluginConfigStore', () => {
    it('should add and retrieve plugin configurations', () => {
        const store = new PluginConfigStore()

        const pluginName = 'myPlugin'
        const config = { option1: 'value1', option2: 'value2' }

        store.addConfig(pluginName, config)

        expect(store.hasConfig(pluginName)).toBe(true)
        expect(store.getConfig(pluginName)).toEqual(config)
    })

    it('should update plugin configurations', () => {
        const store = new PluginConfigStore()

        const pluginName = 'myPlugin'
        const initialConfig = { option1: 'value1', option2: 'value2' }
        const updatedConfig = { option1: 'newValue1', option2: 'newValue2' }

        store.addConfig(pluginName, initialConfig)
        store.updateConfig(pluginName, updatedConfig)

        expect(store.getConfig(pluginName)).toEqual(updatedConfig)
    })

    it('should not add duplicate plugin configurations', () => {
        const store = new PluginConfigStore()

        const pluginName = 'myPlugin'
        const config = { option1: 'value1', option2: 'value2' }

        store.addConfig(pluginName, config)
        store.addConfig(pluginName, config)

        expect(Object.values(store.store).length).toBe(1)
    })

    it('should return undefined for non-existing plugin configurations', () => {
        const store = new PluginConfigStore()

        const pluginName = 'myPlugin'

        expect(store.getConfig(pluginName)).toBeUndefined()
    })
})
