import type { Job } from '../../job'
import { JsonStorage } from '../../storage'
import type { PluginShape } from '../plugin.interface'
import type { PluginManager } from '../plugin.manager'
import type { PluginRunner } from '../plugin.runner'

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
        if (this._initialized) return
        await this.$storage.init()
        for (const manager of this.$pluginManagers) {
            await this.initializeHistoryStore(manager)
        }
        this._initialized = true
    }
}
