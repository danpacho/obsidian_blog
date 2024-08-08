import { describe, expect, it } from 'vitest'
import { PluginDynamicConfigSchema } from '../arg_parser'
import {
    PluginExecutionResponse,
    PluginInterface,
    PluginInterfaceStaticConfig,
    PluginShape,
} from '../plugin.interface'
import { PluginManager } from '../plugin.manager'
import { PluginRunner } from '../plugin.runner'
import { LoadConfigBridgeStore } from './load.config.store'

describe('PluginPipelineBridge', async () => {
    class Runner extends PluginRunner {
        public async run(pipes: Array<PluginShape>): Promise<this['history']> {
            for (const plugin of pipes) {
                this.$jobManager.registerJob({
                    name: plugin.name,
                    prepare: async () => {
                        return await plugin.prepare?.()
                    },
                    execute: async (controller, prepared) => {
                        return await plugin.execute(controller, prepared)
                    },
                    cleanup: async (job) => {
                        await plugin.cleanup?.(job)
                    },
                })
            }

            await this.$jobManager.processJobs()

            return this.history
        }
    }

    const pluginManager = new PluginManager({
        name: 'plugin-manager',
        root: 'bulk.json',
        lateInit: true,
        runner: new Runner(),
    })

    const pluginManager2 = new PluginManager({
        name: 'plugin-manager2',
        root: 'bulk.json',
        lateInit: true,
        runner: new Runner(),
    })

    const pluginManager3 = new PluginManager({
        name: 'plugin-manager3',
        root: 'bulk.json',
        lateInit: true,
        runner: new Runner(),
    })

    class ExamplePlugin extends PluginInterface<
        PluginInterfaceStaticConfig,
        {
            add: (a: number, b: number) => number
        }
    > {
        protected override defineStaticConfig(): PluginInterfaceStaticConfig {
            return {
                name: 'example-plugin',
                description: 'Example plugin',
            }
        }

        public override baseDynamicConfigSchema(): PluginDynamicConfigSchema {
            return {
                add: {
                    type: 'Function',
                    description: 'Add two numbers',
                    defaultValue: (a: number, b: number) => a + b,
                    typeDescription: '(a: number, b: number): number',
                },
            }
        }

        public constructor(id: number = 0) {
            super()
            this.updateStaticConfig({
                name: `example-plugin-${id}`,
                description: 'Example plugin',
            })
        }

        public async execute(): Promise<PluginExecutionResponse> {
            this.$jobManager.registerJob({
                name: this.staticConfig.name,
                execute: async () => {
                    return 1
                },
            })

            await this.$jobManager.processJobs()

            return this.$jobManager.history
        }
    }

    const configBridge = new LoadConfigBridgeStore({
        storePrefix: '.store',
        bridgeRoot: `${process.cwd()}/packages/helpers/src/plugin/__fixtures__`,
        managers: [pluginManager, pluginManager2, pluginManager3],
    })

    it('should use plugin in each manager', () => {
        const plugins = [
            new ExamplePlugin(0),
            new ExamplePlugin(1),
            new ExamplePlugin(2),
        ]
        pluginManager.$loader.use(plugins)
        pluginManager2.$loader.use(plugins)
        pluginManager3.$loader.use(plugins)
    })

    it('should mark as $$load_status$$: "include" for loading, <simulated>', async () => {
        const loadAndUpdate = async (
            manager: PluginManager<PluginShape, Runner>
        ): Promise<void> => {
            await manager.$config.load()

            const names = manager.$loader.getPluginNames()

            for (const name of names) {
                const prevConfig = manager.$config.getConfig(name)
                const newDynamicConfig = {
                    ...(prevConfig?.dynamicConfig ?? {}),
                    $$load_status$$: 'include',
                }

                await manager.$config.updateDynamicConfig(
                    name,
                    newDynamicConfig
                )
            }
        }

        await configBridge.loadInformation(pluginManager.options.name)
        await configBridge.loadInformation(pluginManager2.options.name)
        await configBridge.loadInformation(pluginManager3.options.name)

        await loadAndUpdate(pluginManager)
        await loadAndUpdate(pluginManager2)
        await loadAndUpdate(pluginManager3)
    })

    it('should load plugin information correctly', async () => {
        const loaded = await configBridge.loadInformation(
            pluginManager.options.name
        )
        const loaded2 = await configBridge.loadInformation(
            pluginManager2.options.name
        )
        const loaded3 = await configBridge.loadInformation(
            pluginManager3.options.name
        )
        expect(loaded.map((e) => e.name)).toStrictEqual([
            'example-plugin-0',
            'example-plugin-1',
            'example-plugin-2',
        ])
        expect(loaded2.map((e) => e.name)).toStrictEqual([
            'example-plugin-0',
            'example-plugin-1',
            'example-plugin-2',
        ])
        expect(loaded3.map((e) => e.name)).toStrictEqual([
            'example-plugin-0',
            'example-plugin-1',
            'example-plugin-2',
        ])
    })
})
