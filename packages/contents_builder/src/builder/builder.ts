import type { UUID } from 'crypto'
import { createHash } from 'crypto'
import type { Logger } from '@blogger/logger'
import type { IOManager } from '../io_manager'
import {
    MetaEngine,
    MetaEngineConstructor,
    PolymorphicMeta,
} from '../meta/engine'
import { FTreeNode, FolderNode } from '../parser/node'
import type { FileTreeParser } from '../parser/parser'
import { CorePlugins } from './core'
import { type BuilderPlugin, Pluggable, type PluginAdapter } from './plugin'
import { type BuildReportSet, BuildReporter } from './reporter'
import { BuildResultLogger } from './result.logger'

export interface FileBuilderConstructor {
    readonly fileTreeParser: FileTreeParser
    readonly ioManager: IOManager
    readonly buildPath: {
        content: string
        assets: string
    }
    readonly logger: Logger
}
export class FileBuilder {
    private readonly treeBuildPluggable: Pluggable<
        BuilderPlugin['build:origin:tree']
    > = new Pluggable()
    private readonly generatedTreeWalkerPluggable: Pluggable<
        BuilderPlugin['walk:generated:tree']
    > = new Pluggable()
    private readonly contentsModifierPluggable: Pluggable<
        BuilderPlugin['build:contents']
    > = new Pluggable()

    private get $m(): Logger {
        return this.option.logger
    }
    private readonly $reporter: BuildReporter
    private readonly $buildLogger: BuildResultLogger
    private readonly buildUpdatedReport: BuildReportSet = []
    public use({
        'build:origin:tree': treeBuildPluginSet,
        'walk:generated:tree': generatedTreeWalkerPluginSet,
        'build:contents': contentsBuildPluginSet,
    }: PluginAdapter): FileBuilder {
        treeBuildPluginSet && this.treeBuildPluggable.use(treeBuildPluginSet)

        generatedTreeWalkerPluginSet &&
            this.generatedTreeWalkerPluggable.use(generatedTreeWalkerPluginSet)

        contentsBuildPluginSet &&
            this.contentsModifierPluggable.use(contentsBuildPluginSet)
        return this
    }

    private get $parser(): FileTreeParser {
        return this.option.fileTreeParser
    }
    private get $io(): IOManager {
        return this.option.ioManager
    }

    private constructor(private readonly option: FileBuilderConstructor) {
        this.$reporter = new BuildReporter(option)
        this.$buildLogger = new BuildResultLogger(option)
        // Should bind this context for Plugin callings
        this.createMetaManager = this.createMetaManager.bind(this)
    }

    public static async create(
        option: FileBuilderConstructor & {
            disableCorePlugins?: true
        }
    ): Promise<FileBuilder> {
        await option.ioManager.writer.createFolder(option.buildPath.content)
        await option.ioManager.writer.createFolder(option.buildPath.assets)

        const builder = new FileBuilder(option)
        if (!option.disableCorePlugins) builder.use(CorePlugins)

        return builder
    }

    private encodeHashUUID(inputString: string): UUID {
        const hash = createHash('sha256').update(inputString).digest('hex')
        const uuid: UUID = [...hash]
            .reduce((acc, cur, i) => {
                if (i === 8 || i === 12 || i === 16 || i === 20) {
                    acc.push('-')
                }
                acc.push(cur)
                return acc
            }, [] as Array<string>)
            .join('') as UUID

        return uuid
    }

    private createMetaManager<MetaShape extends PolymorphicMeta>(
        engine: Omit<MetaEngineConstructor<MetaShape>, 'ioManager'>
    ) {
        return MetaEngine.create(engine, this.$io)
    }

    private checkCache(buildID: UUID): boolean {
        return this.$reporter.reportUUID.has(buildID)
    }

    private async buildFileTreeStructure(
        ast: FTreeNode,
        option: {
            target: 'origin' | 'generated'
        }
    ): Promise<void> {
        if (!ast.children) return

        const pluginTarget =
            option.target === 'origin'
                ? this.treeBuildPluggable
                : this.generatedTreeWalkerPluggable

        for (const plugin of pluginTarget.plugin) {
            const walkerPlugin = await plugin({
                ast,
                uuidEncoder: this.encodeHashUUID,
                metaEngine: this.createMetaManager,
                ...this.option,
            })
            await this.$parser.walkAST(ast.children, walkerPlugin, true)
        }
    }

