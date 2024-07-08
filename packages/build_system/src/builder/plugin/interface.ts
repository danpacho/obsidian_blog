import type { BuildContentsPlugin } from './build.contents.plugin'
import type { BuildTreePlugin } from './build.tree.plugin'
import type { WalkTreePlugin } from './walk.tree.plugin'

export interface BuildSystemPlugin {
    /**
     * @description `Phase1`: Build the origin file tree
     */
    'build:tree': BuildTreePlugin
    /**
     * @description `Phase2`: Walk the generated tree
     */
    'walk:tree': WalkTreePlugin
    /**
     * @description `Phase3`: Build the contents
     */
    'build:contents': BuildContentsPlugin
}

type Adapter<T> = {
    [PluginKey in keyof T]?: Array<T[PluginKey]> | T[PluginKey]
}

export type BuildSystemAdapter = Adapter<BuildSystemPlugin>
