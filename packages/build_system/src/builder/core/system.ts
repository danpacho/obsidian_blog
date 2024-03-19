import { Logger } from '@blogger/logger'
import {
    MetaEngine,
    type MetaEngineConstructor,
    type PolymorphicMeta,
} from '../../meta/engine'
import type { FTreeNode, FolderNode } from '../../parser/node'
import type { FileTreeParser } from '../../parser/parser'
import {
    type BuilderPlugin,
    type ContentsModifierPluginConfig,
    type FileTreePluginConfig,
    type PluginAdapter,
    PluginManager,
} from '../plugin'
import { CorePlugins, type CorePluginsConfig } from '../plugin/core'
import { BuildResultLogger } from './build.logger'
import {
    BuildCacheManager,
    type BuildCacheManagerConstructor,
} from './cache.manager'
import {
    BuildInfoGenerator,
    type BuildInfoGeneratorConstructor,
} from './info.generator'
import { BuildStore, type BuildStoreConstructor } from './store'

export interface BuildSystemConstructor
    extends Omit<BuildCacheManagerConstructor, 'store'>,
        BuildStoreConstructor,
        BuildInfoGeneratorConstructor {
    readonly parser: FileTreeParser
    readonly logger: Logger
    readonly corePluginConfig?: CorePluginsConfig
    readonly disableCorePlugins?: boolean
}

export class BuildSystem {
    public constructor(private readonly option: BuildSystemConstructor) {
        this.$store = new BuildStore(option)
        this.$cacheManager = new BuildCacheManager({
            ...option,
            store: this.$store,
        })
        this.$buildInfoGenerator = new BuildInfoGenerator(option)
        this.$buildLogger = new BuildResultLogger(option)

        // Should bind this context for Plugin callings
        this.createMetaManager = this.createMetaManager.bind(this)

        if (!option.disableCorePlugins) {
            const corePlugin = CorePlugins(option.corePluginConfig)
            this.use(corePlugin)
        }
    }

    private readonly $store: BuildStore
    private readonly $buildLogger: BuildResultLogger
    private readonly $cacheManager: BuildCacheManager
    private readonly $buildInfoGenerator: BuildInfoGenerator

    private readonly treeBuildPluginManager: PluginManager<
        BuilderPlugin['build:origin:tree'],
        FileTreePluginConfig
    > = new PluginManager({})
    private readonly generatedTreeWalkerPluginManager: PluginManager<
        BuilderPlugin['walk:generated:tree'],
        FileTreePluginConfig
    > = new PluginManager({})
    private readonly contentsModifierPluginManger: PluginManager<
        BuilderPlugin['build:contents'],
        ContentsModifierPluginConfig
    > = new PluginManager({})

    private get $parser(): FileTreeParser {
        return this.option.parser
    }
    private get $io() {
        return this.option.io
    }
    private get $m(): Logger {
        return this.option.logger
    }

    public use({
        'build:origin:tree': treeBuildPluginSet,
        'walk:generated:tree': generatedTreeWalkerPluginSet,
        'build:contents': contentsBuildPluginSet,
    }: PluginAdapter): BuildSystem {
        treeBuildPluginSet &&
            this.treeBuildPluginManager.$plug.use(treeBuildPluginSet)

        generatedTreeWalkerPluginSet &&
            this.generatedTreeWalkerPluginManager.$plug.use(
                generatedTreeWalkerPluginSet
            )

        contentsBuildPluginSet &&
            this.contentsModifierPluginManger.$plug.use(contentsBuildPluginSet)

        return this
    }

    private async getAST(): Promise<FolderNode | undefined> {
        if (this.$parser.ast?.children.length !== 0) {
            return this.$parser.ast
        }
        const ast = await this.$parser.parse()
        if (!ast) {
            this.option.logger.updateName('ASTParser')
            this.$m.error('Failed to parse file AST')
            return undefined
        }
        return ast
    }

