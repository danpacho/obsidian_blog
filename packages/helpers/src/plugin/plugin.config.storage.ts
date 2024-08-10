import { JsonStorage, type JsonStorageConstructor } from '../storage'
import type { PluginConfig } from './plugin.interface'

export interface PluginConfigStoreConstructor extends JsonStorageConstructor {}
/**
 * Represents a store for plugin configurations.
 */
export class PluginConfigStorage extends JsonStorage<PluginConfig> {
    /**
     * Creates an instance of PluginConfigStore.
     * @param options - Optional configuration options for the store.
     */
    public constructor(options: PluginConfigStoreConstructor) {
        super(options)
    }

    /**
     * Checks if a configuration with the specified name exists in the store.
     * @param name - The name of the configuration.
     * @returns A boolean indicating whether the configuration exists.
     */
    public hasConfig(name: string): boolean {
        return this.storage.has(name)
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

        await this.set(pluginName, {
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
        await this.set(pluginName, {
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
        const config = this.get(pluginName)
        if (!config) return
        if (!dynamicConfig) return

        await this.set(pluginName, {
            staticConfig: config.staticConfig,
            dynamicConfig,
        })
        return
    }
}
