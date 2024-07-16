import {
    PluginInterface,
    type PluginInterfaceStaticConfig,
} from '@obsidian_blogger/helpers/plugin'
import {
    MetaEngine,
    type MetaEngineConstructor,
    type PolymorphicMeta,
} from '../../meta/engine'
import type { BuilderConstructor } from '../builder'
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

export interface BuildPluginDependencies
    extends Omit<BuilderConstructor, 'parser' | 'corePluginConfigs'> {}

/**
 * Abstract class representing a build plugin.
 */
export abstract class BuildPlugin<
    Static extends BuildPluginStaticConfig,
    Dynamic extends BuildPluginDynamicConfig = BuildPluginDynamicConfig,
    Dependencies extends BuildPluginDependencies = BuildPluginDependencies,
> extends PluginInterface<Static, Dynamic> {
    private _runTimeDependencies: Dependencies | undefined = undefined

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
        return this._runTimeDependencies[key]
    }

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
     *     assets: string
     *     contents: string
     * }
     * ```
     * @throws if it is used in the constructor.
     */
    protected get $buildPath() {
        return this.getRunTimeDependency('buildPath')!
    }

    /**
     * Injects the plugin dependencies.
     * @param dependencies - The plugin dependencies to inject.
     * @ignore This is _internal API_ for the build system.
     */
    public injectDependencies(dependencies: Dependencies) {
        this._runTimeDependencies = dependencies
    }

    /**
     * Add additional caching logic.
     */
    public cacheChecker?(...args: unknown[]): boolean
}
