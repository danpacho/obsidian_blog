import {
    type IO,
    type Promisify,
    type Stateful,
} from '@obsidian_blogger/helpers'
import type { NodeType } from '../../parser/node'
import type { NodeId } from './info.generator'

import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'

/**
 * Represents the build information for a specific file.
 */
export interface BuildInformation {
    /**
     * The unique identifier of the node.
     */
    id: NodeId

    /**
     * The timestamp when the build information was created.
     */
    created_at: string

    /**
     * The name of the file.
     */
    file_name: string

    /**
     * The type of the node.
     */
    file_type: NodeType

    /**
     * The state of the build.
     * - `CACHED`: target file is cached
     * - `ADDED`: target file is added
     * - `UPDATED`: target file is updated
     * - `REMOVED`: target file is removed
     */
    build_state: 'CACHED' | 'ADDED' | 'UPDATED' | 'REMOVED'

    /**
     * The paths for the original and built files.
     */
    build_path: {
        /**
         * The path of the original file.
         */
        origin: string

        /**
         * The path of the built file.
         */
        build: string
    }
}
export type BuildStoreList = Array<BuildInformation>
export type BuildStoreMap = Map<NodeId, BuildInformation>

export interface BuildStoreConstructor {
    readonly io: IO
    root: string
}
/**
 * Represents a store for build information.
 */
export class BuildStore {
    /**
     * Constructs a new instance of the BuildStore class.
     * @param options The options for the build store.
     */
    public constructor(public readonly options: BuildStoreConstructor) {}

    /**
     * The store object that holds the previous and current build store maps.
     */
    public readonly store: {
        prev: BuildStoreMap
        current: BuildStoreMap
    } = {
        prev: new Map(),
        current: new Map(),
    }

    /**
     * Gets the list of build store items for the specified target.
     * @param target The target to get the store list for ('current' or 'prev').
     * @returns An array of build store items.
     */
    public getStoreList(target: 'current' | 'prev'): BuildStoreList {
        const targetStore =
            target === 'current' ? this.store.current : this.store.prev
        return Array.from(targetStore.values())
    }

    /**
     * Gets the save path for the build store.
     * @returns The save path for the build store.
     */
    public get savePath(): string {
        return this.options.root
    }

    /**
     * Gets the list of build store items that have the 'REMOVED' build state.
     * @returns An array of build store items.
     */
    public getRemoveTarget(): BuildStoreList {
        return this.getStoreList('current').filter(
            (report) => report.build_state === 'REMOVED'
        )
    }

    /**
     * Gets the JSON representation of the store, excluding items with 'REMOVED' build state.
     * @returns The JSON string representing the store.
     */
    public get storeJson(): string {
        const removeStatePurifiedStore = Array.from(
            this.store.current.entries()
        ).filter(([, value]) => value.build_state !== 'REMOVED')

        return JSON.stringify(
            Object.fromEntries(removeStatePurifiedStore),
            null,
            4
        )
    }

    /**
     * Gets the set of build IDs in the store.
     * @returns A set of build IDs.
     */
    public get storeId(): Set<NodeId> {
        return new Set(this.store.current.keys())
    }

    /**
     * Finds a build information item by its build ID.
     * @param buildId The build ID to search for.
     * @param target The target to search in ('current' or 'prev').
     * @returns The stateful result containing the build information item if found, or an error if not found.
     */
    public findById(
        buildId: NodeId,
        {
            target,
        }: {
            target: 'current' | 'prev'
        }
    ): Stateful<BuildInformation> {
        const targetStore =
            target === 'current' ? this.store.current : this.store.prev
        const buildInformation = targetStore.get(buildId)
        if (!buildInformation) {
            return {
                success: false,
                error: new Error(`build id ${buildId} does not exist`),
            }
        }
        return {
            success: true,
            data: buildInformation,
        }
    }

    /**
     * Canonicalize a path so the same file always yields the same string
     */
    private canonicalPath(p: string): string {
        const exists = existsSync(p)
        let out = exists ? realpathSync.native(p) : path.resolve(p)

        out = path.normalize(out) // fix “..”, “.”, slashes
        if (process.platform === 'win32') out = out.toLowerCase() // case-fold
        if (out.length > 1) out = out.replace(/[\\/]+$/, '') // trim trailing /

        return out
    }

