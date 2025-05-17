import type { Job } from '@obsidian_blogger/helpers/job'
import { JsonStorage } from '@obsidian_blogger/helpers/storage'
import type { PluginExecutionResponse, PluginShape } from '../plugin.interface'
import type { PluginRunner } from '../plugin.runner'
import type { PluginManager } from './plugin.manager'

export interface HistoryBridgeStorageConstructor {
    bridgeRoot: string
    storePrefix: string
    managers: Array<PluginManager<PluginShape, PluginRunner>>
}
/**
 * Represents a bridge storage for storing job history.
 */
export class HistoryBridgeStorage {
    private readonly $storage: JsonStorage<Array<Job>>
    private _initialized: boolean = false

    /**
     * Gets the plugin managers.
     */
    private get $pluginManagers() {
        return this.options.managers
    }

    /**
     * Creates an instance of HistoryBridgeStorage.
     * @param options - The options for the HistoryBridgeStorage.
     */
    public constructor(
        public readonly options: HistoryBridgeStorageConstructor
    ) {
        this.$storage = new JsonStorage({
            name: 'bridge-history',
            root: `${options.bridgeRoot}/${options.storePrefix}/history.json`,
            serializer(data: Record<string, PluginExecutionResponse>): string {
                type ResolveTarget =
                    | {
                          name: string
                          message: string
                          stack: string
                      }
                    | string
                    | number
                    | bigint
                    | boolean
                    | null
                    | undefined
                    | ResolveTarget[]
                    | { [key: string]: ResolveTarget }

                function resolve(value: unknown): ResolveTarget {
                    // 1. Error instances
                    if (value instanceof Error) {
                        const { name, message, stack } = value
                        return {
                            name,
                            message,
                            stack,
                        }
                    }
                    if (value instanceof Date) {
                        return value.toJSON()
                    }

                    // 2. Arrays
                    if (Array.isArray(value)) {
                        return value.map((item) => resolve(item))
                    }

                    // 3. Plain objects (records)
                    if (value !== null && typeof value === 'object') {
                        const obj = value as Record<string, unknown>
                        const result: Record<string, ResolveTarget> = {}
                        for (const [key, val] of Object.entries(obj)) {
                            result[key] = resolve(val)
                        }
                        return result
                    }

                    // 4. Primitives
                    switch (typeof value) {
                        case 'string':
                        case 'number':
                        case 'bigint':
                        case 'boolean':
                            return value
                        default: {
                            return value?.toString() ?? null
                        }
                    }
                }

                const serializeError = (
                    data: Record<string, PluginExecutionResponse>
                ): Record<string, PluginExecutionResponse> => {
                    const target = Object.entries(data).reduce<
                        Record<string, PluginExecutionResponse>
                    >((acc, [key, value]) => {
                        if (acc[key]) {
                            return acc
                        }
                        acc[key] = resolve(
                            value
                        ) as unknown as PluginExecutionResponse
                        return acc
                    }, {})
                    return target
                }
                const serialized = JSON.stringify(serializeError(data))
                return serialized
            },
        })

        this.pollingJobHistory()
    }

    /**
     * Polls the job history for each plugin manager and stores it in the storage.
     */
    private pollingJobHistory() {
        this.$pluginManagers.forEach((manager) =>
            manager.$runner.subscribe(async (...params) => {
                const history = params[2]
                await this.$storage.set(manager.options.name, history)
            })
        )
    }

    /**
     * Gets the history from the storage.
     * @throws Error if the history storage is not initialized.
     * @returns The history stored in the storage.
     */
    public get history() {
        if (!this._initialized) {
            throw new Error('History storage not initialized')
        }

        return this.$storage.storageRecord
    }

    /**
     * Initializes the history store for each plugin manager.
     * @param manager - The plugin manager.
     */
    private async initializeHistoryStore(
        manager: PluginManager<PluginShape, PluginRunner>
    ): Promise<void> {
        await this.$storage.set(manager.options.name, manager.$runner.history)
    }

    /**
     * Initializes the history storage.
     * @returns A promise that resolves when the initialization is complete.
     */
    public async init(): Promise<void> {
        await this.$storage.init()
        for (const manager of this.$pluginManagers) {
            await this.initializeHistoryStore(manager)
        }
        this._initialized = true
    }
}
