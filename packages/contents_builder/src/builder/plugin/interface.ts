import type { UUID } from 'crypto'
import type { FTreeNode } from '../../parser/node'
import type { FileTreeParser } from '../../parser/parser'
import type { FileBuilderConstructor } from '../builder'
import type { BuildReport } from '../reporter'

type Walker = Parameters<FileTreeParser['walkAST']>[1]
type UUIDEncoder = (inputString: string) => UUID
type BuildReportSet = Array<BuildReport>

interface FileTreePluginConstructor extends FileBuilderConstructor {
    ast: FTreeNode
    uuidEncoder: UUIDEncoder
}
export type FileTreePlugin = (
    args: FileTreePluginConstructor
) => Promise<Walker>

interface ContentsModifierPluginConstructor extends FileBuilderConstructor {
    ast: FTreeNode
    buildReport: {
        total: BuildReportSet
        cached: BuildReportSet
        updated: BuildReportSet
        added: BuildReportSet
    }
    uuidEncoder: UUIDEncoder
}
export type ContentsModifierPlugin = (
    args: ContentsModifierPluginConstructor
) => Promise<
    Array<{
        modifiedContent: string
        writePath: string
    }>
>