    /**
     * Finds a build information item by its build path.
     * @param buildPath The build path to search for.
     * @param target The target to search in ('current' or 'prev').
     * @returns The stateful result containing the build information item if found, or an error if not found.
     */
    public findByBuildPath(
        buildPath: string,
        { target }: { target: 'current' | 'prev' }
    ): Stateful<BuildInformation, Error> {
        const wanted = this.canonicalPath(buildPath)

        const buildInformation = this.getStoreList(target).find(
            (report) => this.canonicalPath(report.build_path.build) === wanted
        )

        if (!buildInformation) {
            return {
                success: false,
                error: new Error(`build path ${buildPath} does not exist`),
            }
        }
        return { success: true, data: buildInformation }
    }

    /**
     * Finds a build information item by its origin path.
     * @param originPath The origin path to search for.
     * @param target The target to search in ('current' or 'prev').
     * @returns The stateful result containing the build information item if found, or an error if not found.
     */
    public findByOriginPath(
        originPath: string,
        {
            target,
        }: {
            target: 'current' | 'prev'
        }
    ): Stateful<BuildInformation> {
        const buildInformation = this.getStoreList(target).find(
            (report) => report.build_path.origin === originPath
        )
        if (!buildInformation) {
            return {
                success: false,
                error: new Error(`origin path ${originPath} does not exist`),
            }
        }
        return {
            success: true,
            data: buildInformation,
        }
    }

    /**
     * Resets the store by clearing the previous and current build store maps.
     */
    public resetStore(): void {
        this.store.prev.clear()
        this.store.current.clear()
    }

    /**
     * Loads the build report from the save path.
     * @returns The stateful result containing the loaded build report if successful, or an error if not successful.
     */
    public async loadReport(): Promisify<BuildStoreMap> {
        const prevReportLoadState = await this.options.io.reader.readFile(
            this.savePath
        )

        if (!prevReportLoadState.success) {
            return {
                success: false,
                error: prevReportLoadState.error,
            }
        }

        this.resetStore()

        const loadedBuildReport = new Map(
            Object.entries(JSON.parse(prevReportLoadState.data))
        ) as BuildStoreMap

        loadedBuildReport.forEach((value, key) => {
            this.store.prev.set(key, value)
        })

        return {
            success: true,
            data: this.store.prev,
        }
    }

    /**
     * Saves the build report to the save path.
     * @returns The stateful result containing the saved build report if successful, or an error if not successful.
     */
    public async saveReport(): Promisify<BuildStoreMap> {
        const reportSaveState = await this.options.io.writer.write({
            filePath: this.savePath,
            data: this.storeJson,
        })

        if (!reportSaveState.success) {
            return {
                success: false,
                error: reportSaveState.error,
            }
        }

        return {
            success: true,
            data: this.store.current,
        }
    }

    /**
     * Adds a build information item to the store.
     * @param buildId The build ID of the item to add.
     * @param buildInformation The build information item to add.
     * @returns The stateful result containing the added build information item if successful, or an error if not successful.
     */
    public add(
        buildId: NodeId,
        buildInformation: BuildInformation
    ): Stateful<BuildInformation> {
        if (this.store.current.has(buildId)) {
            return {
                success: false,
                error: new Error(`build id ${buildId} already exists`),
            }
        }
        this.store.current.set(buildId, buildInformation)
        return {
            success: true,
            data: buildInformation,
        }
    }

    /**
     * Removes a build information item from the store.
     * @param buildId The build ID of the item to remove.
     * @returns The stateful result indicating whether the item was successfully removed or an error if not successful.
     */
    public remove(buildId: NodeId): Stateful<boolean> {
        const deleted = this.store.current.delete(buildId)
        if (!deleted) {
            return {
                success: false,
                error: new Error(`build id ${buildId} does not exist`),
            }
        }
        return {
            success: true,
            data: deleted,
        }
    }

    /**
     * Updates a build information item in the store.
     * @param buildId The build ID of the item to update.
     * @param buildInformation The updated build information item.
     * @returns The stateful result containing the updated build information item if successful, or an error if not successful.
     */
    public update(
        buildId: NodeId,
        buildInformation: BuildInformation
    ): Stateful<BuildInformation> {
        this.store.current.set(buildId, buildInformation)
        return {
            success: true,
            data: buildInformation,
        }
    }
}
