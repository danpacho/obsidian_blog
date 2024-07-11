import type { Logger } from '@obsidian_blogger/helpers/logger'
import type { FileTreeNode, FolderNode } from '../../parser/node'
import type { FileTreeParser } from '../../parser/parser'
import type { BuildInformation, BuildStoreList } from './store'

interface BuildResultLoggerConstructor {
    readonly parser: FileTreeParser
    readonly logger: Logger
    readonly buildPath: {
        contents: string
        assets: string
    }
}
/**
 * Represents a logger for build results.
 */
export class BuildResultLogger {
    /**
     * Gets the parser used by the logger.
     */
    private get $parser() {
        return this.option.parser
    }

    /**
     * Gets the logger instance used by the logger.
     */
    private get $logger() {
        return this.option.logger
    }

    /**
     * Creates a new instance of BuildResultLogger.
     * @param option - The options for the logger.
     */
    public constructor(public readonly option: BuildResultLoggerConstructor) {}

    /**
     * Retrieves the Abstract Syntax Tree (AST) for the build.
     * @returns A promise that resolves to the root folder node of the AST, or undefined if the AST is empty.
     */
    private async getAST(): Promise<FolderNode | undefined> {
        if (this.$parser.ast?.children.length !== 0) return this.$parser.ast

        const ast = await this.$parser.parse()
        if (!ast) return undefined
        return ast
    }

    /**
     * Generates the log message for a file or folder node in the tree.
     * @param node - The file or folder node.
     * @param isLastElement - Indicates if the node is the last element in its parent's children.
     * @returns The log message for the node.
     */
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
                const folderLog = `${LEAF.repeat(logDepth)}${folderLeaf} ${this.$logger.c.dim(`${fileName}`)}`
                return folderLog
            }
            default: {
                const fileLeaf = isLastElement ? ` └─${'─'}` : ` ├─${'─'}`
                const fileLog = `${LEAF.repeat(logDepth)}${fileLeaf} ${this.$logger.c.white(fileName)}`
                return fileLog
            }
        }
    }

    /**
     * Writes the header for the build report.
     */
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

    /**
     * Writes the AST log for a target root directory.
     * @param targetRootDirPath - The path of the target root directory.
     * @param buildReportSet - The build report set.
     * @param logRemoved - Indicates if removed files should be logged.
     */
    private async writeASTLog(
        targetRootDirPath: string,
        buildReportSet: BuildStoreList,
        logRemoved: boolean = false
    ): Promise<void> {
        this.$parser.updateRootFolder(targetRootDirPath)

        const ast = await this.getAST()
        if (ast === undefined) {
            this.$logger.log(`Failed to write AST log for ${targetRootDirPath}`)
            return
        }

        this.$logger.log(
            this.$logger.c.green(
                ` ● [ ${this.$logger.c.bold(ast.fileName)} ] » ${this.$logger.c.underline(targetRootDirPath)}`
            ),
            {
                prefix: 'none',
            }
        )
        await this.walkASTForBuildLog(buildReportSet, logRemoved)
    }

    /**
     * Writes the builder log for the build report.
     * @param buildReport - The build report.
     */
    public async writeBuilderLog(buildReport: BuildStoreList): Promise<void> {
        this.writeBuildReportHeader()
        await this.writeASTLog(
            this.option.buildPath.contents,
            buildReport,
            true
        )
        await this.writeASTLog(this.option.buildPath.assets, buildReport)
    }

    /**
     * Walks the AST and generates the build log.
     * @param buildReportList - The build report list.
     * @param logRemoved - Indicates if removed files should be logged.
     */
    private async walkASTForBuildLog(
        buildReportList: BuildStoreList,
        logRemoved: boolean = false
    ): Promise<void> {
        const buildLog: Array<string> = []

        if (logRemoved) {
            const removed: Array<string> = buildReportList
                .filter((report) => report.build_state === 'REMOVED')
                .map((report) => {
                    return `${this.$logger.c.bgRed.ansi256(0).underline(' - removed ')} » ${this.$logger.c.red(report.build_path.origin)}`
                })
            buildLog.push(...removed)
        }

        await this.$parser.walk(
            async (node, { siblings, siblingsIndex }) => {
                const buildState = buildReportList.find(
                    (report) => report.build_path.build === node.absolutePath
                )?.build_state

                const getBuildState = (
                    state?: BuildInformation['build_state']
                ): string => {
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
                    }
                    return ` › ${buildState}`
                }

                const isLastElement: boolean =
                    (siblings?.length ?? 0) - 1 === siblingsIndex

                const treeLog: string = this.getTreeLogMessage(
                    node,
                    isLastElement
                )
                const stateLog: string = getBuildState(buildState)
                const log = `${treeLog}${stateLog}`

                buildLog.push(log)
            },
            {
                type: 'DFS',
            }
        )

        this.$logger.log(buildLog.join('\n'), {
            prefix: 'none',
        })
    }
}
