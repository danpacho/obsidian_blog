/* eslint-disable no-console */
import { FileChangeInfo, watch } from 'fs/promises'
import { JsonStorage } from '@obsidian_blogger/helpers/storage'
import { PluginRunnerExecutionResponse } from '../plugin.runner'
import { PluginConfigStorage } from './plugin.config.storage'

export type BuildBridgeHistoryValue = PluginRunnerExecutionResponse
export type BuildBridgeHistoryRecord = Record<string, BuildBridgeHistoryValue>

/**
 * Class representing the storage for BuildBridge configurations and job history.
 * @template Keys - The type of the keys used in the configuration storage.
 */
export class BuildBridgeStorage<Keys extends readonly string[]> {
    private readonly $config: Map<Keys[number], PluginConfigStorage>
    private readonly $history: JsonStorage<BuildBridgeHistoryValue>

    private _initialized: boolean = false

    private constructor(
        public readonly options: {
            bridgeRoot: string
            storePrefix: string
            configStorage: Map<Keys[number], PluginConfigStorage>
            historyStorage: JsonStorage<BuildBridgeHistoryValue>
        }
    ) {
        this.$config = options.configStorage
        this.$history = options.historyStorage
    }

    /**
     * Retrieves the configuration storage for a given name.
     * @param name - The name of the configuration.
     */
    public config(name: Keys[number]): PluginConfigStorage {
        return this.$config.get(name)!
    }

    /**
     * Retrieves the job history storage.
     */
    public get history(): JsonStorage<BuildBridgeHistoryValue> {
        return this.$history
    }
    private _watcher: null | AsyncIterable<FileChangeInfo<string>> = null

    private readonly _watcherSubscribers = new Set<
        (newHistory: typeof this.$history.storageRecord) => void | Promise<void>
    >()

    /**
     * Creates an instance of `BuildBridgeStorage`.
     * @param {string} options.bridgeRoot - Root directory for the bridge.
     * @param {string} options.storePrefix - Prefix for the store directory.
     * @param {Keys} options.configNames - Names of the configurations.
     * @returns The instance of `BuildBridgeStorage`.
     */
    public static create<const Keys extends readonly string[]>(options: {
        bridgeRoot: string
        storePrefix: string
        configNames: Keys
    }): BuildBridgeStorage<Keys> {
        const configStorageMap = new Map<Keys[number], PluginConfigStorage>()

        for (const name of options.configNames) {
            configStorageMap.set(
                name,
                new PluginConfigStorage({
                    name,
                    root: `${options.bridgeRoot}/${options.storePrefix}/${name}.json`,
                })
            )
        }

        return new BuildBridgeStorage<Keys>({
            bridgeRoot: options.bridgeRoot,
            storePrefix: options.storePrefix,
            configStorage: configStorageMap,
            historyStorage: new JsonStorage<BuildBridgeHistoryValue>({
                name: 'history',
                root: `${options.bridgeRoot}/${options.storePrefix}/history.json`,
            }),
        })
    }

    /**
     * Subscribes a function to be called when the job history changes.
     * @param subscriber - The function to call when the job history changes.
     */
    public subscribeHistory(
        subscriber: (
            newHistory: typeof this.$history.storageRecord
        ) => void | Promise<void>
    ) {
        this._watcherSubscribers.add(subscriber)
    }

    private _watchRetryCount: number = 0

    /**
     * Watches the job history file for changes and notifies subscribers.
     */
    public async watchHistory(): Promise<void> {
        if (this._watcher) {
            console.info(`Watcher is already active`)
            return
        }
        if (this._watchRetryCount > 50) {
            console.error(`Failed to watch history after 50 retries`)
            return
        }
        try {
            this._watcher = watch(this.$history.options.root, {
                persistent: true,
                recursive: false,
            })

            for await (const event of this._watcher) {
                if (event.eventType === 'change') {
                    await this.$history.load()
                    const history = this.$history.storageRecord
                    for (const subscriber of this._watcherSubscribers) {
                        await subscriber(history)
                    }
                }
            }
        } catch (err) {
            console.error(
                `Stopped watching ${this.$history.options.root}\n${JSON.stringify(err, null, 4)}`
            )
            this.stopWatchingHistory()
            this._watchRetryCount++
            await this.watchHistory()
        }
    }

    /**
     * Stops watching the job history file.
     */
    public stopWatchingHistory() {
        if (!this._watcher) {
            console.info(`Watcher is not active`)
            return
        }

        this._watcher = null
        console.info(`Stopped watching ${this.$history.options.root}`)
    }

    /**
     * Loads all configurations and job history into memory.
     */
    public async load(): Promise<void> {
        if (this._initialized) {
            console.info(`Already initialized`)
            return
        }

        const configs = Array.from(this.$config.values())
        for (const config of configs) {
            await config.load()
        }
        await this.$history.load()
        this._initialized = true
    }
}
