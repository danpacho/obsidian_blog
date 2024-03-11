import type { UUID } from 'crypto'
import {
    MetaEngine,
    MetaEngineConstructor,
    PolymorphicMeta,
} from '../../meta/engine'
import type { FTreeNode } from '../../parser/node'
import type { FileTreeParser } from '../../parser/parser'
import type { FileBuilderConstructor } from '../builder'
import { BuildReportSet } from '../reporter'

type Walker = Parameters<FileTreeParser['walkAST']>[1]
type UUIDEncoder = (inputString: string) => UUID

type MetaEngineCreator = <MetaShape extends PolymorphicMeta>(
    engine: Omit<MetaEngineConstructor<MetaShape>, 'ioManager'>
) => MetaEngine<MetaShape>
interface PluginCommonConstructor extends FileBuilderConstructor {
    ast: FTreeNode
    uuidEncoder: UUIDEncoder
    metaEngine: MetaEngineCreator
}

interface FileTreePluginConstructor extends PluginCommonConstructor {}
type FileTreePlugin = (args: FileTreePluginConstructor) => Promise<Walker>
interface ContentsModifierPluginConstructor extends PluginCommonConstructor {
    buildReport: {
        total: BuildReportSet
        cached: BuildReportSet
        updated: BuildReportSet
        added: BuildReportSet
    }
}
type ContentsModifierPlugin = (
    args: ContentsModifierPluginConstructor
) => Promise<
    Array<{
        modifiedContent: string
        writePath: string
    }>
>

export type BuilderPlugin = {
    'build:origin:tree': FileTreePlugin
    'walk:generated:tree': FileTreePlugin
    'build:contents': ContentsModifierPlugin
}
