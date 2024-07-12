/* eslint-disable @typescript-eslint/ban-ts-comment */
import { describe, expect, it } from 'vitest'
import { JobManager } from '../job'
import { PluginConfigStore } from './plugin.config.store'
import { PluginInterface, PluginInterfaceConfig } from './plugin.interface'
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
                this.config.name = `plugin-${id}`
            }

            protected override defineConfig(): PluginInterfaceConfig {
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
        pluginManager.$loader.use(plugin)

        const plugin2 = new Plugin(2)
        pluginManager.$loader.use(plugin2)

        const plugins = [new Plugin(3), new Plugin(4)]
        pluginManager.$loader.use(plugins)

        await pluginManager.$config.load()
        const response = await pluginManager.run([
            {
                name: 'plugin-1',
                args: {
                    arr: [1, 2],
                },
            },
            {
                name: 'plugin-2',
                args: {
                    arr: [1, 2],
                },
            },
            {
                name: 'plugin-3',
            },
        ])

        expect(response).toStrictEqual({
            run: true,
            save: true,
        })

        const history = pluginManager.$jobManager.history
        expect(history).toHaveLength(3)
    })
})
