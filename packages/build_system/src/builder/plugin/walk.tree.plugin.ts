import {
    BuildPlugin,
    type BuildPluginDependencies,
    type BuildPluginDynamicConfig,
    type BuildPluginExecutionResponse,
    type BuildPluginResponse,
    type BuildPluginStaticConfig,
} from './build.plugin'

import type { FileTreeNode, WalkOption } from '../../parser'
import type { BuildInformation } from '../core'
import type { PluginCachePipelines } from './cache.interface'
import type { PluginDynamicConfigSchema } from '@obsidian_blogger/plugin_api'
/**
 * Configuration options for the WalkTreePlugin.
 */
export interface WalkTreePluginStaticConfig extends BuildPluginStaticConfig {}
export type WalkTreePluginDynamicConfig = BuildPluginDynamicConfig & {
    /**
     * Specifies files or folders to exclude from the tree walk.
     */
    exclude?: Array<string> | string | RegExp
    /**
     * Determines whether to skip folder nodes during the tree walk.
     * - If set to `true`, folder nodes will be skipped.
     * - If set to `false` or not provided, folder nodes will be included in the tree walk.
     */
    skipFolderNode?: boolean
    /**
     * The type of tree walk to perform.
     * - `DFS`: Depth-first search
     * - `BFS`: Breadth-first search
     */
    walkType?: 'DFS' | 'BFS'
}

export interface WalkTreePluginDependencies extends BuildPluginDependencies {
    cachePipeline: PluginCachePipelines['treeCachePipeline']
    walkRoot?: FileTreeNode
}
/**
 * Abstract class representing a plugin for walking a tree during the build process.
 */
export abstract class WalkTreePlugin<
    Static extends WalkTreePluginStaticConfig = WalkTreePluginStaticConfig,
    Dynamic extends WalkTreePluginDynamicConfig = WalkTreePluginDynamicConfig,
> extends BuildPlugin<Static, Dynamic, WalkTreePluginDependencies> {
    public override baseDynamicConfigSchema(): PluginDynamicConfigSchema {
        return {
            disableCache: {
                type: 'boolean',
                description: 'Whether to disable caching for the plugin',
                defaultValue: false,
                optional: true,
            },
            exclude: {
                type: 'Array',
                description: 'Files or folders to exclude from the tree walk',
                optional: true,
            },
            skipFolderNode: {
                type: 'boolean',
                description:
                    'Whether to skip folder nodes during the tree walk',
                defaultValue: true,
                optional: true,
            },
            walkType: {
                type: ['Literal<BFS>', 'Literal<DFS>'],
                description: 'The type of tree walk to perform',
                defaultValue: 'DFS',
                optional: true,
            },
        }
    }
    /**
     * Walking a original file tree for modifying the files
     */
    public abstract walk(
        /**
         * Current node
         */
        node: FileTreeNode,
        /**
         * Current node walk context
         */
        context: {
            /**
             * Children of the current node
             */
            children: Array<FileTreeNode> | undefined
            /**
             * Siblings of the current node
             */
            siblings: Array<FileTreeNode> | undefined
            /**
             * Current node index in the siblings list
             */
            siblingsIndex: number | undefined
        }
    ): Promise<void>

    /**
     * Optional cache checker function for determining if the build state and node information
     * should be cached.
     *
     * @returns A boolean indicating whether the build state and node information should be cached.
     */
    public override cacheChecker?: (
        currentNode: {
            /**
             * The build state of the file.
             */
            state: BuildInformation['build_state']
            /**
             * The node of the file.
             */
            node: FileTreeNode
        },
        /**
         * The node context
         */
        nodeContext: {
            /**
             * Children of the current node
             */
            children: Array<FileTreeNode> | undefined
            /**
             * Siblings of the current node
             */
            siblings: Array<FileTreeNode> | undefined
            /**
             * Current node index in the siblings list
             */
            siblingsIndex: number | undefined
        }
    ) => boolean

    public async execute(
        _: { stop: () => void; resume: () => void },
        cachePipe: PluginCachePipelines['treeCachePipeline']
    ): Promise<BuildPluginExecutionResponse> {
        this.$jobManager.registerJob({
            name: 'walk:tree',
            prepare: async () => {
                this.$logger.updateName(this.name)
                this.walk = this.walk.bind(this)
            },
            execute: async () => {
                const parser = this.getRunTimeDependency('parser')
                const cacheManager = this.getRunTimeDependency('cacheManager')
                const walkRoot = this.getRunTimeDependency('walkRoot')

                const defaultWalkOptions: WalkOption = {
                    type: this.dynamicConfig?.walkType ?? 'DFS',
                    skipFolderNode: this.dynamicConfig?.skipFolderNode ?? true,
                    exclude: this.defaultDynamicConfig?.exclude ?? [],
                }

                const error: BuildPluginResponse['error'] = []

                await parser.walk(
                    async (node, context) => {
                        if (
                            cachePipe({
                                node,
                                context,
                                cacheManager,
                                config: this.dynamicConfig,
                                pluginCacheChecker: this.cacheChecker,
                            })
                        ) {
                            return
                        }
                        // Execute plugin
                        try {
                            await this.walk(node, context)
                        } catch (e) {
                            error.push({
                                filepath: node.fileName,
                                error:
                                    e instanceof Error
                                        ? e
                                        : new Error('unknown error', {
                                              cause: [e, node],
                                          }),
                            })
                        }
                    },
                    walkRoot
                        ? {
                              ...defaultWalkOptions,
                              walkRoot,
                          }
                        : defaultWalkOptions
                )
                return {
                    error,
                    history: this.$logger.getHistory(),
                }
            },
        })

        await this.$jobManager.processJobs()

        return this.$jobManager.history
    }
}
