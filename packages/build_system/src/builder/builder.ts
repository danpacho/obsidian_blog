import { Logger } from '@obsidian_blogger/helpers/logger'
import { PluginManager } from '@obsidian_blogger/helpers/plugin'
import { MarkdownProcessor } from '../md/processor'
import type { FTreeNode, FolderNode } from '../parser/node'
import type { FileTreeParser } from '../parser/parser'
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
import { type BuildSystemAdapter, type BuildSystemPlugin } from './plugin'
import { BuildContentsPlugin } from './plugin/build.contents.plugin'
import { BuildTreePlugin } from './plugin/build.tree.plugin'
import { WalkTreePlugin } from './plugin/walk.tree.plugin'

class BuildFileTreeCorePlugin extends BuildTreePlugin {
    public async walk(node: FTreeNode): Promise<void> {
        const { buildInfo, absolutePath, category } = node
        if (!buildInfo) return

        const cpResult =
            category === 'TEXT_FILE'
                ? await this.$io.cpFile({
                      from: buildInfo.build_path.origin,
                      to: buildInfo.build_path.build,
                      type: 'text',
                  })
                : await this.$io.cpFile({
                      from: buildInfo.build_path.origin,
                      to: buildInfo.build_path.build,
                      type: 'media',
                  })

        if (!cpResult.success) {
            this.$logger.error(
                `Failed to copy ${absolutePath} to ${buildInfo.build_path.build}`
            )
        }
    }

    public getConfig() {
        return {
            name: 'BuildFileTreeCorePlugin',
            disableCache: false,
        }
    }
}

export interface BuilderConstructor
    extends Omit<BuildCacheManagerConstructor, 'store'>,
        BuildStoreConstructor,
        BuildInfoGeneratorConstructor {
    readonly parser: FileTreeParser
    readonly logger: Logger
}

export class Builder {
    public constructor(private readonly option: BuilderConstructor) {
        this.$store = new BuildStore(option)
        this.$cacheManager = new BuildCacheManager({
            ...option,
            store: this.$store,
        })
        this.$buildInfoGenerator = new BuildInfoGenerator(option)
        this.$buildLogger = new BuildResultLogger(option)
        this.$mdProcessor = new MarkdownProcessor()
    }

    private readonly $store: BuildStore
    private readonly $buildLogger: BuildResultLogger
    private readonly $cacheManager: BuildCacheManager
    private readonly $buildInfoGenerator: BuildInfoGenerator
    private readonly $mdProcessor: MarkdownProcessor

    private readonly treeBuildPluginManager: PluginManager<
        BuildSystemPlugin['build:tree'],
        BuildTreePlugin['getConfig']
    > = new PluginManager()
    private readonly generatedTreeWalkerPluginManager: PluginManager<
        BuildSystemPlugin['walk:tree'],
        WalkTreePlugin['getConfig']
    > = new PluginManager()
    private readonly contentsModifierPluginManger: PluginManager<
        BuildSystemPlugin['build:contents'],
        BuildContentsPlugin['getConfig']
    > = new PluginManager()

    private get $parser(): FileTreeParser {
        return this.option.parser
    }
    private get $io() {
        return this.option.io
    }
    private get $logger(): Logger {
        return this.option.logger
    }

    public use({
        'build:tree': treeBuildPluginSet,
        'walk:tree': generatedTreeWalkerPluginSet,
        'build:contents': contentsBuildPluginSet,
    }: BuildSystemAdapter): Builder {
        this.treeBuildPluginManager.$loader.use(treeBuildPluginSet)
        this.generatedTreeWalkerPluginManager.$loader.use(
            generatedTreeWalkerPluginSet
        )
        this.contentsModifierPluginManger.$loader.use(contentsBuildPluginSet)

        // Inject dependencies
        this.injectPluginDependencies()

        return this
    }

    private injectPluginDependencies() {
        this.$buildFileTreePlugin.injectDependencies(this.option)
        this.treeBuildPluginManager.$loader.plugins.forEach((plugin) => {
            plugin.injectDependencies(this.option)
        })
        this.generatedTreeWalkerPluginManager.$loader.plugins.forEach(
            (plugin) => {
                plugin.injectDependencies(this.option)
            }
        )
        this.contentsModifierPluginManger.$loader.plugins.forEach((plugin) => {
            plugin.injectDependencies({
                ...this.option,
                processor: this.$mdProcessor,
            })
        })
    }

