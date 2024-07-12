/* eslint-disable @typescript-eslint/no-explicit-any */
import type { JobManager } from '../job'
import type { PluginInterface } from './plugin.interface'

export interface PluginRunnerConstructor {
    jobManager: JobManager
}

// type PluginWithArgs<Plugin> =
//     Plugin extends PluginInterface<any, infer Args>
//         ? Args extends 'NO_ARGS'
//             ? {
//                   plugin: Plugin
//               }
//             : {
//                   plugin: Plugin
//                   args: Args
//               }
//         : never

// type ExtractPluginArgs<Plugins extends readonly PluginInterface<any, any>[]> = {
//     [K in keyof Plugins]: PluginWithArgs<Plugins[K]>
// }

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
     * @param pluginPipes - Array of `plugin` and `args` to run.
     * @returns A promise that resolves to the result of plugin execution.
     */
    public async run(
        pluginPipes: Array<{
            plugin: PluginInterface
            args?: unknown
        }>
    ) {
        for (let i = 0; i < pluginPipes.length; i++) {
            const pluginRecord = pluginPipes[i]!
            this.$jobManager.registerJob({
                name: pluginRecord.plugin.config.name,
                prepare: async () => {
                    return await pluginRecord.plugin.prepare?.()
                },
                execute: async (controller, prepared) => {
                    const pluginExecutionContext =
                        'args' in pluginRecord
                            ? {
                                  args: pluginRecord.args,
                                  prepared,
                              }
                            : { prepared }
                    return await pluginRecord.plugin.execute(
                        pluginExecutionContext,
                        controller
                    )
                },
                cleanup: async (job) => {
                    await pluginRecord.plugin.cleanup?.(job)
                    return
                },
            })
        }

        const pluginExecResult = await this.$jobManager.processJobs()
        return pluginExecResult
    }
}
