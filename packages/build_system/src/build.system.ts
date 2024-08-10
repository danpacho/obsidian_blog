import { Bridge as BridgeConstant } from '@obsidian_blogger/constants'
import { IO, Logger } from '@obsidian_blogger/helpers'
import { Bridge } from '@obsidian_blogger/helpers/plugin'
import { Builder, type BuilderConstructor } from './builder'
import type { BuildSystemPluginAdapter } from './builder/plugin'
import { FileTreeParser, type FileTreeParserConstructor } from './parser'
//TODO: refactor, divide constructor <-> config options
type ClassInstance = 'io' | 'logger' | 'parser'

export interface BuildSystemConstructor {
    bridgeRoot: string
    /**
     * Tree parser required constructor options
     */
    parser: Omit<FileTreeParserConstructor, ClassInstance>
    /**
     * Builder required constructor options
     */
    builder: Omit<
        BuilderConstructor,
        ClassInstance | 'bridgeRoot' | 'storagePrefix'
    >
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
            io: this.$io,
            ...options.parser,
        })
        this.$builder = new Builder({
            ...options.builder,
            io: this.$io,
            parser: this.$parser,
            logger: this.$logger,
            storagePrefix: BuildSystem.bridgeStorePrefix,
            bridgeRoot: options.bridgeRoot,
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
    public use(plugins: BuildSystemPluginAdapter) {
        this.$builder.use(plugins)
    }
}
