import { describe, expect, it } from 'vitest'

import { PluginInterface } from '../plugin.interface'
import { PluginLoader } from '../plugin.loader'
import { PluginRunner } from '../plugin.runner'

import { PluginConfigStorage } from './plugin.config.storage'
import { PluginManager } from './plugin.manager'

import type { PluginInterfaceStaticConfig } from '../plugin.interface'

describe('PluginManager', () => {
    class Runner extends PluginRunner {}
    const pluginManager = new PluginManager({
        name: 'plugin-manager',
        root: `${process.cwd()}/packages/helpers/src/plugin/__fixtures__/manager_storage.json`,
        runner: new Runner(),
    })

    it('should create a new instance of PluginManager', () => {
        expect(pluginManager).toBeInstanceOf(PluginManager)
    })

    it('should have a PluginConfigStore instance', () => {
        expect(pluginManager.$config).toBeDefined()
        expect(pluginManager.$config).toBeInstanceOf(PluginConfigStorage)
    })

    it('should have a PluginLoader instance', () => {
        expect(pluginManager.$loader).toBeDefined()
        expect(pluginManager.$loader).toBeInstanceOf(PluginLoader)
    })

    it('should accept options for configuring the plugin manager', () => {
        expect(pluginManager.$config).toBeDefined()
        expect(pluginManager.$config).toBeInstanceOf(PluginConfigStorage)

        expect(pluginManager.$loader).toBeDefined()
        expect(pluginManager.$loader).toBeInstanceOf(PluginLoader)
    })

    it('should have a PluginRunner instance', () => {
        // @ts-ignore
        expect(pluginManager.$runner).toBeDefined()
        // @ts-ignore
        expect(pluginManager.$runner).toBeInstanceOf(PluginRunner)
    })

    it('should [add -> run] plugins', async () => {
        class Plugin extends PluginInterface<
            PluginInterfaceStaticConfig,
            {
                arr: number[]
            }
        > {
            constructor(id?: number) {
                super()
                this.staticConfig.name = `plugin-${id}`
            }

            protected override defineStaticConfig(): PluginInterfaceStaticConfig {
                return {
                    name: 'plugin',
                    description: 'Plugin description',
                    dynamicConfigSchema: {
                        arr: {
                            type: 'Array<number>',
                            description: 'Array of numbers',
                        },
                    },
                }
            }
            public async execute() {
                return []
            }
        }

        const plugin = new Plugin(1)
        const plugin2 = new Plugin(2)

        // Use
        pluginManager.$loader.use(plugin)
        pluginManager.$loader.use(plugin2)
        pluginManager.$loader.use([new Plugin(3), new Plugin(4)])

        // Load
        const pipes = pluginManager.$loader.load([
            {
                name: 'plugin-1',
                dynamicConfig: {
                    arr: [1, 2],
                },
            },
            {
                name: 'plugin-2',
                dynamicConfig: {
                    arr: [1, 2],
                },
            },
            {
                name: 'plugin-3',
                dynamicConfig: {
                    arr: [1, 2],
                },
            },
        ])
        // Run
        const response = await pluginManager.$runner.run(pipes, null)

        expect(response).toHaveLength(3)
    })
})
