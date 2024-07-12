import { beforeEach, describe, expect, it } from 'vitest'
import { JobManager } from '../job'
import { PluginInterface, PluginInterfaceConfig } from './plugin.interface'
import { PluginRunner } from './plugin.runner'

describe('PluginRunner', () => {
    let pluginProcessManager: PluginRunner
    let jobManager: JobManager

    class Plugin extends PluginInterface<
        PluginInterfaceConfig,
        {
            arr: Array<number>
        }
    > {
        public async run() {
            return {
                run: 'plugin',
                result: new Date().getSeconds(),
            }
        }
        protected defineConfig(): PluginInterfaceConfig {
            return {
                name: 'plugin',
                description: 'Plugin description',
            }
        }

        public async execute(context: {
            args: { arr: Array<number> }
            prepared?: unknown
        }): Promise<unknown> {
            return context
        }
    }

    class Plugin2 extends PluginInterface<
        PluginInterfaceConfig,
        {
            buildParams: Record<string, unknown>
        }
    > {
        public async run() {
            return {
                run: 'plugin2',
                result: new Date().getSeconds(),
            }
        }
        protected defineConfig(): PluginInterfaceConfig {
            return {
                name: 'plugin',
                description: 'Plugin description',
            }
        }

        public async execute(context: {
            args: { buildParams: Record<string, unknown> }
            prepared?: unknown
        }): Promise<unknown> {
            return context
        }
    }

    beforeEach(() => {
        jobManager = new JobManager()
        pluginProcessManager = new PluginRunner({
            jobManager,
        })
    })

    it('should create a new instance of PluginProcessManager', () => {
        expect(pluginProcessManager).toBeInstanceOf(PluginRunner)
    })

    it('should run plugins', async () => {
        const res = await pluginProcessManager.run([
            {
                plugin: new Plugin(),
                args: {
                    arr: [1, 2],
                },
            },
            {
                plugin: new Plugin2(),
                args: {
                    buildParams: { key: 'value' },
                },
            },
        ])
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(jobManager.history[0]?.response?.args).toStrictEqual({
            arr: [1, 2],
        })
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(jobManager.history[1]?.response?.args).toStrictEqual({
            buildParams: { key: 'value' },
        })
        expect(res).toBe(true)
    })
})
