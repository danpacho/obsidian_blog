import { describe, expect, it } from 'vitest'
import {
    PluginExecutionResponse,
    PluginInterface,
    PluginInterfaceStaticConfig,
    PluginShape,
} from './plugin.interface'
import { PluginRunner } from './plugin.runner'

describe('PluginRunner', () => {
    class Runner extends PluginRunner {
        private _count: Array<number> = []
        public get count(): Array<number> {
            return this._count
        }

        public async run(pluginPipes: PluginShape[]) {
            for (const plugin of pluginPipes) {
                this.$pluginRunner.registerJob({
                    name: plugin.name,
                    prepare: async () => {
                        this._count.push(1)
                        return await plugin.prepare?.()
                    },
                    execute: async (controller, prepared) => {
                        const res = await plugin.execute(controller, prepared)
                        return res
                    },
                    cleanup: async (job) => {
                        this._count.pop()
                        await plugin.cleanup?.(job)
                    },
                })
            }
            await this.$pluginRunner.processJobs()

            return this.history
        }
    }
    const runner = new Runner()

    class Plugin extends PluginInterface<
        PluginInterfaceStaticConfig,
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
        protected defineStaticConfig(): PluginInterfaceStaticConfig {
            return {
                name: 'plugin',
                description: 'Plugin description',
            }
        }

        public async execute(): Promise<PluginExecutionResponse> {
            return []
        }
    }

    class Plugin2 extends PluginInterface<
        PluginInterfaceStaticConfig,
        {
            buildParams: Array<number>
        }
    > {
        protected defineStaticConfig(): PluginInterfaceStaticConfig {
            return {
                name: 'plugin2',
                description: 'Plugin description',
            }
        }

        public async execute(): Promise<PluginExecutionResponse> {
            return [
                {
                    jobName: 'bulk-job-success',
                    status: 'success',
                },

                {
                    jobName: 'bulk-job-failed',
                    status: 'success',
                },
            ]
        }
    }

    it('should create a new instance of PluginProcessManager', () => {
        expect(runner).toBeInstanceOf(PluginRunner)
    })

    it('should run plugins', async () => {
        const res = await runner.run([new Plugin(), new Plugin2()])
        expect(res.length).toBe(2)
    })

    it('should add some internal logics for plugin running situations', () => {
        expect(runner.count).toEqual([])
    })

    it('should catch errors', async () => {
        const res = await runner.run([new Plugin(), new Plugin2()])
        expect(res.length).toBe(4)
    })
})
