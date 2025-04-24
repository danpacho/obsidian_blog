/* eslint-disable no-console */
import { JsonStorage } from '@obsidian_blogger/helpers/storage'
import { PluginRunnerExecutionResponse } from '../plugin.runner'
import { PluginConfigStorage } from './plugin.config.storage'

import { watch as fsWatch, watchFile, unwatchFile, FSWatcher } from 'node:fs'
import { basename } from 'node:path'

export type BuildBridgeHistoryValue = PluginRunnerExecutionResponse
export type BuildBridgeHistoryRecord = Record<string, BuildBridgeHistoryValue>

/**
 * Class representing the storage for BuildBridge configurations and job history.
 * @template Keys - The type of the keys used in the configuration storage.
 */
export class BuildBridgeStorage<Keys extends readonly string[]> {
    private readonly $config: Map<Keys[number], PluginConfigStorage>
    private readonly $history: JsonStorage<BuildBridgeHistoryValue>

    private _initialized = false

    /* ─────────── watcher state ─────────── */
    private _fsWatcher: FSWatcher | null = null // event-driven watcher
    private _retryTimer: NodeJS.Timeout | null = null // retry → polling
    private _debounceTimer: NodeJS.Timeout | null = null // debouncer
    private readonly _debounceMs = 10
    private readonly _pollInterval = 10
    private _usingPolling = false

    private readonly _watcherSubscribers = new Set<
        (newHistory: typeof this.$history.storageRecord) => void | Promise<void>
    >()

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

    /* ─────────── public API ─────────── */

    /** Returns the config storage for a given name. */
    public config(name: Keys[number]): PluginConfigStorage {
        return this.$config.get(name)!
    }

    /** Exposes the history storage. */
    public get history(): JsonStorage<BuildBridgeHistoryValue> {
        return this.$history
    }

    /**
     * Builds a fully-wired instance.
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
     * Subscribe to history-change events.
     */
    public subscribeHistory(
        subscriber: (
            newHistory: typeof this.$history.storageRecord
        ) => void | Promise<void>
    ): () => void {
        this._watcherSubscribers.add(subscriber)
        return () => {
            this._watcherSubscribers.delete(subscriber)
        }
    }

    /**
     * Starts watching the history file (idempotent).
     */
    public watchHistory(): void {
        if (this._fsWatcher || this._usingPolling) {
            console.info('History watcher already active')
            return
        }

        const filePath = this.$history.options.root
        const short = basename(filePath)

        const fire = async () => {
            /* debounce bursty events (editors often save twice) */
            clearTimeout(this._debounceTimer!)
            this._debounceTimer = setTimeout(async () => {
                try {
                    await this.$history.load()
                    const history = this.$history.storageRecord
                    for (const fn of this._watcherSubscribers) {
                        await fn(history)
                    }
                } catch (err) {
                    console.error('Error reloading history:', err)
                }
            }, this._debounceMs)
        }

        /* Primary: event-driven watcher */
        try {
            this._fsWatcher = fsWatch(filePath, (ev) => {
                if (ev === 'change') fire()
            })

            this._fsWatcher.on('error', (err) => {
                console.error(`fs.watch error on ${short}:`, err)
                this._switchToPolling(fire)
            })

            console.info(`Started fs.watch on ${short}`)
        } catch (err) {
            console.warn(
                `fs.watch failed on ${short}, falling back → polling`,
                err
            )
            this._switchToPolling(fire)
        }
    }

    /**
     * Stops whichever watcher is active.
     */
    public stopWatchingHistory(): void {
        const filePath = this.$history.options.root
        const short = basename(filePath)

        if (this._fsWatcher) {
            this._fsWatcher.close()
            this._fsWatcher = null
            console.info(`Stopped fs.watch on ${short}`)
        }

        if (this._usingPolling) {
            unwatchFile(filePath)
            this._usingPolling = false
            console.info(`Stopped fs.watchFile on ${short}`)
        }

        clearTimeout(this._retryTimer!)
        clearTimeout(this._debounceTimer!)
        this._retryTimer = this._debounceTimer = null
    }

    /**
     * Loads every config + history once.
     */
    public async load(): Promise<void> {
        if (this._initialized) {
            console.info('BuildBridgeStorage already initialized')
            return
        }
        await Promise.all([
            ...Array.from(this.$config.values()).map((c) => c.load()),
            this.$history.load(),
        ])
        this._initialized = true
    }

    /* ─────────── internal helpers ─────────── */

    /** Swap to `fs.watchFile` when `fs.watch` breaks or isn’t available. */
    private _switchToPolling(onChange: () => void) {
        const filePath = this.$history.options.root
        if (this._fsWatcher) {
            this._fsWatcher.close()
            this._fsWatcher = null
        }
        if (this._usingPolling) return

        watchFile(filePath, { interval: this._pollInterval }, (curr, prev) => {
            if (curr.mtimeMs !== prev.mtimeMs) onChange()
        })
        this._usingPolling = true
        console.info(`Now watching (polling) ${basename(filePath)}`)
    }
}
