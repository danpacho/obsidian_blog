import {
    type Job,
    JobManager,
    type JobManagerConstructor,
    type JobSubscriber,
} from '@obsidian_blogger/helpers/job'

import type {
    InferPluginConfig,
    PluginInterfaceDependencies,
    PluginShape,
} from './plugin.interface'
import type { PluginExecutionResponse } from './plugin.interface'
import type { JobRegistration } from '@obsidian_blogger/helpers/job'

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
    public async run(
        pluginPipes: Array<Plugin>,
        runtimeDependencies: RuntimeDependencies
    ): Promise<this['history']> {
        for (const plugin of pluginPipes) {
            // Register jobs
            this.$pluginRunner.registerJob(
                this.registerPlugin(plugin, runtimeDependencies)
            )
        }

        // Process jobs
        await this.$pluginRunner.processJobs()

        // Return result
        return this.history
    }

    /**
     * Run before plugin prepare called.
     * @param plugin
     * @param runtimeDependencies
     */
    protected pluginPrepare?(
        plugin: Plugin,
        runtimeDependencies: RuntimeDependencies
    ): Promise<void>
    /**
     * Run before plugin execute called.
     * @param plugin
     * @param runtimeDependencies
     */
    protected pluginExecuteBefore?(
        plugin: Plugin,
        runtimeDependencies: RuntimeDependencies
    ): Promise<void>
    /**
     * Run after plugin execute called.
     * @param plugin
     * @param runtimeDependencies
     */
    protected pluginExecuteAfter?(
        plugin: Plugin,
        runtimeDependencies: RuntimeDependencies,
        response: InferPluginConfig<Plugin>['jobConfig']['response']
    ): Promise<void>
    /**
     * Run before plugin cleanup all called.
     * @param plugin
     * @param runtimeDependencies
     * @param response
     */
    protected pluginCleanupAll?(
        plugin: Plugin,
        runtimeDependencies: RuntimeDependencies,
        response: PluginRunnerExecutionResponse<
            InferPluginConfig<Plugin>['jobConfig']['response']
        >
    ): Promise<void>

    protected registerPlugin(
        plugin: Plugin,
        runtimeDependencies: RuntimeDependencies
    ): JobRegistration<
        PluginRunnerExecutionResponse<
            InferPluginConfig<Plugin>['jobConfig']['response']
        >,
        InferPluginConfig<Plugin>['jobConfig']['prepare']
    > {
        return {
            name: plugin.name,
            prepare: async () => {
                plugin.injectDependencies(runtimeDependencies)

                await this.pluginPrepare?.(plugin, runtimeDependencies)

                return await plugin.prepare?.()
            },
            execute: async (controller, preparedCalculation) => {
                await this.pluginExecuteBefore?.(plugin, runtimeDependencies)

                const response = await plugin.execute(
                    controller,
                    runtimeDependencies,
                    preparedCalculation ?? null
                )

                await this.pluginExecuteAfter?.(
                    plugin,
                    runtimeDependencies,
                    response
                )

                return response
            },
            cleanup: async (jobs) => {
                const { response } = jobs

                // each
                for (const res of response ?? []) {
                    await plugin.cleanup?.(res)
                }

                // all
                if (response) {
                    await this.pluginCleanupAll?.(
                        plugin,
                        runtimeDependencies,
                        response
                    )
                    await plugin.cleanupAll?.(response)
                }
            },
        }
    }
}
