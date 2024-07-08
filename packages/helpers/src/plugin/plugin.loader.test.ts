import { describe, expect, it } from 'vitest'
import { PluginLoader } from './plugin.loader'

describe('PluginLoader', () => {
    it('should register a single plugin', () => {
        const loader = new PluginLoader<number>()

        const plugin = 123

        loader.use(plugin)

        expect(loader.plugins).toEqual([plugin])
    })

    it('should register an array of plugins', () => {
        const loader = new PluginLoader<string>()

        const plugins = ['plugin1', 'plugin2', 'plugin3']

        loader.use(plugins)

        expect(loader.plugins).toEqual(plugins)
    })

    it('should not register undefined plugin', () => {
        const loader = new PluginLoader<boolean>()

        loader.use(undefined)

        expect(loader.plugins).toEqual([])
    })

    it('should not register duplicate plugins', () => {
        const loader = new PluginLoader<number>()

        const plugin = 123

        loader.use(plugin)
        loader.use(plugin)

        expect(loader.plugins).toEqual([plugin])
    })

    it('should return an empty array for no plugins', () => {
        const loader = new PluginLoader<string>()

        expect(loader.plugins).toEqual([])
    })

    it('should register class plugins', () => {
        class Plugin {}

        const loader = new PluginLoader<Plugin>()

        const plugin = new Plugin()

        loader.use(plugin)

        expect(loader.plugins).toEqual([plugin])
    })

    it('should register class plugins with multiple instances', () => {
        class Plugin {}

        const loader = new PluginLoader<Plugin>()

        const plugin1 = new Plugin()
        const plugin2 = new Plugin()
        const plugin3 = new Plugin()

        loader.use([plugin1, plugin2, plugin3])

        expect(loader.plugins).toEqual([plugin1, plugin2, plugin3])
    })

    it('should register class plugins with duplicate instances', () => {
        class Plugin {}

        const loader = new PluginLoader<Plugin>()

        const plugin = new Plugin()

        // same instance
        loader.use(plugin)
        loader.use(plugin)

        const newPlugin = new Plugin()
        loader.use(newPlugin)

        expect(loader.plugins).toEqual([plugin, newPlugin])
    })
})
