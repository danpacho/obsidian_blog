import type { FTreeNode } from '../../parser'
import type { BuildInformation } from '../core'
import { BuildPlugin, type BuildPluginConfig } from './build.plugin'

/**
 * Configuration options for the WalkTreePlugin.
 */
export interface WalkTreePluginConfig extends BuildPluginConfig {
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
 * Abstract class representing a plugin for walking a tree during the build process.
 */
export abstract class WalkTreePlugin extends BuildPlugin<WalkTreePluginConfig> {
    /**
     * Walking a file tree
     * @param node - The current tree node.
     * @param i - The index of the current tree node.
     * @param peerNodes - The peer nodes of the current tree node.
     */
    public abstract walk(
        node: FTreeNode,
        i: number,
        peerNodes: Array<FTreeNode>
    ): Promise<void>

    /**
     * Optional cache checker function for determining if the build state and node information
     * should be cached.
     *
     * @param state - The build state.
     * @param nodeInfo - The information about the current tree node.
     * @returns A boolean indicating whether the build state and node information should be cached.
     */
    public override cacheChecker?: (
        state: BuildInformation['build_state'],
        nodeInfo: {
            node: FTreeNode
            i: number
            peerNodes: Array<FTreeNode>
        }
    ) => boolean
}