    private async buildContents(ast: FTreeNode): Promise<void> {
        if (!ast.children) return
        const buildTotalReport = this.$reporter.totalReport

        if (buildTotalReport.length === 0) return

        for (const plugin of this.contentsModifierPluggable.plugin) {
            const pluginResult = await plugin({
                ast,
                buildReport: {
                    total: buildTotalReport,
                    updated: this.buildUpdatedReport,
                    cached: this.$reporter.cachedReport,
                    added: this.$reporter.addedReport,
                },
                uuidEncoder: this.encodeHashUUID,
                metaEngine: this.createMetaManager,
                ...this.option,
            })

            for (const { modifiedContent, writePath } of pluginResult) {
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

    private async buildFileTree(ast: FTreeNode) {
        if (!ast.children) return

        const loadedReport = await this.$reporter.loadReport()

        if (!loadedReport.success) {
            this.$m.info('Report not found, build all files')
        }

        const buildedFileOriginList = new Set<string>()

        await this.$parser.walkAST(ast.children, async (node) => {
            const { buildInfo, absolutePath, category } = node
            if (buildInfo.shouldSkip) {
                this.$m.info(`Skipped: ${node.fileName}`)
                return
            }

            if (!buildInfo.id || !buildInfo.path || !category) return

            if (this.checkCache(buildInfo.id)) {
                this.$reporter.updateReport(node, {
                    buildID: buildInfo.id,
                    buildPath: buildInfo.path,
                    state: 'CACHED',
                })
                buildedFileOriginList.add(node.absolutePath)
                return
            }

            const cpResult =
                category === 'TEXT_FILE'
                    ? await this.$io.cpFile({
                          from: absolutePath,
                          to: buildInfo.path,
                          type: 'text',
                      })
                    : await this.$io.cpFile({
                          from: absolutePath,
                          to: buildInfo.path,
                          type: 'media',
                      })

            if (!cpResult.success) return

            const updateTarget = this.$reporter.addReport(node, {
                buildID: buildInfo.id,
                buildPath: buildInfo.path,
            })
            if (updateTarget.success) {
                buildedFileOriginList.add(node.absolutePath)
                this.buildUpdatedReport.push(updateTarget.data)
            }
            return
        })

        if (loadedReport.success) {
            const previousBuildReport = loadedReport.data
            const removedReport: BuildReportSet = previousBuildReport.filter(
                (report) => !buildedFileOriginList.has(report.path.origin)
            )
            for (const report of removedReport) {
                const remove = await this.$io.writer.deleteFile(
                    report.path.build
                )
                const removeResult = this.$reporter.removeReport(
                    report.path.origin
                )
                if (removeResult.success && remove.success) {
                    this.$m.warn(`Removed: ${report.name}`)
                }
            }
        }

        const buildReport = await this.$reporter.writeReport()

        if (!buildReport.success) {
            this.$m.error('Failed to write build report')
        }
    }

    private async getAST(): Promise<FolderNode | undefined> {
        if (this.$parser.ast?.children.length !== 0) return this.$parser.ast

        const ast = await this.$parser.parse()
        if (!ast) {
            this.$m.error('Failed to parse file AST')
            return undefined
        }
        return ast
    }

    public async build(): Promise<void> {
        const originAST = await this.getAST()
        if (!originAST) return

        // Phase1: Origin Tree build phase
        await this.buildFileTreeStructure(originAST, {
            target: 'origin',
        })

        // Phase2: File generation phase + caching logics
        await this.buildFileTree(originAST)

        // Phase3: Generated Tree build phase
        // Update ast root path to reflect the generated files
        this.$parser.updateRootFolder(this.option.buildPath.content)
        const generatedAST = await this.getAST()
        if (!generatedAST) return
        await this.buildFileTreeStructure(generatedAST, {
            target: 'generated',
        })

        // Phase3: Contents modifier plugins
        await this.buildContents(generatedAST)

        // Phase4: Report build result
        await this.$buildLogger.writeBuilderLog(this.$reporter.totalReport)
    }
}
