import { IO, Logger } from '@obsidian_blogger/helpers'
import { Bridge } from '@obsidian_blogger/plugin_api'
import { Bridge as BridgeConstant } from '@obsidian_blogger/plugin_api/constants'

import { Builder, type BuilderConstructor } from './builder'
import { FileTreeParser, type FileTreeParserConstructor } from './parser'

import type { BuildSystemPluginAdapter } from './builder/plugin'
//TODO: refactor, divide constructor <-> config options

type ClassInstance = 'io' | 'logger' | 'parser'
type AlreadyFulfilled = 'rootFolder' | 'storagePrefix'
type ExcludeProperties = ClassInstance | AlreadyFulfilled

export { type PathGenerator } from './builder'
export interface BuildSystemConstructor
    extends Omit<BuilderConstructor, ExcludeProperties>,
        Omit<FileTreeParserConstructor, ExcludeProperties> {
    /**
     * **Root path of the `bridge` package**
     */
    bridgeRoot: string
    /**
     * **Target `obsidian` vault root**
     *
     * Parser required constructor options
     */
    vaultRoot: string
}
export class BuildSystem {
    private readonly $parser: FileTreeParser
    private readonly $builder: Builder
    public readonly $configBridgeStorage: Bridge.LoadConfigBridgeStorage
    public readonly $historyBridgeStorage: Bridge.HistoryBridgeStorage

    private _initialized: boolean = false
    private readonly $logger: Logger
    private readonly $io: IO

    public static bridgeStorePrefix = BridgeConstant.STORE_PREFIX.buildSystem

    public constructor(options: BuildSystemConstructor) {
        this.$io = new IO()
        this.$logger = new Logger({
            name: 'build_system',
        })
        this.$parser = new FileTreeParser({
            ...options,
            io: this.$io,
            rootFolder: options.vaultRoot,
        })
        this.$builder = new Builder({
            ...options,
            io: this.$io,
            parser: this.$parser,
            logger: this.$logger,
            storagePrefix: BuildSystem.bridgeStorePrefix,
            bridgeRoot: options.bridgeRoot,
            vaultRoot: options.vaultRoot,
        })
        this.$configBridgeStorage = new Bridge.LoadConfigBridgeStorage({
            bridgeRoot: options.bridgeRoot,
            storePrefix: BuildSystem.bridgeStorePrefix,
            managers: [
                this.$builder.$buildContentsPluginManager,
                this.$builder.$treeBuildPluginManager,
                this.$builder.$treeWalkPluginManager,
            ],
        })
        this.$historyBridgeStorage = new Bridge.HistoryBridgeStorage({
            bridgeRoot: options.bridgeRoot,
            storePrefix: BuildSystem.bridgeStorePrefix,
            managers: [
                this.$builder.$builderInternalPluginManager,
                this.$builder.$buildContentsPluginManager,
                this.$builder.$treeBuildPluginManager,
                this.$builder.$treeWalkPluginManager,
            ],
        })
    }

    /**
     * Initialize
     */
    public async init() {
        await this.$configBridgeStorage.load()
        await this.$historyBridgeStorage.init()
    }

    /**
     * Build
     */
    public async build() {
        if (!this._initialized) {
            await this.init()
        }

        const [buildTree, walkTree, buildContents] = await Promise.all([
            this.$configBridgeStorage.loadInformation(
                this.$builder.$treeBuildPluginManager.options.name
            ),
            this.$configBridgeStorage.loadInformation(
                this.$builder.$treeWalkPluginManager.options.name
            ),
            this.$configBridgeStorage.loadInformation(
                this.$builder.$buildContentsPluginManager.options.name
            ),
        ])

        Bridge.LoadConfigBridgeStorage.logPluginPipelineInfo({
            [this.$builder.$builderInternalPluginManager.options.name]:
                this.$builder.$builderInternalPluginManager.$loader.pluginList,
            [this.$builder.$treeBuildPluginManager.options.name]:
                this.$builder.$treeBuildPluginManager.$loader.pluginList,
            [this.$builder.$treeWalkPluginManager.options.name]:
                this.$builder.$treeWalkPluginManager.$loader.pluginList,
            [this.$builder.$buildContentsPluginManager.options.name]:
                this.$builder.$buildContentsPluginManager.$loader.pluginList,
        })

        await this.$builder.build({
            walkTree,
            buildContents,
            buildTree,
        })
    }

    /**
     * Register build system plugins
     * @param plugins {@link BuildSystemPluginAdapter}
     * @example
     * ```ts
     * const system = new BuildSystem(...)
     * system.use({
     *      "build:tree": [plugin0, plugin1],
     *      "walk:tree": plugin2,
     *      "build:contents": [plugin3, plugin4],
     * })
     * ```
     */
    public use(plugins: BuildSystemPluginAdapter): this {
        this.$builder.use(plugins)
        return this
    }
}
