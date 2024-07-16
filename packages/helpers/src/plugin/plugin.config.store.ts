import { JsonStorage, type JsonStorageConstructor, json } from '../storage'
import type { PluginConfig } from './plugin.interface'

type PluginName = PluginConfig['staticConfig']['name']

export interface PluginConfigStoreConstructor extends JsonStorageConstructor {}
/**
 * Represents a store for plugin configurations.
 */
export class PluginConfigStore {
    /**
     * Creates an instance of PluginConfigStore.
     * @param options - Optional configuration options for the store.
     */
    public constructor(public readonly options: PluginConfigStoreConstructor) {
        this.$storage = new JsonStorage({
            ...options,
            serializer: json.serialize,
            deserializer: json.deserialize,
        })
    }

    private readonly $storage: JsonStorage<PluginConfig>

    /**
     * Resets the config store.
     */
    public async reset(): Promise<void> {
        await this.$storage.reset()
        return
    }

    /**
     * Loads the config store.
     */
    public async load(): Promise<void> {
        await this.$storage.load()
        return
    }

    /**
     * Gets the underlying store record.
     */
    public get store(): Record<PluginName, PluginConfig> {
        return this.$storage.storageRecord
    }

    /**
     * Checks if a configuration with the specified name exists in the store.
     * @param name - The name of the configuration.
     * @returns A boolean indicating whether the configuration exists.
     */
    public hasConfig(name: string): boolean {
        return this.$storage.storage.has(name)
    }

    /**
     * Adds a configuration to the store.
     * @param pluginName - The name of the plugin.
     * @param config - The configuration to add.
     */
    public async addConfig(
        pluginName: string,
        config: PluginConfig
    ): Promise<void> {
        if (this.hasConfig(pluginName)) return

        await this.$storage.set(pluginName, {
            staticConfig: config.staticConfig,
            dynamicConfig: config.dynamicConfig ?? null,
        })
        return
    }

    /**
     * Updates a configuration in the store.
     * @param pluginName - The name of the plugin.
     * @param config - The updated configuration.
     */
    public async updateConfig(
        pluginName: string,
        config: PluginConfig
    ): Promise<void> {
        await this.$storage.set(pluginName, {
            staticConfig: config.staticConfig,
            dynamicConfig: config.dynamicConfig ?? null,
        })
        return
    }

    /**
     * Updates a dynamic configuration only in the store.
     * @param pluginName - The name of the plugin.
     * @param dynamicConfig - The dynamic configuration
     */
    public async updateDynamicConfig(
        pluginName: string,
        dynamicConfig: PluginConfig['dynamicConfig']
    ): Promise<void> {
        const config = this.getConfig(pluginName)
        if (!config) return
        if (!dynamicConfig) return

        await this.$storage.set(pluginName, {
            staticConfig: config.staticConfig,
            dynamicConfig,
        })
        return
    }

    /**
     * Gets a configuration from the store.
     * @param name - The name of the configuration.
     * @returns The configuration if found, otherwise undefined.
     */
    public getConfig(name: string): PluginConfig | undefined {
        return this.$storage.get(name)
    }
}
