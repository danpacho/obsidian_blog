import {
    BuildPlugin,
    type BuildPluginDependencies,
    type BuildPluginDynamicConfig,
    type BuildPluginResponse,
    type BuildPluginStaticConfig,
} from './build.plugin'

import type { BuildInformation, BuildStoreList } from '../core'
import type { PluginCachePipelines } from './cache.interface'
import type { MarkdownProcessor } from '../../md/processor'
import type { PluginDynamicConfigSchema } from '@obsidian_blogger/plugin_api'

export interface BuildContentsPluginStaticConfig
    extends BuildPluginStaticConfig {}
export type BuildContentsDynamicConfig = BuildPluginDynamicConfig
export interface BuildContentsPluginDependencies
    extends BuildPluginDependencies {
    processor: MarkdownProcessor
    buildStoreList: BuildStoreList
    cachePipeline: PluginCachePipelines['buildContentsCachePipeline']
}

export type BuildContentsUpdateInformation = Array<{
    newContent: string
    writePath: string
}>

export abstract class BuildContentsPlugin<
    Static extends
        BuildContentsPluginStaticConfig = BuildContentsPluginStaticConfig,
    Dynamic extends BuildContentsDynamicConfig = BuildContentsDynamicConfig,
> extends BuildPlugin<
    Static,
    Dynamic,
    BuildContentsPluginDependencies,
    {
        contentsUpdateInfo: BuildContentsUpdateInformation
    }
> {
    public override baseDynamicConfigSchema(): PluginDynamicConfigSchema {
        return {
            disableCache: {
                type: 'boolean',
                description: 'Whether to disable caching for the plugin',
                defaultValue: false,
                optional: true,
            },
        }
    }

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
    }): Promise<BuildContentsUpdateInformation>

    public async execute(
        _: { stop: () => void; resume: () => void },
        cachePipe: PluginCachePipelines['buildContentsCachePipeline']
    ) {
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
                const error: BuildPluginResponse['error'] = []
                const updateInformation: BuildContentsUpdateInformation = []
                try {
                    updateInformation.push(
                        ...(await this.buildContents({
                            buildStore: cachedStore,
                        }))
                    )
                } catch (e) {
                    error.push({
                        error:
                            e instanceof Error
                                ? e
                                : new Error('build contents error', {
                                      cause: e,
                                  }),
                    })
                } finally {
                    // eslint-disable-next-line no-unsafe-finally
                    return {
                        contentsUpdateInfo: updateInformation,
                        error,
                        history: this.$logger.getHistory(),
                    }
                }
            },
        })

        await this.$jobManager.processJobs()

        return this.$jobManager.history
    }
}
