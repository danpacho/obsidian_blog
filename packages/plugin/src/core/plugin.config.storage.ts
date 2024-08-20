import { Bridge } from '@obsidian_blogger/constants'
import {
    PluginConfig,
    PluginInterfaceDynamicConfig,
} from '@obsidian_blogger/helpers/plugin'
import { JsonStorage } from '@obsidian_blogger/helpers/storage'
import { MergeRecord } from '~/utils/merge.record'

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

export class PluginConfigStorage extends JsonStorage<PluginConfig> {
    public constructor(options: { name: string; root: string }) {
        super(options)
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

        const mergedConfig: PluginConfig = MergeRecord(prevConfig, {
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
