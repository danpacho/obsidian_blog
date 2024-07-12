import { JsonStorage, type JsonStorageConstructor } from '../storage'
import type { PluginInterfaceConfig } from './plugin.interface'

type PluginName = PluginInterfaceConfig['name']

export interface PluginConfigStoreConstructor extends JsonStorageConstructor {}
/**
 * Represents a store for plugin configurations.
 * @template PluginConfig{@link PluginInterfaceConfig} - The type of the plugin configuration.
 */
export class PluginConfigStore<PluginConfig extends PluginInterfaceConfig> {
    /**
     * Creates an instance of PluginConfigStore.
     * @param options - Optional configuration options for the store.
     */
    public constructor(private readonly options: PluginConfigStoreConstructor) {
        this.$storage = new JsonStorage<PluginConfig>(options)
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
     * Gets the underlying store map.
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
        await this.$storage.set(pluginName, config)
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
        await this.$storage.set(pluginName, config)
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
