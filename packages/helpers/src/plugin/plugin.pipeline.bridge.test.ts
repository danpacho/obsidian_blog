import { describe, expect, it } from 'vitest'
import {
    PluginExecutionResponse,
    PluginInterface,
    PluginInterfaceStaticConfig,
    PluginShape,
} from './plugin.interface'
import { PluginManager } from './plugin.manager'
import { PluginPipelineBridge } from './plugin.pipeline.bridge'
import { PluginRunner } from './plugin.runner'

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

    class ExamplePlugin extends PluginInterface {
        protected override defineStaticConfig(): PluginInterfaceStaticConfig {
            return {
                name: 'example-plugin',
                description: 'Example plugin',
            }
        }

        public constructor(id: number = 0) {
            super()
            this.updateStaticConfig({
                name: `example-plugin-${id}`,
            })
        }

        public async execute(): Promise<PluginExecutionResponse> {
            return []
        }
    }

    const pipelineManager = new PluginPipelineBridge({
        name: 'plugin-pipeline-bridge',
        storePrefix: '.store',
        bridgeRoot: `${process.cwd()}/packages/helpers/src/plugin/__fixtures__`,
        managerPipeline: [pluginManager, pluginManager2, pluginManager3],
    })

    it('should get history', () => {
        expect(pipelineManager.history).toStrictEqual({
            'plugin-manager': [],
            'plugin-manager2': [],
            'plugin-manager3': [],
        })
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

    it('should run plugins by pipeline', async () => {
        await pipelineManager.run()
    })

    it('simulation:: obsidian user injects plugin dynamic configuration at store', () => {
        expect(pipelineManager.storeRoots.map((e) => e.name)).toStrictEqual([
            'plugin-manager',
            'plugin-manager2',
            'plugin-manager3',
        ])
    })
})
