import type { Logger } from '@blogger/logger'
import type { IOManager } from '../io_manager'
import type { FTreeNode, FolderNode } from '../parser/node'
import type { FileTreeParser } from '../parser/parser'
import type { BuildReport } from './reporter'

interface BuildResultLoggerConstructor {
    readonly ioManager: IOManager
    readonly buildPath: string
    readonly parser: FileTreeParser
    readonly logger: Logger
}
export class BuildResultLogger {
    private get $parser() {
        return this.option.parser
    }
    private get $io() {
        return this.option.ioManager
    }
    private get $m() {
        return this.option.logger
    }

    public constructor(public readonly option: BuildResultLoggerConstructor) {}

    private async getAST(): Promise<FolderNode | undefined> {
        this.option.parser.updateRootFolder(this.option.buildPath)

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

    public async writeLog(buildReport: Array<BuildReport>): Promise<void> {
        const buildAST = await this.getAST()
        if (buildAST === undefined) {
            this.$m.log('Failed to write build report')
            return
        }

        const buildName = buildAST.fileName

        this.$m.box(`Build Report: ${new Date().toLocaleString()}`, {
            prefix: false,
            borderStyle: 'round',
            padding: 0.75,
        })
        this.$m.log(
            this.$m.c.green(` ● ${buildName} » ${this.option.buildPath}`),
            {
                prefix: false,
            }
        )

        const buildLog: Array<string> = []
        await this.$parser.walkAST(
            buildAST.children,
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
