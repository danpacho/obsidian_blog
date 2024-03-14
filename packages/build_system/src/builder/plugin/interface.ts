import type {
    MetaEngine,
    MetaEngineConstructor,
    PolymorphicMeta,
} from '../../meta/engine'
import type { FileTreeParser } from '../../parser/parser'
import type { BuildStoreList } from '../core/store'
import type { BuildSystemConstructor } from '../core/system'

type Walker = Parameters<FileTreeParser['walkAST']>[1]

type MetaEngineCreator = <MetaShape extends PolymorphicMeta>(
    engine: Omit<MetaEngineConstructor<MetaShape>, 'ioManager'>
) => MetaEngine<MetaShape>

interface PluginCommonConstructor
    extends Omit<BuildSystemConstructor, 'parser' | 'corePluginConfig'> {
    meta: MetaEngineCreator
}

interface FileTreePluginConstructor extends PluginCommonConstructor {}
type FileTreePlugin = (args: FileTreePluginConstructor) => Promise<Walker>

interface ContentsModifierPluginConstructor extends PluginCommonConstructor {
    buildStore: BuildStoreList
}
type ContentsModifierPlugin = (
    args: ContentsModifierPluginConstructor
) => Promise<
    Array<{
        content: string
        writePath: string
    }>
>

export type BuilderPlugin = {
    /**
     * @description `Phase1`: Build the origin tree
     * @description This phase is responsible for building the origin tree
     */
    'build:origin:tree': FileTreePlugin
    /**
     * @description `Phase2`: Walk the generated tree
     * @description This phase is responsible for walking the generated tree
     */
    'walk:generated:tree': FileTreePlugin
    /**
     * @description `Phase3`: Build the contents
     * @description This phase is responsible for building and modifying the contents
     */
    'build:contents': ContentsModifierPlugin
}
