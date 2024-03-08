import type { FTreeNode, FolderNode } from '../parser/node'
import type { FileBuilderConstructor } from './builder'
import type { BuildReport } from './reporter'

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

    private setupContentAST(): void {
        this.$parser.updateRootFolder(this.option.buildPath.content)
    }
    private setupAssetsAST(): void {
        this.$parser.updateRootFolder(this.option.buildPath.assets)
    }
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

    public async writeLog(buildReport: Array<BuildReport>): Promise<void> {
        this.setupContentAST()
        const contentBuildAST = await this.getAST()
        if (contentBuildAST === undefined) {
            this.$m.log('Failed to write build report')
            return
        }

        const buildName = contentBuildAST.fileName

        this.$m.box(`Build Report: ${new Date().toLocaleString()}`, {
            prefix: false,
            borderStyle: 'round',
            padding: 0.75,
        })
        this.$m.log(
            this.$m.c.green(
                ` ● ${buildName} » ${this.option.buildPath.content}`
            ),
            {
                prefix: false,
            }
        )
        await this.walkASTForLog(contentBuildAST, buildReport)

        this.setupAssetsAST()
        const assetBuildAST = await this.getAST()
        if (assetBuildAST === undefined) {
            this.$m.log('Failed to write asset build report')
            return
        }

        this.$m.log(
            this.$m.c.green(
                ` ● ${buildName} » ${this.option.buildPath.assets}`
            ),
            {
                prefix: false,
            }
        )
        await this.walkASTForLog(assetBuildAST, buildReport)
    }

    private async walkASTForLog(
        ast: FolderNode,
        buildReport: Array<BuildReport>
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