    private createMetaManager<MetaShape extends PolymorphicMeta>(
        engine: Omit<MetaEngineConstructor<MetaShape>, 'ioManager'>
    ) {
        return MetaEngine.create(engine, this.$io)
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
                                {
                                    ...this.option,
                                    meta: this.createMetaManager,
                                }
                            )
                        node.injectBuildInfo(contentsBuildInfo)
                        break
                    }
                    default: {
                        const assetsBuildInfo =
                            await this.$buildInfoGenerator.generateAssetBuildInfo(
                                node,
                                {
                                    ...this.option,
                                    meta: this.createMetaManager,
                                }
                            )
                        node.injectBuildInfo(assetsBuildInfo)
                        break
                    }
                }

                const update = this.$cacheManager.updateStore(node)
                if (!update.success) {
                    this.$m.error(update.error.message)
                    return
                }
            },
            true // SKIP FOLDER NODE
        )

        this.$cacheManager.syncRemovedStore()
    }

    private async buildOriginFileTreeStructure(): Promise<void> {
        const originAST = await this.getAST()
        if (!originAST) return
        if (!originAST.children) return

        for (const plugin of this.treeBuildPluginManager.$plug.pluginList) {
            const { walker, ...config } = await plugin({
                ...this.option,
                meta: this.createMetaManager,
            })
            this.option.logger.updateName(config.name)
            const cachePipe = await this.walkerCachePipe({
                walker,
                pluginConfig: config,
            })

            await this.$parser.walkAST(
                originAST.children,
                cachePipe,
                config.skipFolderNode ?? false
            )
        }
    }

    private async walkerCachePipe({
        walker,
        pluginConfig,
        whenCached,
    }: {
        walker: Parameters<FileTreeParser['walkAST']>[1]
        pluginConfig?: FileTreePluginConfig | undefined
        whenCached?: (node: FTreeNode) => void
    }): Promise<Parameters<FileTreeParser['walkAST']>[1]> {
        const cacheChecker = (
            node: FTreeNode,
            i: number,
            children: Array<FTreeNode>
        ): boolean => {
            const { buildInfo } = node
            if (!buildInfo?.id) return false

            if (pluginConfig?.disableCache) return false

            const fileName = node.fileName
            if (pluginConfig?.exclude) {
                if (typeof pluginConfig.exclude === 'string') {
                    if (pluginConfig.exclude === fileName) {
                        return true
                    }
                } else if (pluginConfig.exclude instanceof RegExp) {
                    if (pluginConfig.exclude.test(fileName)) {
                        return true
                    }
                } else {
                    if (
                        pluginConfig.exclude.some((ex) => fileName.includes(ex))
                    ) {
                        return true
                    }
                }
            }

            const status = this.$cacheManager.checkStatus(buildInfo.id)
            if (!status.success) {
                return false
            }

            if (pluginConfig?.cacheChecker) {
                // User-defined caching logic
                return pluginConfig.cacheChecker(status.data, {
                    node,
                    i,
                    total: children,
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

            await walker(node, i, children)
        }
    }

    private async buildFileTree() {
        const originAST = await this.getAST()
        if (!originAST) return
        if (!originAST.children) return

        this.option.logger.updateName('FileTreeBuilder')
        await this.$parser.walkAST(
            originAST.children,
            await this.walkerCachePipe({
                walker: async (node) => {
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
                        this.$m.error(
                            `Failed to copy ${absolutePath} to ${buildInfo.build_path.build}`
                        )
                    }
                    return
                },
            })
        )

        const removeTarget = this.$store.getRemoveTarget()
        for (const target of removeTarget) {
            const removeResult = await this.$io.writer.deleteFile(
                target.build_path.build
            )
            if (!removeResult.success) {
                this.$m.error(`Failed to remove ${target}`)
            }
        }

        const save = await this.$store.saveReport()

        if (!save.success) {
            this.$m.error('Failed to save build report')
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
                    this.$m.error(generatedBuildInfo.error.message)
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

        for (const plugin of this.generatedTreeWalkerPluginManager.$plug
            .pluginList) {
            const { walker, ...config } = await plugin({
                meta: this.createMetaManager,
                ...this.option,
            })
            this.option.logger.updateName(config.name)

            const cachePipe = await this.walkerCachePipe({
                walker,
                pluginConfig: config,
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
            pluginConfig?: ContentsModifierPluginConfig
        ) => {
            if (!pluginConfig) return updateTargetReport
            if (pluginConfig?.disableCache) return totalTargetReport

            if (pluginConfig.cacheChecker) {
                return totalTargetReport.filter((report, i, total) =>
                    pluginConfig.cacheChecker?.(report.build_state, {
                        report,
                        i,
                        total,
                    })
                )
            }

            return updateTargetReport
        }

        for (const plugin of this.contentsModifierPluginManger.$plug
            .pluginList) {
            const { modifier, ...config } = await plugin({
                meta: this.createMetaManager,
                ...this.option,
            })
            this.option.logger.updateName(config.name)

            for (const { content, writePath } of await modifier(
                getTargetBuildStore(config)
            )) {
                const updatedTextFile = await this.$io.writer.write({
                    data: content,
                    filePath: writePath,
                })

                if (!updatedTextFile.success) {
                    this.$m.error(`Failed to modify contents at ${writePath}`)
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
            this.$m.error('Failed to save cache manager')
            return
        } else {
            this.$m.info('Cache manager saved')
        }
    }

    // It's better to divide build steps as individual methods, do not add argument for it
    // External argument deps will increase coupling and decrease testability
    public async build(): Promise<void> {
        // [ Phase1 ]:: Synchronize build store
        await this.syncBuildStore()

        // [ Phase2 ]:: Build origin file tree structure
        await this.buildOriginFileTreeStructure()

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