    private async getAST(): Promise<FolderNode | undefined> {
        if (this.$parser.ast?.children.length !== 0) {
            return this.$parser.ast
        }
        const ast = await this.$parser.parse()
        if (!ast) {
            this.option.logger.updateName('ASTParser')
            this.$logger.error('Failed to parse file AST')
            return undefined
        }
        return ast
    }

    private async syncBuildStore(): Promise<void> {
        const originAST = await this.getAST()
        if (!originAST) return
        if (!originAST.children) return

        const rootPath = this.$parser.ast?.absolutePath
        if (!rootPath) return

        await this.$cacheManager.setup()

        this.option.logger.updateName('BuildStoreSync')
        await this.$parser.walkAST(
            originAST.children,
            async (node) => {
                switch (node.category) {
                    case 'TEXT_FILE': {
                        const contentsBuildInfo =
                            await this.$buildInfoGenerator.generateContentBuildInfo(
                                node,
                                this.option
                            )
                        node.injectBuildInfo(contentsBuildInfo)
                        break
                    }
                    default: {
                        const assetsBuildInfo =
                            await this.$buildInfoGenerator.generateAssetBuildInfo(
                                node,
                                this.option
                            )
                        node.injectBuildInfo(assetsBuildInfo)
                        break
                    }
                }

                const update = this.$cacheManager.updateStore(node)
                if (!update.success) {
                    this.$logger.error(update.error.message)
                    return
                }
            },
            true // SKIP FOLDER NODE
        )

        this.$cacheManager.syncRemovedStore()
    }

    private async buildTree(): Promise<void> {
        const originAST = await this.getAST()
        if (!originAST) return
        if (!originAST.children) return

        for (const plugin of this.treeBuildPluginManager.$loader.plugins) {
            plugin.injectDependencies(this.option)
            const config = plugin.getConfig()
            this.option.logger.updateName(config.name)
            const cachePipe = await this.walkerCachePipe({
                treePlugin: plugin,
            })

            await this.$parser.walkAST(
                originAST.children,
                cachePipe,
                config.skipFolderNode ?? false
            )
        }
    }

    private async walkerCachePipe({
        treePlugin,
        whenCached,
    }: {
        treePlugin: WalkTreePlugin | BuildTreePlugin
        whenCached?: (node: FTreeNode) => void
    }): Promise<Parameters<FileTreeParser['walkAST']>[1]> {
        const cacheChecker = (
            node: FTreeNode,
            i: number,
            children: Array<FTreeNode>
        ): boolean => {
            const config = treePlugin.getConfig()
            const { buildInfo } = node

            if (!buildInfo?.id) return false

            if (config?.disableCache) return false

            const fileName = node.fileName
            if (config?.exclude) {
                const { exclude } = config
                if (typeof exclude === 'string') {
                    if (exclude === fileName) {
                        return true
                    }
                } else if (exclude instanceof RegExp) {
                    if (exclude.test(fileName)) {
                        return true
                    }
                } else {
                    if (exclude.some((ex) => fileName.includes(ex))) {
                        return true
                    }
                }
            }

            const status = this.$cacheManager.checkStatus(buildInfo.id)
            if (!status.success) {
                return false
            }

            if (treePlugin?.cacheChecker) {
                // User-defined caching logic
                return treePlugin.cacheChecker(status.data, {
                    node,
                    i,
                    peerNodes: children,
                })
            }

            if (status.data !== 'CACHED') {
                // Default cache logic
                return false
            }

            whenCached?.(node)
            return true
        }

        return async (node, i, children) => {
            if (cacheChecker(node, i, children)) return

            await treePlugin.walk(node, i, children)
        }
    }

    private readonly $buildFileTreePlugin = new BuildFileTreeCorePlugin()
    private async buildFileTree() {
        const originAST = await this.getAST()
        if (!originAST) return
        if (!originAST.children) return

        this.option.logger.updateName('FileTreeBuilder')

        await this.$parser.walkAST(
            originAST.children,
            await this.walkerCachePipe({
                treePlugin: this.$buildFileTreePlugin,
            })
        )

        const removeTarget = this.$store.getRemoveTarget()
        for (const target of removeTarget) {
            const removeResult = await this.$io.writer.deleteFile(
                target.build_path.build
            )
            if (!removeResult.success) {
                this.$logger.error(`Failed to remove ${target}`)
            }
        }

        const save = await this.$store.saveReport()

        if (!save.success) {
            this.$logger.error('Failed to save build report')
        }
    }

