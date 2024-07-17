import type { BuildContentsPlugin } from './plugin/build.contents.plugin'
import type { BuildTreePlugin } from './plugin/build.tree.plugin'
import type { WalkTreePlugin } from './plugin/walk.tree.plugin'

export interface BuildSystemPlugin {
    /**
     * `Phase1`: Build the file tree
     */
    'build:tree': BuildTreePlugin
    /**
     * `Phase2`: Walk the generated tree
     */
    'walk:tree': WalkTreePlugin
    /**
     * `Phase3`: Build the contents
     */
    'build:contents': BuildContentsPlugin
}

type Adapter<T> = {
    [PluginKey in keyof T]?: Array<T[PluginKey]> | T[PluginKey]
}

export type BuildSystemAdapter = Adapter<BuildSystemPlugin>
