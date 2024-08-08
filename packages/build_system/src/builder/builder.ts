import { Bridge } from '@obsidian_blogger/constants'
import { Logger } from '@obsidian_blogger/helpers/logger'
import {
    type PluginLoadInformation,
    PluginManager,
} from '@obsidian_blogger/helpers/plugin'
import { MarkdownProcessor } from '../md/processor'
import type { FolderNode } from '../parser/node'
import type { FileTreeParser } from '../parser/parser'
import {
    BuilderInternalPlugin,
    BuilderInternalPluginRunner,
    BuilderPluginCachePipelines,
    DuplicateObsidianVaultIntoSource,
    InjectBuildInfoToGeneratedTree,
    SyncBuildStore,
} from './builder.internal'
import { BuildResultLogger } from './core/build.logger'
import {
    BuildCacheManager,
    type BuildCacheManagerConstructor,
} from './core/cache.manager'
import {
    BuildInfoGenerator,
    type BuildInfoGeneratorConstructor,
} from './core/info.generator'
import { BuildStore, type BuildStoreConstructor } from './core/store'
import { type BuildSystemPluginAdapter } from './plugin'
import { BuildContentsPlugin } from './plugin/build.contents.plugin'
import { BuildTreePlugin } from './plugin/build.tree.plugin'
import { PluginCachePipelines } from './plugin/cache.interface'
import { WalkTreePlugin } from './plugin/walk.tree.plugin'
import {
    BuildContentsPluginRunner,
    BuildTreePluginRunner,
    WalkTreePluginRunner,
} from './runners'

export interface BuilderConstructor
    extends Omit<BuildCacheManagerConstructor, 'store'>,
        Omit<BuildStoreConstructor, 'root'>,
        BuildInfoGeneratorConstructor {
    readonly parser: FileTreeParser
    readonly logger: Logger
    bridgeRoot: string
    storagePrefix: string
}

export class Builder {
    private readonly $store: BuildStore
    private readonly $buildLogger: BuildResultLogger
    private readonly $cacheManager: BuildCacheManager
    private readonly $buildInfoGenerator: BuildInfoGenerator
    private readonly $mdProcessor: MarkdownProcessor

    private readonly $pluginCachePipelines: PluginCachePipelines
    public readonly $builderInternalPluginRunner: BuilderInternalPluginRunner
    public readonly $builderInternalPluginManager: PluginManager<
        BuilderInternalPlugin,
        BuilderInternalPluginRunner
    >
    public readonly $treeBuildPluginManager: PluginManager<
        BuildTreePlugin,
        BuildTreePluginRunner
    >
    public readonly $treeBuildPluginRunner: BuildTreePluginRunner
    public readonly $treeWalkPluginManager: PluginManager<
        WalkTreePlugin,
        WalkTreePluginRunner
    >
    public readonly $treeWalkPluginRunner: WalkTreePluginRunner
    public readonly $buildContentsPluginManager: PluginManager<
        BuildContentsPlugin,
        BuildContentsPluginRunner
    >
    public readonly $buildContentsPluginRunner: BuildContentsPluginRunner

    private get $parser(): FileTreeParser {
        return this.options.parser
    }
    private get $logger(): Logger {
        return this.options.logger
    }

    /**
     * Get plugin manager names
     * @description for bridging, it is required information
     */
    public static readonly managerName = {
        ...Bridge.MANAGER_NAME.buildSystem,
        internal: 'build_system::internal',
    } as const

    public constructor(private readonly options: BuilderConstructor) {
        this.$store = new BuildStore({
            io: options.io,
            root: `${options.bridgeRoot}/${options.storagePrefix}/cache.json`,
        })
        this.$cacheManager = new BuildCacheManager({
            ...options,
            store: this.$store,
        })
        this.$pluginCachePipelines = new BuilderPluginCachePipelines()

        this.$buildInfoGenerator = new BuildInfoGenerator(options)
        this.$buildLogger = new BuildResultLogger(options)

        this.$mdProcessor = new MarkdownProcessor()

        // Internal plugins
        this.$builderInternalPluginRunner = new BuilderInternalPluginRunner()
        this.$builderInternalPluginManager = new PluginManager({
            name: Builder.managerName.internal,
            root: 'late_init.json',
            runner: this.$builderInternalPluginRunner,
            lateInit: true,
        })
        this.setupInternalPlugins()

        // External plugins
        // A > Tree Build
        this.$treeBuildPluginRunner = new BuildTreePluginRunner()
        this.$treeBuildPluginManager = new PluginManager({
            name: Builder.managerName.buildTree,
            root: 'late_init.json',
            runner: this.$treeBuildPluginRunner,
            lateInit: true,
        })
        // B > Tree Walk
        this.$treeWalkPluginRunner = new WalkTreePluginRunner()
        this.$treeWalkPluginManager = new PluginManager({
            name: Builder.managerName.walkTree,
            root: 'late_init.json',
            runner: this.$treeWalkPluginRunner,
            lateInit: true,
        })
        // C > Build Contents
        this.$buildContentsPluginRunner = new BuildContentsPluginRunner()
        this.$buildContentsPluginManager = new PluginManager({
            name: Builder.managerName.buildContents,
            root: 'late_init.json',
            runner: this.$buildContentsPluginRunner,
            lateInit: true,
        })
    }

    private setupInternalPlugins(): void {
        this.$builderInternalPluginManager.$loader.use([
            new SyncBuildStore(),
            new DuplicateObsidianVaultIntoSource(),
            new InjectBuildInfoToGeneratedTree(),
        ])
    }

