import {
    JsonStorage,
    type JsonStorageConstructor,
} from '@obsidian_blogger/helpers/storage'
import type { Bridge } from '../constants'
import type {
    PluginConfig,
    PluginInterfaceDynamicConfig,
} from '../plugin.interface'

/**
 * @description Obsidian bridge configuration interface
 * @description **Check `$$load_status$$` for the plugin load status**
 * @example
 * ```ts
 * const currency: UserPluginConfig = {
 *     plugin1: {
 *         input: {
 *             key: 'value',
 *         },
 *         $$load_status$$: 'include'
 *         // If 'exclude', then will not be loaded
 *     },
 * }
 * ```
 */
export type UserPluginConfig = Record<string, Bridge.USER_PLUGIN_LOAD_INPUT>

export interface PluginConfigStoreConstructor extends JsonStorageConstructor {}
export class PluginConfigStorage extends JsonStorage<PluginConfig> {
    public constructor(options: PluginConfigStoreConstructor) {
        super(options)
    }

    private isRecord<T extends Record<string, unknown>>(
        target: unknown
    ): target is T {
        return (
            typeof target === 'object' &&
            target !== null &&
            !Array.isArray(target)
        )
    }
    private mergeRecord<T extends Record<string, unknown>>(
        currRecord: T,
        newRecord: T
    ): T {
        const result: T = { ...currRecord }

        for (const key in newRecord) {
            if (Object.prototype.hasOwnProperty.call(newRecord, key)) {
                const currValue = currRecord[key]
                const newValue = newRecord[key]

                if (this.isRecord(currValue) && this.isRecord(newValue)) {
                    result[key] = this.mergeRecord(currValue, newValue)
                } else {
                    result[key] = newValue
                }
            }
        }

        return result
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
        const prevConfig = this.get(pluginName)

        if (!prevConfig) {
            await this.addConfig(pluginName, config)
            return
        }

        const mergedConfig = this.mergeRecord(prevConfig, {
            staticConfig: prevConfig.staticConfig,
            dynamicConfig: config.dynamicConfig ?? null,
        })

        await this.set(pluginName, mergedConfig)
    }

    /**
     * Updates the dynamic configuration for a plugin by the user configuration.
     * @param pluginName The name of the plugin
     * @param dynamicConfig The dynamic configuration to update
     */
    public async updateDynamicConfigByUserConfig(
        pluginName: string,
        dynamicConfig:
            | PluginInterfaceDynamicConfig
            | Bridge.USER_PLUGIN_LOAD_INPUT
    ): Promise<void> {
        const prevConfig = this.get(pluginName)
        // It is not possible, staticConfig is always defined
        if (!prevConfig) return

        const mergedConfig = this.mergeRecord(prevConfig, {
            staticConfig: prevConfig.staticConfig,
            dynamicConfig,
        })

        await this.set(pluginName, mergedConfig)
    }

    /**
     * Updates the load status of a single plugin.
     * @param pluginName Name of the plugin
     * @param loadStatus Load status of the plugin, `include` or `exclude`
     */
    public async updateSinglePluginLoadStatus(
        pluginName: string,
        loadStatus: Bridge.USER_PLUGIN_LOAD_STATUS_VALUE
    ): Promise<void> {
        await this.updateDynamicConfigByUserConfig(pluginName, {
            $$load_status$$: loadStatus,
        })
    }

    /**
     * Updates the load status of multiple plugins.
     * @param information Information to update
     */
    public async updateAllPluginLoadStatus(
        information: Array<{
            pluginName: string
            loadStatus: Bridge.USER_PLUGIN_LOAD_STATUS_VALUE
        }>
    ): Promise<void> {
        for (const { pluginName, loadStatus } of information) {
            await this.updateSinglePluginLoadStatus(pluginName, loadStatus)
        }
    }

    /**
     * Updates all dynamic configurations for all plugins by the user configuration.
     * @param userConfig Input configuration from the obsidian user
     * @example
     * ```ts
     * const userConfig: UserPluginConfig = {
     *    plugin1: {
     *       input: {
     *          key: 'value',
     *       },
     *       $$load_status$$: 'include'
     *    },
     * }
     * ```
     */
    public async updateAllDynamicConfigByUserConfig(
        userConfig: UserPluginConfig
    ): Promise<void> {
        for (const [pluginName, dynamicConfig] of Object.entries(userConfig)) {
            await this.updateDynamicConfigByUserConfig(
                pluginName,
                dynamicConfig
            )
        }
    }
}
