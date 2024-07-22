import type { PluginExecutionResponse } from '@obsidian_blogger/helpers/plugin'
import { MarkdownProcessor } from '../../md/processor'
import type { BuildInformation, BuildStoreList } from '../core'
import {
    BuildPlugin,
    BuildPluginDependencies,
    type BuildPluginDynamicConfig,
    type BuildPluginStaticConfig,
} from './build.plugin'
import type { PluginCachePipelines } from './cache.interface'

export interface BuildContentsPluginStaticConfig
    extends BuildPluginStaticConfig {}
export type BuildContentsDynamicConfig = BuildPluginDynamicConfig
export interface BuildContentsPluginDependencies
    extends BuildPluginDependencies {
    processor: MarkdownProcessor
    buildStoreList: BuildStoreList
    cachePipeline: PluginCachePipelines['buildContentsCachePipeline']
}
export abstract class BuildContentsPlugin<
    Static extends
        BuildContentsPluginStaticConfig = BuildContentsPluginStaticConfig,
    Dynamic extends BuildContentsDynamicConfig = BuildContentsDynamicConfig,
> extends BuildPlugin<Static, Dynamic, BuildContentsPluginDependencies> {
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

    public async execute(
        _: { stop: () => void; resume: () => void },
        cachePipe: PluginCachePipelines['buildContentsCachePipeline']
    ): Promise<
        PluginExecutionResponse<
            [
                Array<{
                    newContent: string
                    writePath: string
                }>,
            ]
        >
    > {
        this.$jobManager.registerJob({
            name: 'build:contents',
            prepare: async () => {
                this.$logger.updateName(this.name)

                const buildStore = this.getRunTimeDependency('buildStore')

                const cachedStore = cachePipe({
                    config: this.dynamicConfig,
                    store: buildStore,
                    pluginCacheChecker: this.cacheChecker,
                })

                return cachedStore
            },
            execute: async (_, cachedStore: BuildStoreList) => {
                const newContents = await this.buildContents({
                    buildStore: cachedStore,
                })
                return newContents
            },
        })

        await this.$jobManager.processJobs()

        return this.$jobManager.history as PluginExecutionResponse<
            [
                Array<{
                    newContent: string
                    writePath: string
                }>,
            ]
        >
    }
}
