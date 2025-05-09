/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Job,
    JobManager,
    type JobManagerConstructor,
    type JobRegistration,
} from '@obsidian_blogger/helpers/job'
import {
    DynamicConfigParser,
    type PluginDynamicConfigPrimitiveType,
    type PluginDynamicConfigSchema,
} from './arg_parser'
/**
 * Plugin base static configuration interface
 */
export interface PluginInterfaceStaticConfig {
    /**
     * Unique name of the plugin.
     */
    name: string
    /**
     * Description of the plugin.
     */
    description: string
    /**
     * Dynamic config schema for plugin,
     * **will be rendered at `obsidian` plugin.**
     * @example
     * ```ts
     * const schema: PluginDynamicConfigSchema = {
     *     name: {
     *         type: 'Array<string>',
     *         description: 'Names',
     *         defaultValue: ['John Doe'],
     *     },
     *     func: {
     *         type: 'Function',
     *         description: 'Add two number',
     *         defaultValue: (a, b) => a + b,
     *         typeDescription: '(a: number, b: number): number'
     *     }
     * }
     * ```
     * @example
     * ```bash
     * // Rendered as
     * -------------------------------------
     * [Name]:
     *  ▶️ type: Array<string>
     *  ▶️ description: Names
     *  ▶️ input: [ 'John Doe' <default> ]
     * -------------------------------------
     * [Func]:
     *  ▶️ type: Function
     *  ▶️ typeDescription: (a: number, b: number): number
     *  ▶️ description: Add two number
     *  ▶️ input: [ '(a, b) => a + b' <default> ]
     * -------------------------------------
     * ```
     */
    dynamicConfigSchema?: PluginDynamicConfigSchema
    /**
     * Job manager option.
     */
    jobManagerConfig?: JobManagerConstructor
}

/**
 * Plugin execution response
 * @example
 * ```ts
 * const response: PluginExecutionResponse = [
 * {
 *      jobName: 'job-name',
 *      status: 'success',
 *      startedAt: new Date(),
 *      endedAt: new Date(),
 *      execTime: 1000,
 *      response: 'response',
 * },
 * ...
 * ]
 */
export type PluginExecutionResponse<ExecutionResponse = unknown> = Array<
    Job<ExecutionResponse>
>

class PluginInterfaceError extends SyntaxError {
    public constructor(message: string, config: unknown, cause?: unknown) {
        super(`› ${message}\n› config: ${JSON.stringify(config)}`)
        this.name = 'PluginInterfaceError'
        this.cause = cause
    }
}

/**
 * Plugin dynamic configuration
 */
export interface PluginInterfaceDynamicConfig {
    [key: string]:
        | PluginDynamicConfigPrimitiveType
        | PluginInterfaceDynamicConfig
}

/**
 * Plugin run-time dependencies
 */
export interface PluginInterfaceDependencies {}

/**
 * Shape of the plugin
 */
export type PluginShape = PluginInterface<
    PluginInterfaceStaticConfig,
    PluginInterfaceDynamicConfig | null,
    PluginInterfaceDependencies | null,
    {
        prepare: unknown
        response: unknown
    }
>

/**
 * Plugin configuration
 */
export type PluginConfig<
    PluginStaticConfig extends
        PluginInterfaceStaticConfig = PluginInterfaceStaticConfig,
    PluginDynamicConfig extends
        PluginInterfaceDynamicConfig | null = PluginInterfaceDynamicConfig | null,
> = {
    /**
     * Static configuration of plugin
     */
    staticConfig: PluginStaticConfig
    /**
     * Dynamic configuration of plugin
     */
    dynamicConfig?: PluginDynamicConfig
}

/**
 * Infer the configuration of the plugin
 * @example
 * ```ts
 * type Configs = InferInferPluginConfig<MyPluginClass>
 * ```
 */