    public use({
        'build:tree': buildTreePlugins,
        'walk:tree': walkTreePlugins,
        'build:contents': buildContentsPlugins,
    }: BuildSystemPluginAdapter): Builder {
        this.$treeBuildPluginManager.$loader.use(buildTreePlugins)
        this.$treeWalkPluginManager.$loader.use(walkTreePlugins)
        this.$buildContentsPluginManager.$loader.use(buildContentsPlugins)

        return this
    }

    private async getAST(): Promise<FolderNode | undefined> {
        if (this.$parser.ast?.children.length !== 0) {
            return this.$parser.ast
        }
        const ast = await this.$parser.parse()
        if (!ast) {
            this.options.logger.updateName('ASTParser')
            this.$logger.error('Failed to parse file AST')
            return undefined
        }
        return ast
    }

    private async buildTree(
        loadInformation: PluginLoadInformation
    ): Promise<void> {
        const walkRoot = await this.getAST()

        if (!walkRoot) return
        await this.$treeBuildPluginManager.$runner.run(
            this.$treeBuildPluginManager.$loader.load(loadInformation),
            {
                ...this.options,
                walkRoot,
                cacheManager: this.$cacheManager,
                buildStore: this.$store,
                buildInfoGenerator: this.$buildInfoGenerator,
                cachePipeline: this.$pluginCachePipelines.treeCachePipeline,
            }
        )
    }

    private async walkTree(
        PluginLoadInformation: PluginLoadInformation
    ): Promise<void> {
        const walkRoot = await this.getAST()

        if (!walkRoot) return

        await this.$treeWalkPluginManager.$runner.run(
            this.$treeWalkPluginManager.$loader.load(PluginLoadInformation),
            {
                ...this.options,
                walkRoot,
                buildStore: this.$store,
                cacheManager: this.$cacheManager,
                buildInfoGenerator: this.$buildInfoGenerator,
                cachePipeline: this.$pluginCachePipelines.treeCachePipeline,
            }
        )
    }

    private async buildContents(
        loadInformation: PluginLoadInformation
    ): Promise<void> {
        const pluginPipes =
            this.$buildContentsPluginManager.$loader.load(loadInformation)

        await this.$buildContentsPluginManager.$runner.run(pluginPipes, {
            ...this.options,
            buildStore: this.$store,
            buildStoreList: this.$store.getStoreList('current'),
            processor: this.$mdProcessor,
            cacheManager: this.$cacheManager,
            buildInfoGenerator: this.$buildInfoGenerator,
            cachePipeline:
                this.$pluginCachePipelines.buildContentsCachePipeline,
        })
    }

    private async logBuildResult(): Promise<void> {
        this.options.logger.updateName('BuildResultLogger')

        const buildReport = this.$store.getStoreList('current')
        const ast = await this.getAST()
        if (!ast) return

        await this.$buildLogger.writeBuilderLog({
            ast,
            buildReport,
        })
    }

    private async cleanup(): Promise<void> {
        const saved = await this.$cacheManager.save()
        if (!saved) {
            this.$logger.error('Failed to save cache manager')
            return
        } else {
            this.$logger.info('Cache manager saved')
        }
    }

    private async syncBuildStore(): Promise<void> {
        await this.$builderInternalPluginManager.$runner.run(
            this.$builderInternalPluginManager.$loader.load([
                {
                    name: 'sync-build-store',
                    dynamicConfig: null,
                },
            ]),
            {
                ...this.options,
                buildInfoGenerator: this.$buildInfoGenerator,
                buildStore: this.$store,
                cacheManager: this.$cacheManager,
                cachePipeline: this.$pluginCachePipelines.treeCachePipeline,
            }
        )
    }

    private async duplicateObsidianVaultIntoSource(): Promise<void> {
        await this.$builderInternalPluginManager.$runner.run(
            this.$builderInternalPluginManager.$loader.load([
                {
                    name: 'duplicate-obsidian-vault-into-source',
                    dynamicConfig: null,
                },
            ]),
            {
                ...this.options,
                buildInfoGenerator: this.$buildInfoGenerator,
                buildStore: this.$store,
                cacheManager: this.$cacheManager,
                cachePipeline: this.$pluginCachePipelines.treeCachePipeline,
            }
        )
    }

    private async injectBuildInfoToGeneratedTree(): Promise<void> {
        this.$parser.updateRootFolder(this.options.buildPath.contents)

        await this.$builderInternalPluginManager.$runner.run(
            this.$builderInternalPluginManager.$loader.load([
                {
                    name: 'inject-build-info-to-generated-tree',
                    dynamicConfig: null,
                },
            ]),
            {
                ...this.options,
                buildInfoGenerator: this.$buildInfoGenerator,
                buildStore: this.$store,
                cacheManager: this.$cacheManager,
                cachePipeline: this.$pluginCachePipelines.treeCachePipeline,
            }
        )
    }

    /**
     * Build
     * @param loadInformation - Build plugins load information
     */
    public async build(loadInformation: {
        buildTree: PluginLoadInformation
        walkTree: PluginLoadInformation
        buildContents: PluginLoadInformation
    }) {
        const { buildTree, walkTree, buildContents } = loadInformation

        // [ Phase1 ]:: Synchronize build store
        await this.syncBuildStore()

        // [ Phase2 ]:: Build origin file tree structure
        await this.buildTree(buildTree)

        // [ Phase3 ]:: Duplicate Obsidian vault into source
        await this.duplicateObsidianVaultIntoSource()

        // [ Phase4 ]:: Change tree into source::contents
        await this.injectBuildInfoToGeneratedTree()

        // [ Phase5 ]:: Walk generated tree and apply plugins
        await this.walkTree(walkTree)

        // [ Phase6 ]:: Apply contents modifier plugins
        await this.buildContents(buildContents)

        // [ Phase7 ]:: Log build result
        await this.logBuildResult()

        // [ Phase8 ]:: Clean up and save cache manager
        await this.cleanup()
    }
}
