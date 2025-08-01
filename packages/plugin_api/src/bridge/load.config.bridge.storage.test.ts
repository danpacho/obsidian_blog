import { IO } from '@obsidian_blogger/helpers/io'
import { beforeEach, describe, expect, it } from 'vitest'

import { PluginInterface } from '../plugin.interface'
import { PluginRunner } from '../plugin.runner'

import { LoadConfigBridgeStorage } from './load.config.bridge.storage'
import { PluginManager } from './plugin.manager'

import type { PluginDynamicConfigSchema } from '../arg_parser'
import type {
    PluginInterfaceStaticConfig,
    PluginShape,
} from '../plugin.interface'

describe('LoadConfigBridgeStorage', async () => {
    class Runner extends PluginRunner {
        public async run(pipes: Array<PluginShape>): Promise<this['history']> {
            for (const plugin of pipes) {
                this.$pluginRunner.registerJob({
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

            await this.$pluginRunner.processJobs()

            return this.history
        }
    }

    const pluginManager = new PluginManager({
        name: 'plugin-manager',
        root: 'bulk.json',
        runner: new Runner(),
    })

    const pluginManager2 = new PluginManager({
        name: 'plugin-manager2',
        root: 'bulk.json',
        runner: new Runner(),
    })

    const pluginManager3 = new PluginManager({
        name: 'plugin-manager3',
        root: 'bulk.json',
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

        public async execute() {
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

    const configBridge = new LoadConfigBridgeStorage({
        storePrefix: '.store',
        bridgeRoot: `${process.cwd()}/packages/helpers/src/plugin/__fixtures__`,
        managers: [pluginManager, pluginManager2, pluginManager3],
    })

    beforeEach(async () => {
        const io = new IO()
        await io.writer.deleteDirectory(
            `${process.cwd()}/packages/helpers/src/plugin/__fixtures__/.store`
        )
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

    it('should loaded first time', async () => {
        await configBridge.load()
    })

    it('should mark as $$load_status$$: "include" for loading, <simulated>', async () => {
        const loadAndUpdate = async (
            manager: PluginManager<PluginShape, Runner>
        ): Promise<void> => {
            await manager.$config.load()

            const names = manager.$loader.getPluginNames()
            for (const name of names) {
                const prevConfig = manager.$config.get(name)
                const newDynamicConfig = {
                    ...(prevConfig?.dynamicConfig ?? {}),
                    add: (a: number, b: number) => a + b + a * 2 + b * 2,
                }

                await manager.$config.updateDynamicConfigByUserConfig(
                    name,
                    newDynamicConfig
                )
            }
        }

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
