import type { Stateful } from '@obsidian_blogger/helpers'
import type { FileTreeNode } from '../../parser/node'
import type { NodeId } from './info.generator'
import type { BuildInformation, BuildStore } from './store'

export interface BuildCacheManagerConstructor {
    store: BuildStore
}
/**
 * Represents a manager for the build cache.
 */
export class BuildCacheManager {
    /**
     * Creates a new instance of BuildCacheManager.
     * @param options - The options for the BuildCacheManager.
     */
    public constructor(
        private readonly options: BuildCacheManagerConstructor
    ) {}

    /**
     * Gets the store used by the BuildCacheManager.
     */
    public get $store() {
        return this.options.store
    }

    /**
     * Sets up the build cache.
     * @returns A promise that resolves when the setup is complete.
     */
    public async setup(): Promise<void> {
        const loaded = await this.$store.loadReport()
        if (!loaded.success) {
            this.$store.resetStore()
        }
    }

    /**
     * Saves the build cache.
     * @returns A promise that resolves to a boolean indicating whether the save was successful.
     */
    public async save(): Promise<boolean> {
        const saved = await this.$store.saveReport()
        return saved.success
    }

    /**
     * Checks if the cache contains a build with the specified ID.
     * @param newId - The ID of the build to check.
     * @returns A boolean indicating whether the cache contains the build.
     */
    private checkCache(newId: NodeId): boolean {
        return this.$store.store.prev.has(newId)
    }

    /**
     * Updates the store with the build information of a file.
     * @param node - The file tree node containing the build information.
     * @returns A stateful object containing the updated build information or an error.
     */
    public updateStore(node: FileTreeNode): Stateful<BuildInformation, Error> {
        const { buildInfo } = node
        if (!buildInfo)
            return {
                success: false,
                error: new Error(`Update impossible: no build information`),
            }

        const newId = buildInfo.id
        if (this.checkCache(newId)) {
            const prevInfo = this.$store.findById(newId, {
                target: 'prev',
            })
            if (!prevInfo.success) {
                return {
                    success: false,
                    error: new Error(
                        `No previous build information at ${buildInfo.build_path.origin}`
                    ),
                }
            }
            const updatedInfo: BuildInformation = {
                ...prevInfo.data,
                ...buildInfo,
                build_state: 'CACHED',
            }
            this.$store.update(newId, updatedInfo)

            return {
                success: true,
                data: updatedInfo,
            }
        }

        const originBuildInfo = this.$store.findByOriginPath(
            buildInfo.build_path.origin,
            {
                target: 'prev',
            }
        )

        const isUpdated = originBuildInfo.success === true
        const isAdded = originBuildInfo.success === false
        if (isUpdated) {
            const updatedInfo: BuildInformation = {
                ...originBuildInfo.data,
                id: newId,
                created_at: new Date().toISOString(),
                build_state: 'UPDATED',
            }
            this.$store.update(newId, updatedInfo)
            return {
                success: true,
                data: updatedInfo,
            }
        }
        if (isAdded) {
            const newInfo: BuildInformation = {
                id: newId,
                build_state: 'ADDED',
                created_at: new Date().toISOString(),
                file_name: node.fileName,
                file_type: node.category,
                build_path: {
                    build: buildInfo.build_path.build,
                    origin: buildInfo.build_path.origin,
                },
            }
            this.$store.add(newId, newInfo)
            return {
                success: true,
                data: newInfo,
            }
        }

        return {
            success: false,
            error: new Error(
                `Update impossible: no build information at ${buildInfo.build_path.origin}`
            ),
        }
    }

    /**
     * Checks the build state of a build with the specified ID.
     * @param buildId - The ID of the build to check.
     * @returns A stateful object containing the build state or an error.
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
     * @returns A stateful object containing the build state or an error.
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

    /**
     * Syncs the removed builds in the store.
     */
    public syncRemovedStore(): void {
        const prev = this.$store.getStoreList('prev')
        if (prev.length === 0) return

        const current = this.$store.getStoreList('current')
        const currentOriginPathList = current.map(
            ({ build_path }) => build_path.origin
        )

        prev.filter(
            (origin) =>
                !currentOriginPathList.includes(origin.build_path.origin)
        ).forEach((removedBuildInfo) => {
            this.$store.add(removedBuildInfo.id, {
                ...removedBuildInfo,
                build_state: 'REMOVED',
            })
        })
    }
}
