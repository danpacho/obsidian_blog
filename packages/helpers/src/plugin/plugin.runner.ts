import type { JobManager } from '../job'
import type { PluginInterface } from './plugin.interface'

export interface PluginRunnerConstructor {
    jobManager: JobManager
}
/**
 * Manages the execution of plugin processes.
 */
export class PluginRunner {
    private readonly $jobManager: JobManager

    /**
     * Creates an instance of PluginProcessManager.
     * @param options - The options for the PluginProcessManager.
     */
    public constructor(public readonly options: PluginRunnerConstructor) {
        this.$jobManager = options.jobManager
    }

    /**
     * Runs the specified plugins.
     * @param plugins - An array of plugins to run.
     * @returns A promise that resolves to the result of plugin execution.
     */
    public async run(plugins: Array<PluginInterface>) {
        for (const plugin of plugins) {
            this.$jobManager.registerJob({
                name: plugin.config.name,
                prepare: async () => {
                    return await plugin.prepare?.()
                },
                execute: async (...args) => {
                    return await plugin.execute(...args)
                },
                cleanup: async (job) => {
                    await plugin.cleanup?.(job)
                    return
                },
            })
        }

        const pluginExecResult = await this.$jobManager.processJobs()
        return pluginExecResult
    }
}
