/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    type Job,
    JobManager,
    type JobManagerConstructor,
    type JobSubscriber,
} from '../job'
import type {
    PluginExecutionResponse,
    PluginInterfaceDependencies,
    PluginShape,
} from './plugin.interface'

export interface PluginRunnerConstructor extends JobManagerConstructor {}
/**
 * Manages the execution of plugin processes.
 */
export abstract class PluginRunner<
    Plugin extends PluginShape = PluginShape,
    RuntimeDependencies extends
        PluginInterfaceDependencies | null = PluginInterfaceDependencies | null,
> {
    protected readonly $jobManager: JobManager<PluginExecutionResponse>

    /**
     * Creates an instance of PluginProcessManager.
     * @param options - The options for the PluginProcessManager.
     */
    public constructor(public readonly options?: PluginRunnerConstructor) {
        this.$jobManager = new JobManager(options)
    }

    /**
     * Subscribes to job progress.
     * @param subscriber - subscriber function.
     */
    public subscribe(subscriber: JobSubscriber<Job>) {
        return this.$jobManager.subscribeJobProgress(subscriber)
    }

    /**
     * Gets the history of plugin executions.
     */
    public get history() {
        return this.$jobManager.history
    }

    /**
     * Runs the specified plugins.
     * @param pluginPipes - Array of `plugin` and `args` to run.
     * @param options - Additional options for the plugin runner.
     * @returns A promise that resolves to the result of plugin execution.
     * @example
     * ```ts
     *  for (const plugin of pluginPipes) {
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
     * ```
     */
    public abstract run(
        pluginPipes: Array<Plugin>,
        runtimeDependencies?: RuntimeDependencies
    ): Promise<this['history']>
}