    private async injectBuildInfoToGeneratedTree(generatedAST: FolderNode) {
        this.option.logger.updateName('InjectBuildInfo')
        await this.$parser.walkAST(
            generatedAST.children,
            async (node) => {
                const generatedBuildInfo = this.$store.findByBuildPath(
                    node.absolutePath,
                    {
                        target: 'current',
                    }
                )
                if (!generatedBuildInfo.success) {
                    this.$logger.error(generatedBuildInfo.error.message)
                    return
                }

                node.injectBuildInfo(generatedBuildInfo.data)
                return
            },
            true
        )
    }

    private async getGeneratedTree({
        shouldInjectBuildInfo,
    }: {
        shouldInjectBuildInfo: boolean
    }): Promise<FolderNode | undefined> {
        this.$parser.updateRootFolder(this.option.buildPath.contents)

        const generatedAST = await this.getAST()
        if (!generatedAST) return
        if (!generatedAST.children) return

        if (shouldInjectBuildInfo) {
            await this.injectBuildInfoToGeneratedTree(generatedAST)
        }

        return generatedAST
    }

    private async walkGeneratedTree(): Promise<void> {
        const generatedAST = await this.getGeneratedTree({
            shouldInjectBuildInfo: true,
        })
        if (!generatedAST || !generatedAST) return

        for (const plugin of this.generatedTreeWalkerPluginManager.$loader
            .plugins) {
            plugin.injectDependencies(this.option)
            const config = plugin.getConfig()
            this.option.logger.updateName(config.name)

            const cachePipe = await this.walkerCachePipe({
                treePlugin: plugin,
            })

            await this.$parser.walkAST(
                generatedAST.children,
                cachePipe,
                config.skipFolderNode ?? false
            )
        }
    }

    private async buildContents(): Promise<void> {
        const generatedAST = await this.getGeneratedTree({
            shouldInjectBuildInfo: false,
        })
        if (!generatedAST) return
        if (!generatedAST.children) return

        const totalTargetReport = this.$store.getStoreList('current')
        const updateTargetReport = totalTargetReport.filter(
            ({ build_state }) =>
                build_state === 'UPDATED' || build_state === 'ADDED'
        )

        const getTargetBuildStore = (
            buildContentsPlugin?: BuildContentsPlugin
        ) => {
            if (!buildContentsPlugin) return updateTargetReport

            const config = buildContentsPlugin?.getConfig()
            if (config?.disableCache) return totalTargetReport

            if (buildContentsPlugin?.cacheChecker) {
                return totalTargetReport.filter((report, i, allReports) =>
                    buildContentsPlugin.cacheChecker?.(report.build_state, {
                        report,
                        i,
                        allReports,
                    })
                )
            }

            return updateTargetReport
        }

        for (const plugin of this.contentsModifierPluginManger.$loader
            .plugins) {
            plugin.injectDependencies({
                processor: this.$mdProcessor,
                ...this.option,
            })
            const config = plugin.getConfig()
            this.option.logger.updateName(config.name)

            for (const { newContent, writePath } of await plugin.buildContents({
                buildStore: getTargetBuildStore(plugin),
            })) {
                const updatedTextFile = await this.$io.writer.write({
                    data: newContent,
                    filePath: writePath,
                })

                if (!updatedTextFile.success) {
                    this.$logger.error(
                        `Failed to modify contents at ${writePath}`
                    )
                }
            }
        }
    }

    private async logBuildResult(): Promise<void> {
        this.option.logger.updateName('BuildResultLogger')
        await this.$buildLogger.writeBuilderLog(
            this.$store.getStoreList('current')
        )
    }

    private async cleanUp(): Promise<void> {
        this.option.logger.updateName('CleanUp')
        const saved = await this.$cacheManager.save()
        if (!saved) {
            this.$logger.error('Failed to save cache manager')
            return
        } else {
            this.$logger.info('Cache manager saved')
        }
    }

    // It's better to divide build steps as individual methods, do not add argument for it
    // External argument deps will increase coupling and decrease testability
    public async build(): Promise<void> {
        // [ Phase1 ]:: Synchronize build store
        await this.syncBuildStore()

        // [ Phase2 ]:: Build origin file tree structure
        await this.buildTree()

        // [ Phase3 ]:: Build file tree and handle caching
        await this.buildFileTree()

        // [ Phase4 ]:: Walk generated tree and apply plugins
        await this.walkGeneratedTree()

        // [ Phase5 ]:: Apply contents modifier plugins
        await this.buildContents()

        // [ Phase6 ]:: Log build result
        await this.logBuildResult()

        // [ Phase7 ]:: Clean up and save cache manager
        await this.cleanUp()
    }
}
