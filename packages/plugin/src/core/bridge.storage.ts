/* eslint-disable no-console */
import { FileChangeInfo, watch } from 'fs/promises'
import { type Job } from '@obsidian_blogger/helpers/job'
import { JsonStorage } from '@obsidian_blogger/helpers/storage'
import { PluginConfigStorage } from './plugin.config.storage'
/**
 * Class representing the storage for BuildBridge configurations and job history.
 * @template Keys - The type of the keys used in the configuration storage.
 */
export class BuildBridgeStorage<Keys extends readonly string[]> {
    private readonly $config: Map<Keys[number], PluginConfigStorage>
    private readonly $history: JsonStorage<Job<Array<Job>>>
    private static $instance: BuildBridgeStorage<readonly string[]>

    private _initialized: boolean = false

    private constructor(
        public readonly options: {
            bridgeRoot: string
            storePrefix: string
            configStorage: Map<Keys[number], PluginConfigStorage>
            historyStorage: JsonStorage<Job<Array<Job>>>
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
    public get history(): JsonStorage<Job<Array<Job>>> {
        return this.$history
    }

    private _watcher: null | AsyncIterable<FileChangeInfo<string>> = null
    private readonly _watcherController = new AbortController()

    /**
     * Retrieves the AbortController for the watcher.
     * @returns The AbortController if the watcher is active, otherwise null.
     */
    public get watcherController(): AbortController | null {
        if (this._watcher) return this._watcherController
        return null
    }

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
        if (!BuildBridgeStorage.$instance) {
            const configStorageMap = new Map<
                Keys[number],
                PluginConfigStorage
            >()

            for (const name of options.configNames) {
                configStorageMap.set(
                    name,
                    new PluginConfigStorage({
                        name,
                        root: `${options.bridgeRoot}/${options.storePrefix}/${name}.json`,
                    })
                )
            }

            BuildBridgeStorage.$instance = new BuildBridgeStorage<Keys>({
                bridgeRoot: options.bridgeRoot,
                storePrefix: options.storePrefix,
                configStorage: configStorageMap,
                historyStorage: new JsonStorage<Job<Array<Job>>>({
                    name: 'history',
                    root: `${options.bridgeRoot}/${options.storePrefix}/history.json`,
                }),
            })
        }

        return BuildBridgeStorage.$instance as BuildBridgeStorage<Keys>
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

    /**
     * Watches the job history file for changes and notifies subscribers.
     */
    public async watchHistory(): Promise<void> {
        try {
            const watcher = watch(this.$history.options.root)
            this._watcher = watcher

            for await (const event of watcher) {
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

        this._watcherController.abort()
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
