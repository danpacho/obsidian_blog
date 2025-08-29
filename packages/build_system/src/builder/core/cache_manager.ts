import type { BuildInformation, BuildStore } from './build_store'
import type { ContentId, NodeId } from './info_generator'
import type { FileTreeNode } from '../../parser/node'
import type { Stateful } from '@obsidian_blogger/helpers'

export interface BuildCacheManagerConstructor {
    store: BuildStore
}

/**
 * Represents a manager for the build cache using a two-phase determination logic.
 */
export class BuildCacheManager {
    private tentativeAdded = new Map<NodeId, BuildInformation>()
    private unaccountedPrevFiles = new Map<NodeId, BuildInformation>()

    public constructor(
        private readonly options: BuildCacheManagerConstructor
    ) {}

    public get $store() {
        return this.options.store
    }

    /**
     * Setup store
     */
    public async setup(): Promise<void> {
        const loaded = await this.$store.loadReport()
        if (!loaded.success) {
            this.$store.resetStore()
        }
        // Create a mutable copy of previous files to track unaccounted ones.
        this.unaccountedPrevFiles = new Map(this.$store.store.prev)
        this.tentativeAdded.clear()
    }

    /**
     * Save store
     */
    public async save(): Promise<boolean> {
        const saved = await this.$store.saveReport()
        return saved.success
    }

    /**
     * Processes a single node and performs initial status marking.
     * @param node - The file tree node to process.
     * @returns BuildInformation
     */
    public processNode(node: FileTreeNode): BuildInformation {
        const { buildInfo } = node
        if (!buildInfo) {
            throw new Error(
                `[BuildCacheManager] buildInfo is not defined for ${node.fileName}`,
                {
                    cause: node,
                }
            )
        }

        const { id: nodeId, build_path } = buildInfo

        // 1. Check for CACHED status
        if (this.unaccountedPrevFiles.has(nodeId)) {
            const prevInfo = this.unaccountedPrevFiles.get(nodeId)!
            const updatedInfo: BuildInformation = {
                ...prevInfo,
                ...buildInfo,
                build_state: 'CACHED',
                updated_at: new Date().toISOString(),
            }
            this.$store.update(nodeId, updatedInfo)
            this.unaccountedPrevFiles.delete(nodeId) // Accounted for.
            return updatedInfo
        }

        // 2. Check for UPDATED status
        const prevInfoAtOrigin = this.$store.findByOriginPath(
            build_path.origin,
            { target: 'prev' }
        )
        if (prevInfoAtOrigin.success) {
            const oldInfo = prevInfoAtOrigin.data
            const updatedInfo: BuildInformation = {
                ...oldInfo,
                ...buildInfo,
                build_state: 'UPDATED',
                updated_at: new Date().toISOString(),
            }
            this.$store.update(nodeId, updatedInfo)
            this.unaccountedPrevFiles.delete(oldInfo.id) // Accounted for.
            return updatedInfo
        }

        // 3. Mark as TENTATIVE_ADDED
        const createdAt = new Date().toISOString()
        const newInfo: BuildInformation = {
            ...buildInfo,
            build_state: 'ADDED', // Tentative state
            created_at: createdAt,
            updated_at: createdAt,
            file_name: node.fileName,
            file_type: node.category,
        }
        this.tentativeAdded.set(nodeId, newInfo)
        return newInfo
    }

    /**
     * Reconciles all changes to determine the final state
     *
     * Should be called after all nodes have been processed by `processNode`.
     */
    public finalize(): void {
        // Build ContentId maps for efficient lookup
        const unaccountedPrevContentMap = this.buildContentIdMap(
            Array.from(this.unaccountedPrevFiles.values())
        )
        const tentativeAddedContentMap = this.buildContentIdMap(
            Array.from(this.tentativeAdded.values())
        )

        // 1. Determine MOVED files
        for (const [contentId, newInfos] of tentativeAddedContentMap) {
            if (unaccountedPrevContentMap.has(contentId)) {
                const oldInfos = unaccountedPrevContentMap.get(contentId)!

                const matchCount = Math.min(newInfos.length, oldInfos.length)
                for (let i = 0; i < matchCount; i++) {
                    const newInfo = newInfos.pop()!
                    const oldInfo = oldInfos.pop()!

                    const movedInfo: BuildInformation = {
                        ...oldInfo,
                        ...newInfo,
                        build_state: 'MOVED',
                        updated_at: new Date().toISOString(),
                    }
                    this.tentativeAdded.set(newInfo.id, movedInfo)
                    this.unaccountedPrevFiles.delete(oldInfo.id)
                }
            }
        }

        // 2. Finalize ADDED and MOVED in the store
        for (const finalInfo of this.tentativeAdded.values()) {
            this.$store.update(finalInfo.id, finalInfo)
        }

        // 3. Determine and finalize REMOVED files
        for (const removedInfo of this.unaccountedPrevFiles.values()) {
            this.$store.update(removedInfo.id, {
                ...removedInfo,
                build_state: 'REMOVED',
                updated_at: new Date().toISOString(),
            })
        }

        // Clean up for next run if needed
        this.tentativeAdded.clear()
        this.unaccountedPrevFiles.clear()
    }

    private buildContentIdMap(
        infos: BuildInformation[]
    ): Map<ContentId, BuildInformation[]> {
        const map = new Map<ContentId, BuildInformation[]>()
        for (const info of infos) {
            if (!info.content_id) continue
            const list = map.get(info.content_id) ?? []
            list.push(info)
            map.set(info.content_id, list)
        }
        return map
    }

    /**
     * Check the build state of a node using ID
     * @param buildId - Target node ID
     * @returns build status
     */
    public checkStatus(
        buildId: NodeId
    ): Stateful<BuildInformation['build_state']> {
        const res = this.$store.findById(buildId, {
            target: 'current',
        })
        if (!res.success) {
            return {
                success: false,
                error: res.error,
            }
        }
        return {
            success: true,
            data: res.data.build_state,
        }
    }

    /**
     * Checks the build state of a build with the specified path.
     * @param path - The path of the build to check.
     * @returns build status
     */
    public checkStatusByPath(
        path: string
    ): Stateful<BuildInformation['build_state']> {
        const res = this.$store.findByBuildPath(path, {
            target: 'current',
        })
        if (!res.success) {
            return {
                success: false,
                error: res.error,
            }
        }
        return {
            success: true,
            data: res.data.build_state,
        }
    }
}
