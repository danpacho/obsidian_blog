import { beforeEach, describe, expect, it } from 'vitest'
import { PluginConfigStore } from './plugin.config.store'
import { PluginLoader } from './plugin.loader'
import { PluginManager } from './plugin.manager'

describe('PluginManager', () => {
    let pluginManager: PluginManager<unknown, unknown>
    beforeEach(() => {
        pluginManager = new PluginManager()
    })

    it('should create a new instance of PluginManager', () => {
        expect(pluginManager).toBeInstanceOf(PluginManager)
    })

    it('should have a PluginConfigStore instance', () => {
        expect(pluginManager.$config).toBeDefined()
        expect(pluginManager.$config).toBeInstanceOf(PluginConfigStore)
    })

    it('should have a PluginLoader instance', () => {
        expect(pluginManager.$loader).toBeDefined()
        expect(pluginManager.$loader).toBeInstanceOf(PluginLoader)
    })

    it('should accept options for configuring the plugin manager', () => {
        expect(pluginManager.$config).toBeDefined()
        expect(pluginManager.$config).toBeInstanceOf(PluginConfigStore)

        expect(pluginManager.$loader).toBeDefined()
        expect(pluginManager.$loader).toBeInstanceOf(PluginLoader)
    })
})
