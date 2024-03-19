import type {
    MetaEngine,
    MetaEngineConstructor,
    PolymorphicMeta,
} from '../../meta/engine'
import type { FTreeNode } from '../../parser/node'
import type { FileTreeParser } from '../../parser/parser'
import type { BuildInformation, BuildStoreList } from '../core/store'
import type { BuildSystemConstructor } from '../core/system'

type Walker = Parameters<FileTreeParser['walkAST']>[1]

type MetaEngineCreator = <MetaShape extends PolymorphicMeta>(
    engine: Omit<MetaEngineConstructor<MetaShape>, 'ioManager'>
) => MetaEngine<MetaShape>

export interface PluginCommonConstructor
    extends Omit<BuildSystemConstructor, 'parser' | 'corePluginConfig'> {
    meta: MetaEngineCreator
}

interface PluginCommonConfig {
    name: string
    disableCache?: boolean
}

interface FileTreePluginConstructor extends PluginCommonConstructor {}
interface FileTreePluginReturn extends PluginCommonConfig {
    walker: Walker
    cacheChecker?: (
        state: BuildInformation['build_state'],
        nodeInfo: {
            node: FTreeNode
            i: number
            total: Array<FTreeNode>
        }
    ) => boolean
    exclude?: Array<string> | string | RegExp
    skipFolderNode?: boolean
}
export type FileTreePluginConfig = Omit<FileTreePluginReturn, 'walker'>
type TreeWalkingPlugin = (
    args: FileTreePluginConstructor
) => Promise<FileTreePluginReturn>

interface ContentsModifierPluginConstructor extends PluginCommonConstructor {}
interface ContentsModifierPluginReturn extends PluginCommonConfig {
    modifier: (buildStore: BuildStoreList) => Promise<
        Array<{
            content: string
            writePath: string
        }>
    >
    cacheChecker?: (
        state: BuildInformation['build_state'],
        buildInfo: {
            report: BuildInformation
            i: number
            total: Array<BuildInformation>
        }
    ) => boolean
}
export type ContentsModifierPluginConfig = Omit<
    ContentsModifierPluginReturn,
    'modifier'
>
type ContentsModifierPlugin = (
    args: ContentsModifierPluginConstructor
) => Promise<ContentsModifierPluginReturn>

export type BuilderPlugin = {
    /**
     * @description `Phase1`: Build the origin tree
     * @description This phase is responsible for building the origin tree
     */
    'build:origin:tree': TreeWalkingPlugin
    /**
     * @description `Phase2`: Walk the generated tree
     * @description This phase is responsible for walking the generated tree
     */
    'walk:generated:tree': TreeWalkingPlugin
    /**
     * @description `Phase3`: Build the contents
     * @description This phase is responsible for building and modifying the contents
     */
    'build:contents': ContentsModifierPlugin
}
