import { Runner } from '@obsidian_blogger/plugin_api'

import {
    BuildPlugin,
    type BuildPluginDependencies,
    type BuildPluginDynamicConfig,
    type BuildPluginResponse,
    type BuildPluginStaticConfig,
} from './plugin/build.plugin'
import { PluginCachePipelines } from './plugin/cache.interface'

import type { FileTreeNode, FileTreeParser, FolderNode } from '../parser'
import type { BuildCacheManager, BuildStore, BuildStoreList } from './core'
import type {
    BuildContentsPlugin,
    BuildTreePlugin,
    WalkTreePlugin,
} from './plugin'

interface BuilderInternalPluginStaticConfig extends BuildPluginStaticConfig {
    skipFolderNode?: boolean
    disableCache?: boolean
}
interface BuilderInternalPluginDependencies extends BuildPluginDependencies {
    cachePipeline: PluginCachePipelines['treeCachePipeline']
}
export abstract class BuilderInternalPlugin extends BuildPlugin<
    BuilderInternalPluginStaticConfig,
    BuildPluginDynamicConfig,
    BuilderInternalPluginDependencies
> {
    /**
     * Builder internal plugin procedures
     */
    public abstract procedure(
        /**
         * Current node
         */
        node: FileTreeNode,
        /**
         * Current node walk context
         */
        context: {
            /**
             * Children of the current node
             */
            children: Array<FileTreeNode> | undefined
            /**
             * Siblings of the current node
             */
            siblings: Array<FileTreeNode> | undefined
            /**
             * Current node index in the siblings list
             */
            siblingsIndex: number | undefined
        }
    ): Promise<void>

    private async getAST(
        parser: FileTreeParser
    ): Promise<FolderNode | undefined> {
        if (parser.ast?.children.length !== 0) {
            return parser.ast
        }
        const ast = await parser.parse()
        if (!ast) {
            this.$logger.updateName('ASTParser')
            this.$logger.error('Failed to parse file AST')
            return undefined
        }
        return ast
    }

    public async execute(
        _: { stop: () => void; resume: () => void },
        cachePipe: PluginCachePipelines['treeCachePipeline']
    ) {
        this.$jobManager.registerJob({
            name: 'build:internal',
            prepare: async () => {
                this.$logger.updateName(this.name)
                this.procedure = this.procedure.bind(this)
            },
            execute: async () => {
                const parser = this.getRunTimeDependency('parser')
                const cacheManager = this.getRunTimeDependency('cacheManager')

                const error: BuildPluginResponse['error'] = []

                const originalAST = await this.getAST(parser)
                if (!originalAST) {
                    error.push({
                        error: new Error('original AST is not prepared.', {
                            cause: this.staticConfig,
                        }),
                    })
                    return {
                        error,
                        history: this.$logger.getHistory(),
                    }
                }

                await parser.walk(
                    async (node, context) => {
                        if (
                            cachePipe({
                                node,
                                context,
                                cacheManager,
                                config: {
                                    disableCache:
                                        this.staticConfig.disableCache ?? false,
                                },
                            })
                        ) {
                            return
                        }
                        try {
                            await this.procedure(node, context)
                        } catch (e) {
                            error.push({
                                filepath: node.fileName,
                                error:
                                    e instanceof Error
                                        ? e
                                        : new Error('unknown error', {
                                              cause: [e, node],
                                          }),
                            })
                        }
                    },
                    {
                        type: 'DFS',
                        skipFolderNode:
                            this.staticConfig.skipFolderNode ?? true,
                        walkRoot: originalAST,
                    }
                )
                return {
                    error,
                    history: this.$logger.getHistory(),
                }
            },
            cleanup: async (job) => {
                await this.cleanup?.(job)
            },
        })

        await this.$jobManager.processJobs()

        return this.$jobManager.history
    }
}

export class SyncBuildStore extends BuilderInternalPlugin {
    protected override defineStaticConfig(): BuilderInternalPluginStaticConfig {
        return {
            name: 'sync-build-store',
            description: "Syncing the build store with the file system's state",
        }
    }

    public override async prepare(): Promise<void> {
        await this.getRunTimeDependency('cacheManager').setup()
    }

