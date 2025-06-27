import {
    type PluginExecutionResponse,
    PluginInterface,
    type PluginInterfaceStaticConfig,
} from '@obsidian_blogger/plugin_api'

import {
    MetaEngine,
    type MetaEngineConstructor,
    type PolymorphicMeta,
} from '../../meta/engine'

import type { BuilderConstructor } from '../builder'
import type { BuildCacheManager, BuildInfoGenerator, BuildStore } from '../core'
import type { LogHistory } from '@obsidian_blogger/helpers/logger'
/**
 * Represents the configuration for a build plugin.
 */
export interface BuildPluginStaticConfig extends PluginInterfaceStaticConfig {}

export type BuildPluginDynamicConfig = {
    /**
     * Whether to disable caching for the plugin.
     */
    disableCache?: boolean
}

export interface BuildPluginDependencies extends BuilderConstructor {
    buildStore: BuildStore
    cacheManager: BuildCacheManager
    buildInfoGenerator: BuildInfoGenerator
}

export interface BuildPluginResponse {
    /**
     * Error stacks
     */
    error: Array<{ error: Error; filepath?: string }>
    /**
     * History of log messages
     */
    history: Array<LogHistory>
}

export type BuildPluginExecutionResponse =
    PluginExecutionResponse<BuildPluginResponse>

/**
 * Abstract class representing a build plugin.
 */
export abstract class BuildPlugin<
    Static extends BuildPluginStaticConfig,
    Dynamic extends BuildPluginDynamicConfig = BuildPluginDynamicConfig,
    Dependencies extends BuildPluginDependencies = BuildPluginDependencies,
    Response extends unknown = unknown,
> extends PluginInterface<
    Static,
    Dynamic,
    Dependencies,
    {
        prepare: void
        response: BuildPluginResponse & Response
    }
> {
    /**
     * Creates a meta engine with the specified engine components(`generator`, `parser`).
     * @param engineComponents - The engine components for creating the meta engine.
     * @returns The created meta engine.
     * @example
     * ```ts
     * // Parser:: schema for parsing the meta.
     * const PostParser = z.object({
     *      title: z.string(),
     *      description: z.string(),
     * })
     * // Generator:: generating the meta. e.g) default value injection or etc...
     * const PostMetaGenerator = (meta: Record<string, unknown>) => ({
     *      title: meta.title,
     *      description: meta.description ?? "DEFAULT_DESCRIPTION",
     * })
     *
     * const meta = this.createMetaEngine({
     *      parser: Post.parse,
     *      generator: PostMetaGenerator, // <-- Optional
     * })
     * ```
     */
    protected $createMetaEngine<MetaShape extends PolymorphicMeta>(
        engineComponents: Omit<MetaEngineConstructor<MetaShape>, 'ioManager'>
    ): MetaEngine<MetaShape> {
        return MetaEngine.create(engineComponents, this.$io)
    }

    /**
     * Get non-validation meta engine handles read/write/update meta-data from the file system.
     * @returns
     */
    protected get $meta(): MetaEngine<PolymorphicMeta> {
        return MetaEngine.create(
            {
                parser: (meta: unknown) => meta as PolymorphicMeta,
            },
            this.$io
        )
    }

    /**
     * Gets the `IO` instance for operating the file system.
     * @throws if it is used in the constructor.
     */
    protected get $io() {
        return this.getRunTimeDependency('io')!
    }

    /**
     * `Logger`
     * @throws if it is used in the constructor.
     */
    protected get $logger() {
        return this.getRunTimeDependency('logger')!
    }

    /**
     * User-defined `path generator`
     * @throws if it is used in the constructor.
     */
    protected get $pathGenerator() {
        return this.getRunTimeDependency('pathGenerator')!
    }

    /**
     * `Build path`
     * ```ts
     * type BuildPath = {
     *     assets:   string
     *     contents: string
     * }
     * ```
     * @throws if it is used in the constructor.
     */
    protected get $buildPath() {
        return this.getRunTimeDependency('buildPath')!
    }

    /**
     * Add additional caching logic.
     */
    public cacheChecker?(...args: unknown[]): boolean
}
