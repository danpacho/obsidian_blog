import { JobManager, type JobManagerConstructor } from '../job'
import {
    PluginConfigStore,
    type PluginConfigStoreConstructor,
} from './plugin.config.store'
import type { PluginInterface } from './plugin.interface'
import { PluginLoader, type PluginLoaderConstructor } from './plugin.loader'
import { PluginRunner } from './plugin.runner'

/**
 * PluginManager constructor options.
 */
export interface PluginManagerConstructor
    extends PluginConfigStoreConstructor,
        PluginLoaderConstructor,
        JobManagerConstructor {}

type ExtractPluginConfig<Plugin> =
    Plugin extends PluginInterface<infer Config> ? Config : never
/**
 * Represents a plugin manager that handles the configuration and loading of plugins.
 * @template Plugin{@link PluginInterface} - The configuration type for the plugin. {@link PluginInterfaceConfig}
 */
export class PluginManager<Plugin extends PluginInterface = PluginInterface> {
    /**
     * The configuration store for the plugins.
     */
    public readonly $config: PluginConfigStore<ExtractPluginConfig<Plugin>>
    /**
     * The plugin loader for loading plugins.
     */
    public readonly $loader: PluginLoader<Plugin>
    /**
     * The job manager for managing plugin execution.
     */
    public readonly $jobManager: JobManager
    /**
     * The plugin runner for running plugins.
     */
    private readonly $runner: PluginRunner
    /**
     * Creates a new instance of the PluginManager class.
     *
     * @param options - Optional options for configuring the plugin manager.
     */
    public constructor(options: PluginManagerConstructor) {
        this.$config = new PluginConfigStore(options)
        this.$loader = new PluginLoader(options)
        this.$jobManager = new JobManager(options)
        this.$runner = new PluginRunner({
            jobManager: this.$jobManager,
        })
    }

    /**
     * Runs plugins
     * @param except - An array of plugin names to exclude from the run.
     * @returns A promise that resolves to the result of plugin execution.
     */
    public async run(
        runningInformation: Array<{ name: string; args?: unknown }>
    ): Promise<{
        run: Awaited<ReturnType<PluginRunner['run']>>
        save: boolean
    }> {
        const loadTarget = runningInformation.map((e) => e.name)
        const pipes = this.$loader.load(loadTarget).map((plugin) => ({
            plugin,
            args: runningInformation.find((e) => e.name === plugin.config.name),
        }))

        const runnerResult = await this.$runner.run(pipes)

        let configSaveResult: boolean = true
        for (const pipeInfo of pipes) {
            try {
                await this.$config.updateConfig(pipeInfo.plugin.config.name, {
                    config: pipeInfo.plugin
                        .config as ExtractPluginConfig<Plugin>,
                    args: pipeInfo.args?.args ?? null,
                })
            } catch {
                configSaveResult = false
            }
        }

        return {
            run: runnerResult,
            save: configSaveResult,
        }
    }
}