    public procedure = async (node: FileTreeNode) => {
        const buildInfoGenerator =
            this.getRunTimeDependency('buildInfoGenerator')

        switch (node.category) {
            case 'TEXT_FILE': {
                const contentsBuildInfo =
                    await buildInfoGenerator.generateContentBuildInfo(
                        node,
                        this.dependencies!
                    )
                node.injectBuildInfo({
                    build_path: contentsBuildInfo.build_path,
                    id: contentsBuildInfo.id,
                    build_state: 'ADDED',
                })
                break
            }
            default: {
                const assetsBuildInfo =
                    await buildInfoGenerator.generateAssetBuildInfo(
                        node,
                        this.dependencies!
                    )
                node.injectBuildInfo({
                    build_path: assetsBuildInfo.build_path,
                    id: assetsBuildInfo.id,
                    build_state: 'ADDED',
                })
                break
            }
        }

        const update =
            this.getRunTimeDependency('cacheManager').updateStore(node)

        if (!update.success) {
            this.$logger.error(update.error.message)
            throw update.error
        }

        node.injectBuildInfo(update.data)
    }

    public override async cleanup(): Promise<void> {
        this.getRunTimeDependency('cacheManager').syncRemovedStore()
    }
}

export class DuplicateObsidianVaultIntoSource extends BuilderInternalPlugin {
    protected defineStaticConfig(): BuilderInternalPluginStaticConfig {
        return {
            name: 'duplicate-obsidian-vault-into-source',
            description: 'Duplicating the Obsidian vault into the source',
        }
    }

    public async procedure(node: FileTreeNode): Promise<void> {
        const { buildInfo, absolutePath, category } = node
        if (!buildInfo?.build_path) {
            this.$logger.error(
                `Build info is not available for ${absolutePath}`
            )
            throw new Error(`Build info is not available for ${absolutePath}`)
        }

        switch (category) {
            case 'FOLDER': {
                const cpResult = await this.$io.cpFolder({
                    from: buildInfo.build_path.origin,
                    to: buildInfo.build_path.build,
                })
                if (!cpResult.success) {
                    this.$logger.error(
                        `Failed to copy folder ${absolutePath} to ${buildInfo.build_path.build}`
                    )
                }
                return
            }
            case 'TEXT_FILE': {
                const cpResult = await this.$io.cpFile({
                    from: buildInfo.build_path.origin,
                    to: buildInfo.build_path.build,
                    type: 'text',
                })
                if (!cpResult.success) {
                    this.$logger.error(
                        `Failed to copy text file ${absolutePath} to ${buildInfo.build_path.build}`
                    )
                }
                return
            }
            default: {
                const cpResult = await this.$io.cpFile({
                    from: buildInfo.build_path.origin,
                    to: buildInfo.build_path.build,
                    type: 'media',
                })
                if (!cpResult.success) {
                    this.$logger.error(
                        `Failed to copy media file ${absolutePath} to ${buildInfo.build_path.build}`
                    )
                }
                return
            }
        }
    }

    public override async cleanup(): Promise<void> {
        const store = this.getRunTimeDependency('buildStore')

        const removeTarget = store.getRemoveTarget()

        const removeBatch = await Promise.all(
            removeTarget.map((target) =>
                this.$io.writer.delete(target.build_path.build)
            )
        )

        const hasError = removeBatch.some((result) => !result.success)

        if (hasError) {
            this.$logger.error('Some files could not be removed.')
            for (const result of removeBatch) {
                if (!result.success) {
                    this.$logger.error(`Failed to remove: ${result.error}`)
                }
            }
        }

        const save = await store.saveReport()

        if (!save.success) {
            this.$logger.error('Failed to save build report')
            throw save.error
        }
    }
}

export class InjectBuildInfoToGeneratedTree extends BuilderInternalPlugin {
    protected defineStaticConfig(): BuilderInternalPluginStaticConfig {
        return {
            name: 'inject-build-info-to-generated-tree',
            description: 'Injecting build info to the generated tree',
            disableCache: true,
        }
    }

    public async procedure(node: FileTreeNode): Promise<void> {
        const generatedBuildInfo = this.getRunTimeDependency(
            'buildStore'
        ).findByBuildPath(node.absolutePath, {
            target: 'current',
        })

        if (!generatedBuildInfo.success) {
            this.$logger.error(generatedBuildInfo.error.message)
            throw generatedBuildInfo.error
        }

        node.injectBuildInfo({
            id: generatedBuildInfo.data.id,
            build_path: generatedBuildInfo.data.build_path,
            build_state: generatedBuildInfo.data.build_state,
        })
        return
    }
}

