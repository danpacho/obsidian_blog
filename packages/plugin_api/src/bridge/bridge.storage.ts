/* eslint-disable no-console */
import { JsonStorage } from '@obsidian_blogger/helpers/storage'
import { PluginConfigStorage } from './plugin.config.storage'
import type { PluginRunnerExecutionResponse } from '../plugin.runner'

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
    private _fsWatcher: FSWatcher | null = null
    private _debounceTimer: NodeJS.Timeout | null = null
    private readonly _debounceMs = 5 // trailing debounce
    private readonly _pollInterval = 5
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
        return () => this._watcherSubscribers.delete(subscriber)
    }

    /**
     * Starts watching the history file (idempotent).
     */
    public watchHistory(): void {
        if (this._fsWatcher || this._usingPolling) {
            return
        }

        const filePath = this.$history.options.root
        const short = basename(filePath)

        /* helper – retry-until-valid loader */
        const safeLoad = async () => {
            const maxRetries = 5
            for (let i = 0; i < maxRetries; i++) {
                try {
                    await this.$history.load()
                    return
                } catch (err) {
                    // most likely JSON half-written – wait & try again
                    if (i === maxRetries - 1) throw err
                    await new Promise((r) => setTimeout(r, 5))
                }
            }
        }

        /* broadcast with a brand-new object reference */
        const emitHistory = async () => {
            try {
                await safeLoad()
                const cloned = structuredClone(this.$history.storageRecord)
                for (const fn of this._watcherSubscribers) await fn(cloned)
            } catch (err) {
                console.error('Error reloading history:', err)
            }
        }

        /* LEADING call + trailing debounce */
        const onFsEvent = () => {
            void emitHistory() // leading edge
            clearTimeout(this._debounceTimer!)
            this._debounceTimer = setTimeout(emitHistory, this._debounceMs) // trailing
        }

        /* Primary watcher */
        try {
            this._fsWatcher = fsWatch(filePath, onFsEvent) // reacts to both change & rename
            this._fsWatcher.on('error', (err) => {
                console.error(`fs.watch error on ${short}:`, err)
                this._switchToPolling(onFsEvent)
            })
        } catch (err) {
            console.warn(
                `fs.watch failed on ${short}, falling back → polling`,
                err
            )
            this._switchToPolling(onFsEvent)
        }
    }

    /**
     * Stops whichever watcher is active.
     */
    public stopWatchingHistory(): void {
        const filePath = this.$history.options.root

        if (this._fsWatcher) {
            this._fsWatcher.close()
            this._fsWatcher = null
        }

        if (this._usingPolling) {
            unwatchFile(filePath)
            this._usingPolling = false
        }

        clearTimeout(this._debounceTimer!)
        this._debounceTimer = null
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
    }
}
