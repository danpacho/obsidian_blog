import { describe, expect, it } from 'vitest'
import { PluginInterface } from './plugin.interface'
import { PluginLoader } from './plugin.loader'

describe('PluginLoader', () => {
    class Plugin extends PluginInterface {
        public constructor(pluginId: number = 0) {
            super()
            this.staticConfig.name = `plugin-${pluginId}`
        }

        public override async prepare() {
            return {
                arg: 1,
            }
        }

        public async execute() {
            return {
                name: 1,
            }
        }

        protected defineStaticConfig() {
            return {
                name: 'plugin',
                description: 'Plugin description',
                myConfig: 2,
            }
        }
    }

    it('should register a single plugin', () => {
        const loader = new PluginLoader()

        const plugin = new Plugin()

        loader.use(plugin)

        expect(
            loader.load([
                {
                    name: 'plugin-0',
                },
            ])
        ).toEqual([plugin])
    })

    it('should load the unique plugin', () => {
        const loader = new PluginLoader()

        const plugins = [new Plugin(), new Plugin(), new Plugin()]

        loader.use(plugins)

        const loaded = loader.load([
            {
                name: 'plugin-0',
            },
            {
                name: 'plugin-0',
            },
            {
                name: 'plugin-0',
            },
        ])
        expect(loaded).toEqual([plugins[0]])
    })

    it('should load the with dynamic config', () => {
        const loader = new PluginLoader()

        const plugins = [new Plugin(), new Plugin(), new Plugin()]

        loader.use(plugins)

        const loaded = loader.load([
            {
                name: 'plugin-0',
                dynamicConfig: {
                    arg: 3,
                },
            },
        ])

        expect(loaded.map((e) => e.dynamicConfig)).toEqual([
            {
                arg: 3,
            },
        ])
    })

    it('should not register undefined plugin', () => {
        const loader = new PluginLoader()

        loader.use(undefined)

        expect(loader.load([])).toEqual([])
    })

    it('should not register duplicate plugins', () => {
        const loader = new PluginLoader()

        const plugin = new Plugin()

        loader.use(plugin)
        loader.use(plugin)

        expect(
            loader.load([
                {
                    name: 'plugin-0',
                },
                {
                    name: 'plugin-0',
                },
            ])
        ).toEqual([plugin])
    })

    it('should return an empty array for no plugins', () => {
        const loader = new PluginLoader()

        expect(loader.load([])).toEqual([])
    })

    it('should register class plugins with duplicate instances', () => {
        const loader = new PluginLoader()

        const plugin = new Plugin()

        // same instance
        loader.use(plugin)
        loader.use(plugin)

        const newPlugin = new Plugin(1)
        loader.use(newPlugin)

        expect(
            loader.load([
                {
                    name: 'plugin-0',
                },
                {
                    name: 'plugin-1',
                },
            ])
        ).toEqual([plugin, newPlugin])
    })

    it('should extract plugin names', () => {
        const loader = new PluginLoader()

        const plugin1 = new Plugin(1)
        const plugin2 = new Plugin(2)
        const plugin3 = new Plugin(3)

        loader.use([plugin1, plugin2, plugin3])

        expect(loader.getPluginNames()).toEqual([
            'plugin-1',
            'plugin-2',
            'plugin-3',
        ])
    })

    it('should use exact plugins from the list', () => {
        const loader = new PluginLoader()

        const plugin1 = new Plugin(1)
        const plugin2 = new Plugin(2)
        const plugin3 = new Plugin(3)

        loader.use([plugin1, plugin2, plugin3])

        expect(
            loader.load([
                {
                    name: 'plugin-2',
                },
            ])
        ).toEqual([plugin2])
    })
})