export class BuilderInternalPluginRunner extends Runner.PluginRunner<
    BuilderInternalPlugin,
    BuilderInternalPluginDependencies
> {
    public async run(
        pluginPipes: BuilderInternalPlugin[],
        context: BuilderInternalPluginDependencies
    ) {
        for (const plugin of pluginPipes) {
            this.$pluginRunner.registerJob({
                name: plugin.name,
                prepare: async () => {
                    plugin.injectDependencies(context)
                    await plugin.prepare?.()
                },
                execute: async (controller) => {
                    return await plugin.execute(
                        controller,
                        context.cachePipeline
                    )
                },
                cleanup: async (job) => {
                    for (const res of job.response ?? []) {
                        await plugin.cleanup?.(res)
                    }
                },
            })
        }

        await this.$pluginRunner.processJobs()

        return this.history
    }
}

export class BuilderPluginCachePipelines extends PluginCachePipelines {
    /**
     * Default exclude patterns
     * @default [/^\.\w+/, /^\./]
     * @description Exclude files that start with a `.`(dot)
     */
    public static defaultExclude = [/^\.\w+/, /^\./]
    private static excludeByFilename(
        fileName: string,
        exclude?: Array<string>
    ): boolean {
        const shouldBeExcluded: boolean = [
            ...BuilderPluginCachePipelines.defaultExclude,
            exclude ?? [],
        ].some((pattern) => {
            if (typeof pattern === 'string') {
                return pattern === fileName
            }
            if (pattern instanceof RegExp) {
                return pattern.test(fileName)
            }
            return pattern.some((patternName) => patternName === fileName)
        })

        return shouldBeExcluded
    }

    public override treeCachePipeline(args: {
        cacheManager: BuildCacheManager
        node: FileTreeNode
        context:
            | Parameters<WalkTreePlugin['walk']>[1]
            | Parameters<BuildTreePlugin['walk']>[1]
        config:
            | WalkTreePlugin['dynamicConfig']
            | BuildTreePlugin['dynamicConfig']
        pluginCacheChecker?:
            | WalkTreePlugin['cacheChecker']
            | BuildTreePlugin['cacheChecker']
    }): boolean {
        const { config, context, node, pluginCacheChecker, cacheManager } = args
        const { buildInfo } = node

        if (!buildInfo?.id) return false
        if (config?.disableCache) return false

        const fileName = node.fileName
        const shouldBeExcluded: boolean =
            BuilderPluginCachePipelines.excludeByFilename(fileName)

        if (shouldBeExcluded) return false

        const status = cacheManager.checkStatus(buildInfo.id)

        if (!status.success) return false

        if (pluginCacheChecker) {
            // User-defined caching logic
            return pluginCacheChecker(
                { state: status.data, node },
                {
                    children: context.children,
                    siblings: context.siblings,
                    siblingsIndex: context.siblingsIndex,
                }
            )
        }

        if (status.data !== 'CACHED') {
            // Default cache logic
            return false
        }

        return true
    }

    public override buildContentsCachePipeline(args: {
        store: BuildStore
        config: BuildContentsPlugin['dynamicConfig']
        pluginCacheChecker?: BuildContentsPlugin['cacheChecker']
    }): BuildStoreList {
        const { config, store, pluginCacheChecker } = args

        const totalTargetReport = store
            .getStoreList('current')
            .filter(({ file_name }) => {
                const excludeFileStatus =
                    BuilderPluginCachePipelines.excludeByFilename(file_name)
                return !excludeFileStatus
            })

        if (config?.disableCache) {
            return totalTargetReport
        }

        if (pluginCacheChecker) {
            return totalTargetReport.filter((report, i, allReports) =>
                pluginCacheChecker(report.build_state, {
                    report,
                    i,
                    allReports,
                })
            )
        }

        const updateTargetReport = totalTargetReport.filter(
            ({ build_state }) =>
                build_state === 'UPDATED' || build_state === 'ADDED'
        )

        return updateTargetReport
    }
}
