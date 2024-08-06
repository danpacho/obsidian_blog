import { describe, expect, it } from 'vitest'
import {
    PluginInterface,
    PluginInterfaceStaticConfig,
} from './plugin.interface'
import { PluginLoader } from './plugin.loader'

describe('PluginLoader', () => {
    class PluginWithoutDynamicConfig extends PluginInterface {
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
            return []
        }

        protected defineStaticConfig(): PluginInterfaceStaticConfig {
            return {
                name: 'plugin',
                description: 'Plugin description',
            }
        }
    }

    class PluginWithDynamicConfig extends PluginInterface<
        PluginInterfaceStaticConfig,
        {
            age: number
        }
    > {
        public constructor(pluginId: number = 0) {
            super()
            this.staticConfig.name = `plugin-${pluginId}`
        }

        public async execute() {
            return []
        }

        protected defineStaticConfig(): PluginInterfaceStaticConfig {
            return {
                name: 'plugin',
                description: 'Plugin description',
                dynamicConfigSchema: {
                    age: {
                        type: 'int',
                        description: 'Age of the person',
                    },
                },
            }
        }
    }

    it('should register a single plugin', () => {
        const loader = new PluginLoader()

        const plugin = new PluginWithoutDynamicConfig()

        loader.use(plugin)

        expect(
            loader.load([
                {
                    name: 'plugin-0',
                    dynamicConfig: null,
                },
            ])
        ).toEqual([plugin])
    })

    it('should load the unique plugin', () => {
        const loader = new PluginLoader()

        const plugins = [
            new PluginWithoutDynamicConfig(),
            new PluginWithoutDynamicConfig(),
            new PluginWithoutDynamicConfig(),
        ]

        loader.use(plugins)

        const loaded = loader.load([
            {
                name: 'plugin-0',
                dynamicConfig: null,
            },
            {
                name: 'plugin-0',
                dynamicConfig: null,
            },
            {
                name: 'plugin-0',
                dynamicConfig: null,
            },
        ])
        expect(loaded).toEqual([plugins[0]])
    })

    it('should load the with dynamic config', () => {
        const loader = new PluginLoader()

        const plugins = [
            new PluginWithDynamicConfig(),
            new PluginWithDynamicConfig(),
            new PluginWithDynamicConfig(),
        ]

        loader.use(plugins)

        const loaded = loader.load([
            {
                name: 'plugin-0',
                dynamicConfig: {
                    age: 3,
                },
            },
        ])

        expect(loaded.map((e) => e.dynamicConfig)).toEqual([
            {
                age: 3,
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

        const plugin = new PluginWithoutDynamicConfig()

        loader.use(plugin)
        loader.use(plugin)

        expect(
            loader.load([
                {
                    name: 'plugin-0',
                    dynamicConfig: null,
                },
                {
                    name: 'plugin-0',
                    dynamicConfig: null,
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

        const plugin = new PluginWithoutDynamicConfig()

        // same instance
        loader.use(plugin)
        loader.use(plugin)

        const newPlugin = new PluginWithoutDynamicConfig(1)
        loader.use(newPlugin)

        expect(
            loader.load([
                {
                    name: 'plugin-0',
                    dynamicConfig: null,
                },
                {
                    name: 'plugin-1',
                    dynamicConfig: null,
                },
            ])
        ).toEqual([plugin, newPlugin])
    })

    it('should extract plugin names', () => {
        const loader = new PluginLoader()

        const plugin1 = new PluginWithoutDynamicConfig(1)
        const plugin2 = new PluginWithoutDynamicConfig(2)
        const plugin3 = new PluginWithoutDynamicConfig(3)

        loader.use([plugin1, plugin2, plugin3])

        expect(loader.getPluginNames()).toEqual([
            'plugin-1',
            'plugin-2',
            'plugin-3',
        ])
    })

    it('should use exact plugins from the list', () => {
        const loader = new PluginLoader()

        const plugin1 = new PluginWithoutDynamicConfig(1)
        const plugin2 = new PluginWithoutDynamicConfig(2)
        const plugin3 = new PluginWithoutDynamicConfig(3)

        loader.use([plugin1, plugin2, plugin3])

        expect(
            loader.load([
                {
                    name: 'plugin-2',
                    dynamicConfig: null,
                },
            ])
        ).toEqual([plugin2])
    })
})
