import type { BuildInformation, BuildStoreList } from './build_store'
import type { FileTreeParser } from '../../parser'
import type { FileTreeNode, FolderNode } from '../../parser/node'
import type { Logger } from '@obsidian_blogger/helpers/logger'

interface BuildResultLoggerConstructor {
    readonly parser: FileTreeParser
    readonly logger: Logger
    readonly buildPath: {
        contents: string
        assets: string
    }
}

/**
 * Represents a logger for build results using an efficient, single-pass algorithm.
 */
export class BuildResultLogger {
    private get $logger() {
        return this.option.logger
    }

    private get $parser() {
        return this.option.parser
    }

    public constructor(public readonly option: BuildResultLoggerConstructor) {}

    /**
     * The main public method to write the entire build log.
     * It orchestrates the logging in a single pass over the file tree.
     */
    public async writeBuilderLog({
        ast,
        buildReport,
    }: {
        ast: FolderNode
        buildReport: BuildStoreList
    }): Promise<void> {
        this.writeBuildReportHeader()

        // 1. Convert the report array to a Map for O(1) average time lookups.
        const reportMap = new Map(
            buildReport.map((report) => [report.build_path.build, report])
        )

        // 2. Log removed files first, and remove them from the map.
        this.logRemovedFiles(reportMap)

        // 3. Walk the tree ONCE to log content files.
        // This method will also remove the logged files from the reportMap.
        await this.logContentTree(ast, reportMap)

        // 4. Any reports left in the map must be assets. Log them.
        this.logAssets(reportMap)
    }

    private writeBuildReportHeader(): void {
        const localDate = new Date().toLocaleString()
        this.$logger.box(
            `${this.$logger.c.green('Build Report')} - ${localDate}`,
            {
                borderStyle: 'round',
                padding: 0.75,
                borderColor: 'green',
            }
        )
    }

    private logRemovedFiles(reportMap: Map<string, BuildInformation>): void {
        const removedLogs: string[] = []
        for (const report of reportMap.values()) {
            if (report.build_state === 'REMOVED') {
                removedLogs.push(
                    `${this.$logger.c.bgRed
                        .ansi256(0)
                        .underline(' - removed ')} » ${this.$logger.c.red(
                        report.build_path.origin
                    )}`
                )
                // Once logged, remove from the map so it's not processed again.
                reportMap.delete(report.build_path.build)
            }
        }

        if (removedLogs.length > 0) {
            this.$logger.log(removedLogs.join('\n'), { prefix: 'none' })
        }
    }

    /**
     * Walks the AST, logs content files, and removes them from the report map.
     */
    private async logContentTree(
        ast: FolderNode,
        reportMap: Map<string, BuildInformation>
    ): Promise<void> {
        this.$logger.log(
            this.$logger.c.green(
                ` ● [ ${this.$logger.c.bold(
                    ast.fileName
                )} ] » ${this.$logger.c.underline(
                    this.$parser.options.rootFolder
                )}`
            ),
            { prefix: 'none' }
        )

        const buildLog: string[] = []

        await this.$parser.walk(
            async (node, { siblings, siblingsIndex }) => {
                const report = reportMap.get(node.absolutePath)
                const isLastElement =
                    (siblings?.length ?? 0) - 1 === siblingsIndex

                const treeLog = this.getTreeLogMessage(node, isLastElement)
                const stateLog = this.getBuildState(report?.build_state)
                buildLog.push(`${treeLog}${stateLog}`)

                // Critical step: remove the processed content file from the map.
                if (report) {
                    reportMap.delete(node.absolutePath)
                }
            },
            { type: 'DFS' }
        )

        this.$logger.log(buildLog.join('\n'), { prefix: 'none' })
    }

    /**
     * Logs the remaining reports in the map, which are guaranteed to be assets.
     */
    private logAssets(assetMap: Map<string, BuildInformation>): void {
        if (assetMap.size === 0) return

        this.$logger.log(
            this.$logger.c.green(` ● [ ${this.$logger.c.bold('assets')} ]`),
            { prefix: 'none' }
        )

        const buildLog: string[] = []
        const assetReports = Array.from(assetMap.values())

        assetReports.forEach((report, index) => {
            const isLastElement = index === assetReports.length - 1
            const fileName =
                report.build_path.build.split(/[/\\]/).pop() ??
                report.build_path.build

            const fileLeaf = isLastElement ? ` └─${'─'}` : ` ├─${'─'}`
            const fileLog = `${fileLeaf} ${this.$logger.c.white(fileName)}`
            const stateLog = this.getBuildState(report.build_state)
            buildLog.push(`${fileLog}${stateLog}`)
        })

        this.$logger.log(buildLog.join('\n'), { prefix: 'none' })
    }

    private getBuildState(state?: BuildInformation['build_state']): string {
        if (!state) return ''
        const lowerCaseState = this.$logger.c
            .ansi256(0)
            .underline(` ${state.toLowerCase()} `)
        let buildState = ''
        switch (state) {
            case 'ADDED': {
                buildState = `${this.$logger.c.bgGreen(lowerCaseState)}`
                break
            }
            case 'CACHED': {
                buildState = `${this.$logger.c.bgYellowBright(lowerCaseState)}`
                break
            }
            case 'UPDATED': {
                buildState = `${this.$logger.c.bgBlueBright(lowerCaseState)}`
                break
            }
            case 'REMOVED': {
                buildState = this.$logger.c.bgRed(lowerCaseState)
                break
            }
            case 'MOVED': {
                buildState = `${this.$logger.c.bgMagenta(lowerCaseState)}`
                break
            }
        }
        return ` › ${buildState}`
    }

    private getTreeLogMessage(
        node: FileTreeNode,
        isLastElement: boolean = false
    ): string {
        const { category, fileName, nodeDepth } = node
        const logDepth = nodeDepth > 0 ? nodeDepth : 0

        const LEAF = ' │' as const

        switch (category) {
            case 'FOLDER': {
                const folderLeaf = isLastElement ? ` └─›` : ` ├─›`
                const folderLog = `${LEAF.repeat(
                    logDepth
                )}${folderLeaf} ${this.$logger.c.dim(`${fileName}`)}`
                return folderLog
            }
            default: {
                const fileLeaf = isLastElement ? ` └─${'─'}` : ` ├─${'─'}`
                const fileLog = `${LEAF.repeat(
                    logDepth
                )}${fileLeaf} ${this.$logger.c.white(fileName)}`
                return fileLog
            }
        }
    }
}
