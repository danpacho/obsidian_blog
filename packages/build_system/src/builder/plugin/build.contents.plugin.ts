import type { MarkdownProcessor } from '../../md/processor'
import type { BuildInformation, BuildStoreList } from '../core'
import {
    BuildPlugin,
    type BuildPluginConfig,
    type BuildPluginCoreDependencies,
} from './build.plugin'

export interface BuildContentsPluginConfig extends BuildPluginConfig {}
export interface BuildContentsDependencies extends BuildPluginCoreDependencies {
    processor: MarkdownProcessor
}
export abstract class BuildContentsPlugin extends BuildPlugin<
    BuildContentsPluginConfig,
    BuildContentsDependencies
> {
    /**
     * Gets `Markdown processor`
     * ```ts
     * // Remark, Rehype, and Unist utilities
     * this.$processor.remark
     *
     * this.$processor.rehype
     * // [remarkFrontmatter is included]
     *
     * this.$processor.findNode
     * this.$processor.visitTree
     * this.$processor.filterTree
     * this.$processor.fromMarkdown
     * this.$processor.toMarkdown
     * ```
     */
    protected get $processor(): MarkdownProcessor {
        return this.getRunTimeDependency('processor')
    }

    /**
     * Builds the contents of the file.
     * @param context - The context of the build, including the build store list.
     * @returns The `new content` and the `write path`.
     */
    public abstract buildContents(context: {
        buildStore: BuildStoreList
    }): Promise<
        Array<{
            newContent: string
            writePath: string
        }>
    >

    /**
     * Optional cache checker function for determining if the build state and node information
     * @param state - The build state.
     * @param buildInfo - The information about the current build.
     * @returns A boolean indicating whether the build state and node information should be cached.
     */
    public override cacheChecker?: (
        state: BuildInformation['build_state'],
        buildInfo: {
            report: BuildInformation
            i: number
            allReports: Array<BuildInformation>
        }
    ) => boolean
}
