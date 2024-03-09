import type { FTreeNode, FolderNode } from '../parser/node'
import type { FileBuilderConstructor } from './builder'
import type { BuildReport, BuildReportSet } from './reporter'

interface BuildResultLoggerConstructor extends FileBuilderConstructor {}
export class BuildResultLogger {
    private get $parser() {
        return this.option.fileTreeParser
    }
    private get $io() {
        return this.option.ioManager
    }
    private get $m() {
        return this.option.logger
    }

    public constructor(public readonly option: BuildResultLoggerConstructor) {}

    private async getAST(): Promise<FolderNode | undefined> {
        if (this.$parser.ast?.children.length !== 0) return this.$parser.ast

        const ast = await this.$parser.parse()
        if (!ast) return undefined
        return ast
    }

    private getTreeLogMessage(
        node: FTreeNode,
        isLastElement: boolean = false
    ): string {
        const { category, fileName, nodeDepth } = node
        const logDepth = nodeDepth - 1 > 0 ? nodeDepth - 1 : 0

        const LEAF = ' │' as const

        switch (category) {
            case 'FOLDER': {
                const folderLeaf = isLastElement ? ` └─›` : ` ├─›`
                const folderLog = `${LEAF.repeat(logDepth)}${folderLeaf} ${this.$m.c.dim(`${fileName}`)}`
                return folderLog
            }
            default: {
                const fileLeaf = isLastElement ? ` └─${'─'}` : ` ├─${'─'}`
                const fileLog = `${LEAF.repeat(logDepth)}${fileLeaf} ${this.$m.c.white(fileName)}`
                return fileLog
            }
        }
    }

    private writeBuildReportHeader(): void {
        const localDate = new Date().toLocaleString()
        this.$m.box(`${this.$m.c.green('Build Report')} - ${localDate}`, {
            prefix: false,
            borderStyle: 'round',
            padding: 0.75,
        })
    }

    private async writeASTLog(
        targetRootDirPath: string,
        buildReportSet: BuildReportSet
    ): Promise<void> {
        this.$parser.updateRootFolder(targetRootDirPath)

        const ast = await this.getAST()
        if (ast === undefined) {
            this.$m.log(`Failed to write AST log for ${targetRootDirPath}`)
            return
        }

        this.$m.log(
            this.$m.c.green(` ● ${ast.fileName} » ${targetRootDirPath}`),
            {
                prefix: false,
            }
        )
        await this.walkASTForBuildLog(ast, buildReportSet)
    }

    public async writeBuilderLog(buildReport: BuildReportSet): Promise<void> {
        this.writeBuildReportHeader()
        await this.writeASTLog(this.option.buildPath.content, buildReport)
        await this.writeASTLog(this.option.buildPath.assets, buildReport)
    }

    private async walkASTForBuildLog(
        ast: FolderNode,
        buildReport: BuildReportSet
    ): Promise<void> {
        const buildLog: Array<string> = []
        await this.$parser.walkAST(
            ast.children,
            async (node, i, tot) => {
                const buildState = buildReport.find(
                    (report) => report.path.build === node.absolutePath
                )?.state

                const getBuildState = (
                    state?: BuildReport['state']
                ): string => {
                    if (!state) return ''
                    const lowerCaseState = this.$m.c
                        .ansi256(0)
                        .underline(` ${state.toLowerCase()} `)
                    let buildState = ''
                    switch (state) {
                        case 'ADDED': {
                            buildState = this.$m.c.bgGreen(lowerCaseState)
                            break
                        }
                        case 'CACHED': {
                            buildState =
                                this.$m.c.bgYellowBright(lowerCaseState)
                            break
                        }
                        case 'UPDATED': {
                            buildState = this.$m.c.bgBlueBright(lowerCaseState)
                            break
                        }
                    }
                    return ` › ${buildState}`
                }

                const isLastElement: boolean = i === tot.length - 1

                const treeLog: string = this.getTreeLogMessage(
                    node,
                    isLastElement
                )
                const stateLog: string = getBuildState(buildState)
                const log = `${treeLog}${stateLog}`

                buildLog.push(log)
            },
            true
        )

        this.$m.log(buildLog.join('\n'), {
            prefix: false,
        })
    }
}
