import {
    IO as IOManager,
    type Promisify,
    type Stateful,
} from '@obsidian_blogger/helpers'
import type { NodeType } from '../../parser/node'
import { NodeId } from './info.generator'

export type BuildInformation = {
    id: NodeId
    created_at: string
    file_name: string
    file_type: NodeType
    build_state: 'CACHED' | 'ADDED' | 'UPDATED' | 'REMOVED'
    build_path: {
        origin: string
        build: string
    }
}
export type BuildStoreList = Array<BuildInformation>
export type BuildStoreMap = Map<NodeId, BuildInformation>

export interface BuildStoreConstructor {
    readonly buildPath: {
        assets: string
        contents: string
    }
    readonly io: IOManager
}
export class BuildStore {
    public constructor(public readonly option: BuildStoreConstructor) {}

    public readonly store: {
        prev: BuildStoreMap
        current: BuildStoreMap
    } = {
        prev: new Map(),
        current: new Map(),
    }

    public getStoreList(target: 'current' | 'prev'): BuildStoreList {
        const targetStore =
            target === 'current' ? this.store.current : this.store.prev
        return Array.from(targetStore.values())
    }

    public get savePath(): string {
        const STORE_NAME = 'build_store.json' as const
        return `${this.option.buildPath.assets}/${STORE_NAME}`
    }

    public getRemoveTarget(): BuildStoreList {
        return this.getStoreList('current').filter(
            (report) => report.build_state === 'REMOVED'
        )
    }

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

    public get storeId(): Set<NodeId> {
        return new Set(this.store.current.keys())
    }

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

    public findByBuildPath(
        buildPath: string,
        {
            target,
        }: {
            target: 'current' | 'prev'
        }
    ): Stateful<BuildInformation, Error> {
        const buildInformation = this.getStoreList(target).find(
            (report) => report.build_path.build === buildPath
        )
        if (!buildInformation) {
            return {
                success: false,
                error: new Error(`build path ${buildPath} does not exist`),
            }
        }
        return {
            success: true,
            data: buildInformation,
        }
    }
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

    public resetStore(): void {
        this.store.prev.clear()
        this.store.current.clear()
    }

    public async loadReport(): Promisify<BuildStoreMap> {
        const prevReportLoadState = await this.option.io.reader.readFile(
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

    public async saveReport(): Promisify<BuildStoreMap> {
        const reportSaveState = await this.option.io.writer.write({
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
