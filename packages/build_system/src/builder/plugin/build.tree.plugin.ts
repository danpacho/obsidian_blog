import type { FileTreeNode } from '../../parser'
import type { BuildInformation } from '../core'
import { BuildPlugin, type BuildPluginConfig } from './build.plugin'

/**
 * Configuration options for the BuildTreePlugin.
 */
export interface BuildTreePluginConfig extends BuildPluginConfig {
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
}

/**
 * Abstract class representing a plugin for building a tree during the build process.
 */
export abstract class BuildTreePlugin extends BuildPlugin<BuildTreePluginConfig> {
    /**
     * Walking a original file tree for rebuilding the file tree
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
        /**
         * The build state of the file.
         */
        state: BuildInformation['build_state'],
        /**
         * The node information.
         */
        nodeInfo: {
            /**
             * The node of the file.
             */
            node: FileTreeNode
            /**
             * The children of the node.
             */
            children: Array<FileTreeNode> | undefined
        }
    ) => boolean
}
