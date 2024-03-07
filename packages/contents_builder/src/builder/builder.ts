import type { UUID } from 'crypto'
import { createHash } from 'crypto'
import type { Logger } from '@blogger/logger'
import type { IOManager } from '../io_manager'
import { FTreeNode, FolderNode } from '../parser/node'
import type { FileTreeParser } from '../parser/parser'
import { CorePlugins } from './core'
import {
    type ContentsModifierPlugin,
    type FileTreePlugin,
    Pluggable,
    type UsePlugin,
} from './plugin'
import { type BuildReport, BuildReporter } from './reporter'
import { BuildResultLogger } from './result.logger'

export interface FileBuilderConstructor {
    readonly fileTreeParser: FileTreeParser
    readonly ioManager: IOManager
    readonly assetsPath: string
    readonly buildPath: string
    readonly logger: Logger
}
export class FileBuilder {
    private readonly treeConstructorPluggable: Pluggable<FileTreePlugin> =
        new Pluggable()
    private readonly contentsModifierPluggable: Pluggable<ContentsModifierPlugin> =
        new Pluggable()

    private get $m(): Logger {
        return this.option.logger
    }
    private readonly $reporter: BuildReporter
    private readonly $buildLogger: BuildResultLogger
    private readonly buildUpdatedReport: Array<BuildReport> = []

    public use({
        'build:file:tree': treeConstructorPlugins,
        'build:contents': updatedContentsModifierPlugins,
    }: UsePlugin): FileBuilder {
        treeConstructorPlugins &&
            this.treeConstructorPluggable.use(treeConstructorPlugins)

        updatedContentsModifierPlugins &&
            this.contentsModifierPluggable.use(updatedContentsModifierPlugins)

        return this
    }

    private get $parser(): FileTreeParser {
        return this.option.fileTreeParser
    }
    private get $io(): IOManager {
        return this.option.ioManager
    }

    private constructor(private readonly option: FileBuilderConstructor) {
        this.$reporter = new BuildReporter({
            ioManager: option.ioManager,
            buildPath: option.buildPath,
        })
        this.$buildLogger = new BuildResultLogger({
            ioManager: option.ioManager,
            buildPath: option.buildPath,
            parser: option.fileTreeParser,
            logger: option.logger,
        })
    }

    public static async create(
        option: FileBuilderConstructor
    ): Promise<FileBuilder> {
        const zenBuild = await option.ioManager.writer.createFolder(
            option.buildPath
        )
        if (zenBuild.success)
            option.logger.info(`GENERATE file tree at\n${option.buildPath}\n`)

        if (!zenBuild.success)
            option.logger.info('BUILD folder already exists, skipping...')

        const builder = new FileBuilder(option)
        builder.use(CorePlugins)
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

    private checkCache(buildID: UUID): boolean {
        return this.$reporter.reportUUID.has(buildID)
    }

    private async buildFileTreeStructure(ast: FTreeNode): Promise<void> {
        if (!ast.children) return

        for (const plugin of this.treeConstructorPluggable.plugin) {
            const walkerPlugin = await plugin({
                ast,
                uuidEncoder: this.encodeHashUUID,
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
            const removedReport: Array<BuildReport> =
                previousBuildReport.filter(
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
        const ast = await this.getAST()
        if (!ast) return

        // Phase1: Tree build phase
        await this.buildFileTreeStructure(ast)

        // Phase2: File generation phase + caching logics
        await this.buildFileTree(ast)

        // Phase3: Contents modifier plugins
        await this.buildContents(ast)

        // Phase4: Report build result
        await this.$buildLogger.writeLog(this.$reporter.totalReport)
    }
}
