/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Job,
    JobManager,
    JobManagerConstructor,
    JobRegistrationShape,
} from '../job'

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
    description?: string
    /**
     * Job manager option.
     */
    jobManager?: JobManagerConstructor
    /**
     * Dynamic config description for the plugin.
     * @example
     * ```json
     * [{
     *      property: "script",
     *      type: "Array<string>"
     * }]
     * ```
     * **will be used at `obsidian` plugin.**
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dynamicConfigDescriptions?: Array<{
        /**
         * Dynamic config property name.
         */
        property: string
        /**
         * Type of the dynamic config property.
         */
        type: string
        /**
         * Example of the dynamic config property.
         */
        example?: string
    }>
}

type MappedJob<JobResponses extends readonly [...unknown[]]> =
    JobResponses extends readonly [infer Head, ...infer Tail]
        ? Tail extends readonly [...unknown[]]
            ? [Job<Head>, ...MappedJob<Tail>]
            : [Job<Head>]
        : JobResponses

/**
 * Plugin execution response
 * @example
 * ```ts
 * type ExecutionResponse = PluginExecutionResponse<[string, number]>
 * // [Job<string>, Job<number>]
 * type ExecutionResponse = PluginExecutionResponse<string>
 * // Array<Job<string>>
 * ```
 */
export type PluginExecutionResponse<ExecutionResponse = unknown> =
    ExecutionResponse extends readonly [...unknown[]]
        ? MappedJob<ExecutionResponse>
        : Array<Job<ExecutionResponse>>

class PluginInterfaceError extends SyntaxError {
    public constructor(message: string, config: unknown, cause?: unknown) {
        super(`› ${message}\n› config: ${JSON.stringify(config)}`)
        this.name = 'PluginInterfaceError'
        this.cause = cause
    }
}

type FunctionType =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((...args: Array<any>) => any) | ((...args: Array<any>) => Promise<any>)
/**
 * Base shape of dynamic config
 */
type DynamicConfigValuePrimitive =
    | string
    | number
    | boolean
    | null
    | RegExp
    | FunctionType
    | PluginInterfaceDynamicConfigShape
    | Array<PluginInterfaceDynamicConfigShape>

export interface PluginInterfaceDynamicConfigShape {
    [key: string]:
        | DynamicConfigValuePrimitive
        | Array<DynamicConfigValuePrimitive>
}
export interface PluginInterfaceDynamicConfig
    extends PluginInterfaceDynamicConfigShape {}

export interface PluginInterfaceDependencies {}

export type PluginShape = PluginInterface<
    PluginInterfaceStaticConfig,
    PluginInterfaceDynamicConfig | null,
    PluginInterfaceDependencies | null
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
export type InferPluginConfig<Plugin extends PluginShape> =
    Plugin extends PluginInterface<infer Static, infer Dynamic>
        ? {
              staticConfig: Static
              dynamicConfig: Dynamic
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
> implements JobRegistrationShape
{
    protected readonly $jobManager: JobManager
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

    private createDynamicConfigDescription(
        dynamicConfig: DynamicConfig
    ): Array<{ property: string; type: string }> {
        if (!dynamicConfig) return []

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function getTypeDescription(value: any): string {
            if (value === null) {
                return 'null'
            } else if (Array.isArray(value)) {
                return getArrayTypeDescription(value)
            } else if (typeof value === 'object') {
                return getObjectTypeDescription(value)
            } else if (typeof value === 'function') {
                return getFunctionTypeDescription(value)
            } else {
                return typeof value
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function getArrayTypeDescription(array: any[]): string {
            const types = array.map(getTypeDescription)
            const uniqueTypes = Array.from(new Set(types))

            if (uniqueTypes.length === 1) {
                return `Array<${uniqueTypes[0]}>`
            } else {
                return `readonly [${types.join(', ')}]`
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function getObjectTypeDescription(obj: any): string {
            const entries = Object.entries(obj).map(
                ([key, value]) => `${key}: ${getTypeDescription(value)}`
            )
            return `{ ${entries.join('; ')} }`
        }

        function getFunctionTypeDescription(func: FunctionType): string {
            const funcString = func.toString()
            const argsMatch = funcString.match(/\(([^)]*)\)/)
            if (!argsMatch?.[1]) return `() => 'unknown'`
            const args = argsMatch
                ? argsMatch[1]
                      .split(',')
                      .map((arg) => {
                          const name = arg.trim()
                          return name
                      })
                      .join(', ')
                : ''
            const returnType = 'unknown' // In a real-world scenario, you might want to use type inference tools or decorators to get the actual return type.
            return `(${args}) => ${returnType}`
        }

        return Object.entries(dynamicConfig).map(([key, value]) => {
            return {
                property: key,
                type: getTypeDescription(value),
            }
        })
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
        if (!config) return

        this._staticConfig.dynamicConfigDescriptions =
            this._staticConfig.dynamicConfigDescriptions ??
            this.createDynamicConfigDescription(config)

        this._dynamicConfig = config
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

    private getMergedStaticConfig(staticConfig: StaticConfig): StaticConfig {
        if (this.defaultOptions?.defaultDynamicConfigs === undefined)
            return {
                ...this.staticConfig,
                ...staticConfig,
            }

        const mergedConfig = {
            ...this.defaultOptions.defaultDynamicConfigs,
            ...this.staticConfig,
            ...staticConfig,
        }

        return mergedConfig
    }

    private getMergedDynamicConfig(
        dynamicConfig: DynamicConfig
    ): DynamicConfig {
        if (this.defaultOptions.defaultDynamicConfigs === undefined)
            return dynamicConfig

        const mergedArgs = {
            ...this.defaultOptions.defaultDynamicConfigs,
            ...dynamicConfig,
        }
        return mergedArgs
    }

    /**
     * Creates a new instance of the `PluginInterface` class.
     * - `defineConfig` method to define the configuration.
     *
     * @param defaultOptions - The default options for the plugin.
     */
    public constructor(
        public readonly defaultOptions: {
            /**
             * Default static configurations for the plugin.
             */
            defaultStaticConfigs?:
                | Partial<Omit<StaticConfig, keyof PluginInterfaceStaticConfig>>
                | undefined
            /**
             * Default dynamic configurations for the plugin.
             */
            defaultDynamicConfigs?: Partial<DynamicConfig> | undefined
        } = {
            defaultStaticConfigs: undefined,
            defaultDynamicConfigs: undefined,
        }
    ) {
        try {
            const injectedConfig = this.defineStaticConfig()
            const mergedConfig = this.getMergedStaticConfig(injectedConfig)

            this.validateConfig(mergedConfig)

            this._staticConfig = mergedConfig
            this.$jobManager = new JobManager(this.staticConfig.jobManager)
        } catch (e) {
            throw new SyntaxError(
                e instanceof Error ? e.message : JSON.stringify(e)
            )
        }
    }

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
    ): Promise<PluginExecutionResponse>

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
    public cleanup?(job: PluginExecutionResponse[number]): Promise<void>
}

export { type PluginLoadInformation } from './plugin.loader'
