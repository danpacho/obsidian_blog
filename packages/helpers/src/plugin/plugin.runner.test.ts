import { beforeEach, describe, expect, it } from 'vitest'
import { JobManager } from '../job'
import { PluginInterface, PluginInterfaceConfig } from './plugin.interface'
import { PluginRunner } from './plugin.runner'

describe('PluginRunner', () => {
    let pluginProcessManager: PluginRunner
    let jobManager: JobManager

    class Plugin extends PluginInterface {
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

        public async execute() {
            return {}
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
        const plugins: Array<Plugin> = [new Plugin(), new Plugin()]

        const res = await pluginProcessManager.run(plugins)
        expect(res).toBe(true)
    })
})