export type InferPluginConfig<Plugin> =
    Plugin extends PluginInterface<
        infer Static,
        infer Dynamic,
        infer Dependencies,
        infer JobConfig
    >
        ? {
              staticConfig: Static
              dynamicConfig: Dynamic
              dependencies: Dependencies
              jobConfig: JobConfig
          }
        : never

/**
 * Represents an abstract class for a plugin interface.
 * @template StaticConfig - The type of the plugin configuration {@link PluginInterfaceStaticConfig}.
 * @template DynamicConfig - The type of the plugin configuration {@link PluginInterfaceDynamicConfig}
 */
export abstract class PluginInterface<
    StaticConfig extends
        PluginInterfaceStaticConfig = PluginInterfaceStaticConfig,
    DynamicConfig extends PluginInterfaceDynamicConfig | null = null,
    Dependencies extends PluginInterfaceDependencies | null = null,
    PluginJobConfig extends {
        response: any
        prepare: any
    } = {
        response: unknown
        prepare: unknown
    },
> implements
        JobRegistration<PluginJobConfig['response'], PluginJobConfig['prepare']>
{
    /** 👇 phantom field – never touched at run-time */
    protected readonly __marker!: {
        static: StaticConfig
        dynamic: DynamicConfig
        dependencies: Dependencies
        job: PluginJobConfig
    }
    protected static readonly $dynamicConfigParser: DynamicConfigParser =
        new DynamicConfigParser()
    protected readonly $jobManager: JobManager<PluginJobConfig['response']>
    /**
     * Gets the history of plugin executions.
     */
    public get history() {
        return this.$jobManager.history
    }
    /**
     * Gets the runtime dependencies of the plugin.
     */
    public get dependencies() {
        return this._runTimeDependencies
    }
    private _runTimeDependencies: Dependencies | null = null

    /**
     * Retrieves a runtime dependency by deps key.
     * @param key - The key of the dependency.
     * @returns The runtime dependency.
     * @throws Error if the plugin dependencies are not injected.
     */
    protected getRunTimeDependency<const DepsKey extends keyof Dependencies>(
        key: DepsKey
    ): Dependencies[DepsKey] {
        const deps = String(key)
        if (!this._runTimeDependencies) {
            throw new Error(
                `Plugin dependencies not injected.\nPlease do not use $ signed properties inside of the constructor.\nError dependencies at ${deps}`,
                {
                    cause: [
                        'Plugin dependencies not injected',
                        'Use $ signed properties inside of the constructor',
                        `Error dependencies at ${deps}`,
                    ],
                }
            )
        }
        return this._runTimeDependencies![key]
    }

    /**
     * Injects the plugin dependencies.
     *
     * > **Dependencies:** user-defined class or other functional things.
     *
     * @param dependencies - The plugin dependencies to inject.
     */
    public injectDependencies(dependencies: Dependencies) {
        this._runTimeDependencies = dependencies
    }

    /**
     * Gets the static configuration of the plugin.
     *
     * > Static: **configuration defined by the plugin creator.**
     */
    public get staticConfig(): StaticConfig {
        return this._staticConfig
    }

    /**
     * Update static configuration
     * @param staticConfig
     */
    public updateStaticConfig(staticConfig: StaticConfig): void {
        this._staticConfig = this.getMergedStaticConfig(staticConfig)
    }

    /**
     * Gets the dynamic configuration of the plugin.
     *
     * > Dynamic: **`obsidian` plugin injected config.**
     *
     * @description **It is can be accessed after the plugin is `loaded`.**
     * @description **You can't access this property at constructor.**
     */
    public get dynamicConfig(): DynamicConfig {
        return this._dynamicConfig
    }

    /**
     * Gets the name of the plugin.
     */
    public get name(): string {
        return this._staticConfig.name
    }

    private _staticConfig!: StaticConfig
    private _dynamicConfig: DynamicConfig = null as DynamicConfig

    /**
     * Injects the dynamic configuration into the plugin.
     * @param dynamicConfig Injection of dynamic configuration.
     */
    public injectDynamicConfig(dynamicConfig: DynamicConfig): void {
        if (this._dynamicConfig !== null) return
        const config = this.getMergedDynamicConfig(dynamicConfig)
        if (config === null) return

        if (!this.staticConfig.dynamicConfigSchema) {
            throw new PluginInterfaceError(
                'Dynamic config schema is not defined. Please define the dynamic config schema in the static config.',
                this.staticConfig.dynamicConfigSchema
            )
        }

        const parsed = PluginInterface.$dynamicConfigParser.parse<
            Exclude<DynamicConfig, null>
        >(this.staticConfig.dynamicConfigSchema, config)

        if (parsed.success) {
            this._dynamicConfig = this.getMergedDynamicConfig(parsed.data)
            return
        }

        throw parsed.error
    }

    /**
     * Defines the configuration for the plugin.
     */
    protected abstract defineStaticConfig(): StaticConfig

    private validateConfig(config: unknown): asserts config is StaticConfig {
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

        try {
            JSON.parse(JSON.stringify(config))
        } catch (e) {
            throw new PluginInterfaceError(
                'Plugin configuration must be safely serializable by `JSON.stringify`.',
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
     * Define default dynamic config schema for shared plugin
     */
    public baseDynamicConfigSchema?(): PluginDynamicConfigSchema

    /**
     * Get merged static config with default static config
     * @param staticConfig new static config
     */
    public getMergedStaticConfig(staticConfig: StaticConfig): StaticConfig {
        if (!this?.baseDynamicConfigSchema) return staticConfig

        const res = this.baseDynamicConfigSchema?.()
        const mergedConfig = PluginInterface.deepMergeRecord(
            {
                dynamicConfigSchema: res,
            },
            staticConfig as Record<string, unknown>
        ) as StaticConfig

        return mergedConfig
    }

    /**
     * Get default dynamic config
     * @returns default dynamic config
     * @example
     * ```ts
     * defineStaticConfig(): StaticConfig {
     *    return {
     *      name: 'plugin-name',
     *      description: 'plugin-description',
     *      dynamicConfigSchema: {
     *        name: {
     *          type: 'Array<string>',
     *          description: 'Names',
     *          defaultValue: ['John Doe'],
     *          // <--- default dynamic config
     *       },
     *    },
     * }
     * // Returns
     * // {
     * //   name: ['John Doe']
     * // }
     * ```
     */
    public get defaultDynamicConfig(): Partial<DynamicConfig> | null {
        if (this.staticConfig.dynamicConfigSchema === undefined) return null

        const parseDynamicConfig = (
            dynamicConfig: PluginDynamicConfigSchema
        ): Partial<DynamicConfig> => {
            return Object.entries(dynamicConfig)?.reduce<
                Partial<Exclude<DynamicConfig, null>>
            >(
                (acc, [key, value]) => {
                    const defaultValue = value.defaultValue
                    const accRes = acc as Record<string, unknown>
                    if (typeof value.type === 'string') {
                        if (defaultValue !== undefined) {
                            accRes[key] = defaultValue
                        }
                    } else if (
                        typeof value.type === 'object' &&
                        !Array.isArray(value.type)
                    ) {
                        accRes[key] = parseDynamicConfig(value.type)
                    }
                    return accRes as Partial<Exclude<DynamicConfig, null>>
                },
                {} as Partial<Exclude<DynamicConfig, null>>
            )
        }

        return parseDynamicConfig(this.staticConfig.dynamicConfigSchema)
    }

    private static isObject(value: unknown): value is Record<string, unknown> {
        return (
            value !== null && typeof value === 'object' && !Array.isArray(value)
        )
    }

    /**
     * Merge two records deeply
     * @param base base record
     * @param after override record
     * @returns deeply merged record, based on `base` <-- `after`
     */
    public static deepMergeRecord(
        base: Record<string, unknown>,
        after: Record<string, unknown>
    ): Record<string, unknown> {
        const result: Record<string, unknown> = { ...base }

        for (const key in after) {
            if (Object.prototype.hasOwnProperty.call(after, key)) {
                const baseValue = base[key]
                const afterValue = after[key]

                if (
                    PluginInterface.isObject(baseValue) &&
                    PluginInterface.isObject(afterValue)
                ) {
                    result[key] = PluginInterface.deepMergeRecord(
                        baseValue,
                        afterValue
                    )
                } else {
                    result[key] = afterValue
                }
            }
        }

        return result
    }

    /**
     * Get merged dynamic config with default dynamic config
     * @param dynamicConfig new dynamic config
     */
    public getMergedDynamicConfig(dynamicConfig: DynamicConfig): DynamicConfig {
        if (this.defaultDynamicConfig === null) return dynamicConfig
        if (!dynamicConfig) return this.defaultDynamicConfig as DynamicConfig

        const mergedArgs = PluginInterface.deepMergeRecord(
            this.defaultDynamicConfig,
            dynamicConfig
        ) as DynamicConfig

        return mergedArgs
    }

    /**
     * Creates a new instance of the `PluginInterface` class.
     * - `defineConfig` method to define the configuration.
     *
     * @param defaultOptions - The default options for the plugin.
     */
    public constructor() {
        try {
            const baseConfig = this.defineStaticConfig()
            const mergedBaseConfig = this.getMergedStaticConfig(baseConfig)

            this.validateConfig(mergedBaseConfig)

            this.updateStaticConfig(mergedBaseConfig)
            this.$jobManager = new JobManager(
                this.staticConfig.jobManagerConfig
            )
        } catch (e) {
            throw new SyntaxError(
                e instanceof Error ? e.message : JSON.stringify(e)
            )
        }
    }

    /**
     * **Executed to perform** the plugin.
     * @description all the plugins logic should be executed by `this.$jobManager`.
     * @param controller control workflow of the plugin job.
     * @param preparedCalculation The prepared calculation for the job. Calculated by the `prepare` function and will be passed through argument.
     * @returns `this.history`, the history of the plugin execution.
     * @example
     * ```ts
     * // 🔮 Core logic of the plugin
     * private async getSomeData() {}
     * // 🔮 Core logic of the plugin
     * private async saveData() {}
     *
     * // ✅ Plugin execution
     * public async execute() {
     *     this.$jobManager.registerJobs([
     *       {
     *         name: 'get-data',
     *         execute: async () => {
     *           return await this.getSomeData()
     *         },
     *       },
     *       {
     *         name: 'save-data',
     *         execute: async () => {
     *           return await this.saveData()
     *         },
     *       },
     *     ])
     *     await this.$jobManager.processJobs()
     *     return this.history
     * }
     * ```
     */
    public abstract execute(
        /**
         * Execution flow controller
         */
        controller: { stop: () => void; resume: () => void },
        /**
         * Context of the execution, we can inject any data
         *
         * - `PluginRunner` class
         * - Plugin itself by return data of `prepare` method
         */
        context: unknown
    ): Promise<PluginExecutionResponse<PluginJobConfig['response']>>

    /**
     * Lifecycle hooks for the job registration.
     *
     * A function that is **executed before** the job starts.
     * It returns a promise that resolves to the prepared calculation and will be passed to the `execute` function.
     */
    public prepare?(): Promise<PluginJobConfig['prepare']>

    /**
     * Lifecycle hooks for the job registration.
     *
     * A function that is **executed after** the job completes.
     * @param job The completed job.
     * @returns A promise that resolves when the after-job tasks are completed.
     */
    public cleanup?(
        job: PluginExecutionResponse<PluginJobConfig['response']>[number]
    ): Promise<void>
}

export {
    type PluginDynamicSchemaType,
    type PluginDynamicConfigPrimitiveType,
    type PluginDynamicConfigSchema,
} from './arg_parser'
export { type PluginLoadInformation } from './plugin.loader'
