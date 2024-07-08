type PluginName = string

export interface PluginConfigStoreConstructor {}

/**
 * Represents a store for plugin configurations.
 * @template PluginConfig - The type of the plugin configuration.
 */
export class PluginConfigStore<PluginConfig> {
    /**
     * Creates an instance of PluginConfigStore.
     * @param options - Optional configuration options for the store.
     */
    public constructor(
        private readonly options?: PluginConfigStoreConstructor
    ) {}

    private readonly _store: Map<PluginName, PluginConfig> = new Map()

    /**
     * Gets the underlying store map.
     */
    public get store(): Record<PluginName, PluginConfig> {
        return Object.fromEntries(this._store)
    }

    /**
     * Checks if a configuration with the specified name exists in the store.
     * @param name - The name of the configuration.
     * @returns A boolean indicating whether the configuration exists.
     */
    public hasConfig(name: string): boolean {
        return this._store.has(name)
    }

    /**
     * Adds a configuration to the store.
     * @param pluginName - The name of the plugin.
     * @param config - The configuration to add.
     */
    public addConfig(pluginName: string, config: PluginConfig) {
        if (this.hasConfig(pluginName)) return
        this._store.set(pluginName, config)
    }

    /**
     * Updates a configuration in the store.
     * @param pluginName - The name of the plugin.
     * @param config - The updated configuration.
     */
    public updateConfig(pluginName: string, config: PluginConfig) {
        this._store.set(pluginName, config)
    }

    /**
     * Gets a configuration from the store.
     * @param name - The name of the configuration.
     * @returns The configuration if found, otherwise undefined.
     */
    public getConfig(name: string): PluginConfig | undefined {
        return this._store.get(name)
    }
}
