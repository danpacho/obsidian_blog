/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    JobManager,
    type Job,
    type JobManagerConstructor,
    type JobSubscriber,
} from '@obsidian_blogger/helpers/job'
import type {
    PluginShape,
    InferPluginConfig,
    PluginInterfaceDependencies,
} from './plugin.interface'
import type { PluginExecutionResponse } from './plugin.interface'

export type PluginRunnerExecutionResponse<Response = unknown> =
    PluginExecutionResponse<Response>
export class PluginRunnerJobManager<Response = unknown> extends JobManager<
    PluginRunnerExecutionResponse<Response>
> {
    protected override jobSuccessStatusCalculation(
        pluginResponse: PluginRunnerExecutionResponse<Response>
    ): boolean {
        const isError = pluginResponse.some(({ status }) => status === 'failed')
        return !isError
    }
}
export interface PluginRunnerConstructor extends JobManagerConstructor {}
/**
 * Manages the execution of plugin processes.
 */
export abstract class PluginRunner<
    Plugin extends PluginShape = PluginShape,
    RuntimeDependencies extends
        PluginInterfaceDependencies | null = PluginInterfaceDependencies | null,
> {
    protected readonly $pluginRunner: PluginRunnerJobManager<
        InferPluginConfig<Plugin>['jobConfig']['response']
    >

    /**
     * Creates an instance of PluginProcessManager.
     * @param options - The options for the PluginProcessManager.
     */
    public constructor(public readonly options?: PluginRunnerConstructor) {
        this.$pluginRunner = new PluginRunnerJobManager(options)
    }

    /**
     * Subscribes to job progress.
     * @param subscriber - subscriber function.
     */
    public subscribe(
        subscriber: JobSubscriber<
            Job<InferPluginConfig<Plugin>['jobConfig']['response']>
        >
    ) {
        return this.$pluginRunner.subscribeJobProgress(subscriber)
    }

    /**
     * Gets the history of plugin executions.
     */
    public get history(): Array<
        Job<
            PluginRunnerExecutionResponse<
                InferPluginConfig<Plugin>['jobConfig']['response']
            >
        >
    > {
        return this.$pluginRunner.history
    }

    /**
     * Runs the specified plugins.
     * @param pluginPipes - Array of `plugin` and `args` to run.
     * @param options - Additional options for the plugin runner.
     * @returns A promise that resolves to the result of plugin execution.
     * @example
     * ```ts
     *  for (const plugin of pluginPipes) {
            this.$pluginRunner.registerJob({
                name: plugin.name,
                prepare: async () => {
                    return await plugin.prepare?.()
                },
                execute: async (controller, prepared) => {
                    return await plugin.execute(controller, prepared)
                },
                cleanup: async (job) => {
                    for (const res of job.response) {
                        await plugin.cleanup?.(job)
                    }
                },
            })
        }

        await this.$pluginRunner.processJobs()

        return this.history
     * ```
     */
    public abstract run(
        pluginPipes: Array<Plugin>,
        runtimeDependencies?: RuntimeDependencies
    ): Promise<this['history']>
}
