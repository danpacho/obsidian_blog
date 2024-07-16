/* eslint-disable @typescript-eslint/ban-ts-comment */
import { describe, expect, it } from 'vitest'
import { JobManager } from '../job'
import { PluginConfigStore } from './plugin.config.store'
import {
    PluginInterface,
    PluginInterfaceStaticConfig,
} from './plugin.interface'
import { PluginLoader } from './plugin.loader'
import { PluginManager } from './plugin.manager'
import { PluginRunner } from './plugin.runner'

describe('PluginManager', () => {
    const pluginManager = new PluginManager({
        name: 'plugin-manager',
        root: `${process.cwd()}/packages/helpers/src/plugin/__fixtures__/manager_storage.json`,
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

    it('should have a PluginRunner instance', () => {
        // @ts-ignore
        expect(pluginManager.$runner).toBeDefined()
        // @ts-ignore
        expect(pluginManager.$runner).toBeInstanceOf(PluginRunner)
    })

    it('should have a JobManager instance', () => {
        expect(pluginManager.$jobManager).toBeDefined()
        expect(pluginManager.$jobManager).toBeInstanceOf(JobManager)
    })

    it('should [add -> run] plugins', async () => {
        class Plugin extends PluginInterface {
            constructor(id?: number) {
                super()
                this.staticConfig.name = `plugin-${id}`
            }

            protected override defineStaticConfig(): PluginInterfaceStaticConfig {
                return {
                    name: 'plugin',
                    description: 'Plugin description',
                }
            }
            public async execute(): Promise<unknown> {
                return {
                    data: Math.random(),
                }
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
            },
        ])
        // Run
        const response = await pluginManager.$runner.run(pipes)

        // Check history
        const history = pluginManager.$jobManager.history
        expect(history).toHaveLength(3)
        expect(response).toStrictEqual(true)
    })
})
