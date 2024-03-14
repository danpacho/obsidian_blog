import type { Logger } from '@blogger/logger'
import {
    MetaEngine,
    type MetaEngineConstructor,
    type PolymorphicMeta,
} from '../../meta/engine'
import type { FTreeNode, FolderNode } from '../../parser/node'
import type { FileTreeParser } from '../../parser/parser'
import { type BuilderPlugin, Pluggable, type PluginAdapter } from '../plugin'
import { CorePlugins, CorePluginsConfig } from '../plugin/core'
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
    private readonly $cacheManager: BuildCacheManager
    private readonly $buildInfoGenerator: BuildInfoGenerator
    private readonly $buildLogger: BuildResultLogger

    private get $parser(): FileTreeParser {
        return this.option.parser
    }
    private get $io() {
        return this.option.io
    }
    private get $m(): Logger {
        return this.option.logger
    }

    private readonly treeBuildPluggable: Pluggable<
        BuilderPlugin['build:origin:tree']
    > = new Pluggable()
    private readonly generatedTreeWalkerPluggable: Pluggable<
        BuilderPlugin['walk:generated:tree']
    > = new Pluggable()
    private readonly contentsModifierPluggable: Pluggable<
        BuilderPlugin['build:contents']
    > = new Pluggable()

    public use({
        'build:origin:tree': treeBuildPluginSet,
        'walk:generated:tree': generatedTreeWalkerPluginSet,
        'build:contents': contentsBuildPluginSet,
    }: PluginAdapter): BuildSystem {
        treeBuildPluginSet && this.treeBuildPluggable.use(treeBuildPluginSet)

        generatedTreeWalkerPluginSet &&
            this.generatedTreeWalkerPluggable.use(generatedTreeWalkerPluginSet)

        contentsBuildPluginSet &&
            this.contentsModifierPluggable.use(contentsBuildPluginSet)

        return this
    }

    private async getAST(): Promise<FolderNode | undefined> {
        if (this.$parser.ast?.children.length !== 0) {
            return this.$parser.ast
        }
        const ast = await this.$parser.parse()
        if (!ast) {
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

        await this.$parser.walkAST(
            originAST.children,
            async (node) => {
                switch (node.category) {
                    case 'TEXT_FILE': {
                        const contentsBuildInfo =
                            await this.$buildInfoGenerator.generateContentBuildInfo(
                                node
                            )
                        node.injectBuildInfo(contentsBuildInfo)
                        break
                    }
                    default: {
                        const assetsBuildInfo =
                            await this.$buildInfoGenerator.generateAssetBuildInfo(
                                node
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
            // SKIP FOLDER NODE
            true
        )

        this.$cacheManager.syncRemovedStore()
    }

    private async buildOriginFileTreeStructure(): Promise<void> {
        const originAST = await this.getAST()
        if (!originAST) return
        if (!originAST.children) return

        for (const plugin of this.treeBuildPluggable.plugin) {
            const walkerPlugin = await plugin({
                meta: this.createMetaManager,
                ...this.option,
            })
            await this.$parser.walkAST(originAST.children, walkerPlugin)
        }
    }

    private async walkerCachePipe({
        walker,
        whenCached,
    }: {
        walker: Parameters<FileTreeParser['walkAST']>[1]
        whenCached?: (node: FTreeNode) => void
    }): Promise<Parameters<FileTreeParser['walkAST']>[1]> {
        const cacheChecker = (node: FTreeNode): boolean => {
            const { buildInfo } = node
            if (!buildInfo?.id) return false

            const status = this.$cacheManager.checkStatus(buildInfo.id)
            // console.log(status, node.fileName)
            if (!status.success) {
                return false
            }

            if (status.data !== 'CACHED') {
                return false
            }

            //TODO: status handling at plugins interface
            whenCached?.(node)
            return true
        }

        return async (node, i, children) => {
            //TODO: status handling at plugins interface
            if (cacheChecker(node)) return

            await walker(node, i, children)
        }
    }

    private async buildFileTree() {
        const originAST = await this.getAST()
        if (!originAST) return
        if (!originAST.children) return

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

    private async getGeneratedTree(): Promise<FolderNode | undefined> {
        await this.$parser.updateRootFolder(this.option.buildPath.contents)

        const generatedAST = await this.getAST()
        if (!generatedAST) return
        if (!generatedAST.children) return

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

        return generatedAST
    }

    private async walkGeneratedTree(): Promise<void> {
        const generatedAST = await this.getGeneratedTree()
        if (!generatedAST || !generatedAST) return

        for (const plugin of this.generatedTreeWalkerPluggable.plugin) {
            const walkerPlugin = await plugin({
                meta: this.createMetaManager,
                ...this.option,
            })
            const cachePipe = await this.walkerCachePipe({
                walker: walkerPlugin,
            })
            await this.$parser.walkAST(generatedAST.children, cachePipe, true)
        }
    }

    private async buildContents(): Promise<void> {
        const generatedAST = await this.getGeneratedTree()
        if (!generatedAST) return
        if (!generatedAST.children) return

        const updateTargetReport = this.$store
            .getStoreList('current')
            .filter(
                (report) =>
                    report.build_state === 'UPDATED' ||
                    report.build_state === 'ADDED'
            )

        if (updateTargetReport.length === 0) return

        for (const plugin of this.contentsModifierPluggable.plugin) {
            const pluginResult = await plugin({
                buildStore: updateTargetReport,
                meta: this.createMetaManager,
                ...this.option,
            })

            for (const {
                content: modifiedContent,
                writePath,
            } of pluginResult) {
                const updatedTextFile = await this.$io.writer.write({
                    data: modifiedContent,
                    filePath: writePath,
                })

                if (!updatedTextFile.success) {
                    this.$m.error(`Failed to modify contents at ${writePath}`)
                }
            }
        }
    }

    private async logBuildResult(): Promise<void> {
        await this.$buildLogger.writeBuilderLog(
            this.$store.getStoreList('current')
        )
    }

    private async cleanUp(): Promise<void> {
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
        // [ Phase1 ]:: Origin Tree build phase
        await this.syncBuildStore()

        // [ Phase1 ]:: Origin Tree build phase
        await this.buildOriginFileTreeStructure()

        // [ Phase2 ]:: File generation phase + caching logics
        await this.buildFileTree()

        // [ Phase3 ]:: Generated Tree build phase
        await this.walkGeneratedTree()

        // [ Phase4 ]:: Contents modifier plugins
        await this.buildContents()

        // [ Phase5 ]:: Report build result
        await this.logBuildResult()

        // [ Phase6 ]:: Clean up
        await this.cleanUp()
    }
}
