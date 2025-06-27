import type { BuildCacheManager, BuildStore, BuildStoreList } from '../core'
import type { BuildContentsPlugin } from './build.contents.plugin'
import type { BuildTreePlugin } from './build.tree.plugin'
import type { WalkTreePlugin } from './walk.tree.plugin'
import type { FileTreeNode } from '../../parser'

export abstract class PluginCachePipelines {
    /**
     * Check if tree walk function should be cached or not
     *
     * @param cacheManager Build cache manager
     * @param config Plugin dynamic config
     * @param node Current node
     * @param context Node context
     * @param pluginCacheChecker Plugin custom cache checker
     */
    public abstract treeCachePipeline(args: {
        node: FileTreeNode
        context:
            | Parameters<WalkTreePlugin['walk']>[1]
            | Parameters<BuildTreePlugin['walk']>[1]
        cacheManager: BuildCacheManager
        config:
            | WalkTreePlugin['dynamicConfig']
            | BuildTreePlugin['dynamicConfig']
        pluginCacheChecker?:
            | WalkTreePlugin['cacheChecker']
            | BuildTreePlugin['cacheChecker']
    }): boolean

    /**
     * Check if contents build function should be cached or not
     *
     * @param store Build store
     * @param config Plugin dynamic config
     * @param pluginCacheChecker Plugin custom cache checker
     */
    public abstract buildContentsCachePipeline(args: {
        store: BuildStore
        config: BuildContentsPlugin['dynamicConfig']
        pluginCacheChecker?: BuildContentsPlugin['cacheChecker']
    }): BuildStoreList
}
