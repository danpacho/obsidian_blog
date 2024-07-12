import type { Job } from '../job'

/**
 * Plugin base configuration interface
 */
export interface PluginInterfaceConfig {
    /**
     * Unique name of the plugin.
     */
    name: string
    /**
     * Description of the plugin.
     */
    description?: string
    /**
     * Dynamic arguments description for the plugin.
     *
     * @description Should be started with \``` and ended with \```, very useful for Obsidian plugin user
     * @example
     * \```
     * ```
     * {
     *     script: Array<string>
     * }
     * ```
     * \```
     */
    argsDescription?: string
}

class PluginInterfaceError extends SyntaxError {
    public constructor(message: string, config: unknown) {
        super(`› ${message}\n› config: ${JSON.stringify(config)}`)
        this.name = 'PluginInterfaceError'
    }
}
/**
 * Represents an abstract class for a plugin interface.
 * @template InjectedPluginConfig - The type of the plugin configuration {@link PluginInterfaceConfig}.
 */
export abstract class PluginInterface<
    InjectedPluginConfig extends PluginInterfaceConfig = PluginInterfaceConfig,
    PluginArgs = 'NO_ARGS',
> {
    /**
     * Gets the configuration of the plugin.
     */
    public get config(): InjectedPluginConfig {
        return this._config
    }

    /**
     * Gets the name of the plugin.
     */
    public get name(): string {
        return this._config.name
    }

    protected _config!: InjectedPluginConfig

    /**
     * Defines the configuration for the plugin.
     */
    protected abstract defineConfig(): InjectedPluginConfig

    private validateConfig(
        config: unknown
    ): asserts config is PluginInterfaceConfig {
        const isRecord = (value: unknown): value is Record<string, unknown> =>
            typeof value === 'object' && value !== null && !Array.isArray(value)

        if (!isRecord(config)) {
            throw new PluginInterfaceError(
                'defineConfig method must return an Record<string, unknown>.',
                config
            )
        }

        Object.keys(config).forEach((key) => {
            if (typeof key !== 'string') {
                throw new PluginInterfaceError(
                    'Configuration keys must be strings.',
                    config
                )
            }
        })
        try {
            Object.values(config)
        } catch (e) {
            throw new PluginInterfaceError(
                e instanceof Error ? e.message : JSON.stringify(e),
                config
            )
        }

        const requiredKeys = ['name'] as const
        requiredKeys.forEach((key) => {
            if (!Object.keys(config).includes(key)) {
                throw new PluginInterfaceError(
                    `Configuration must have a \`${key}\` key.`,
                    config
                )
            }
        })
    }

    /**
     * Creates a new instance of the PluginInterface class.
     * - `defineConfig` method to define the configuration.
     */
    public constructor() {
        try {
            const config = this.defineConfig()
            this.validateConfig(config)
            this._config = config
        } catch (e) {
            throw new SyntaxError(
                e instanceof Error ? e.message : JSON.stringify(e)
            )
        }
    }

    /**
     * Lifecycle hooks for the job registration.
     *
     * A function that is **executed to perform** the job.
     * @param context The plugin execution context.
     * @param controller The job execution controller.
     * @example
     * ```typescript
     * {
     *      stop: () => void
     *      // Stops the job execution.
     *      next: () => void
     *      // Resumes the job execution.
     * }
     * ```
     */
    public abstract execute(
        /**
         * The plugin execution context.
         */
        context: PluginArgs extends 'NO_ARGS'
            ? {
                  /**
                   * The prepared calculation for the job. Calculated by the `prepare` function and will be passed through argument.
                   */
                  prepared?: unknown
              }
            : {
                  /**
                   * The dynamic arguments passed to the job.
                   */
                  args: PluginArgs
                  /**
                   * The prepared calculation for the job. Calculated by the `prepare` function and will be passed through argument.
                   */
                  prepared?: unknown
              },
        /**
         * The controller object for the job.
         */
        controller: {
            /**
             * Stops the job after current execution.
             */
            stop: () => void
            /**
             * Resumes the job after current execution.
             */
            resume: () => void
        } /**
         * The prepared calculation for the job.
         *
         * Calculated by the `prepare` function and will be passed through argument.
         */
    ): Promise<unknown>

    /**
     * Lifecycle hooks for the job registration.
     *
     * A function that is **executed before** the job starts.
     * It returns a promise that resolves to the prepared calculation and will be passed to the `execute` function.
     */
    public prepare?(): Promise<unknown>

    /**
     * Lifecycle hooks for the job registration.
     *
     * A function that is **executed after** the job completes.
     * @param job The completed job.
     * @returns A promise that resolves when the after-job tasks are completed.
     */
    public cleanup?(job: Job<unknown>): Promise<void>
}
