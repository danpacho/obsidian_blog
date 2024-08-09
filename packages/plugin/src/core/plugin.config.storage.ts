import { Bridge } from '@obsidian_blogger/constants'
import { PluginConfig } from '@obsidian_blogger/helpers/plugin'
import { JsonStorage } from '@obsidian_blogger/helpers/storage'

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

    private static isObject(value: unknown): value is Record<string, unknown> {
        return (
            value !== null && typeof value === 'object' && !Array.isArray(value)
        )
    }
    private static deepMergeRecord(
        base: Record<string, unknown>,
        after: Record<string, unknown>
    ): Record<string, unknown> {
        const result: Record<string, unknown> = { ...base }

        for (const key in after) {
            if (Object.prototype.hasOwnProperty.call(after, key)) {
                const baseValue = base[key]
                const afterValue = after[key]

                if (
                    PluginConfigStorage.isObject(baseValue) &&
                    PluginConfigStorage.isObject(afterValue)
                ) {
                    result[key] = PluginConfigStorage.deepMergeRecord(
                        baseValue,
                        afterValue
                    )
                } else {
                    result[key] = afterValue
                }
            }
        }

        return result
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
        Object.entries(userConfig).forEach(
            async ([pluginName, dynamicConfig]) => {
                const prevConfig = this.get(pluginName)
                // It is not possible, staticConfig is always defined
                if (!prevConfig) return

                const mergedConfig: PluginConfig =
                    PluginConfigStorage.deepMergeRecord(prevConfig, {
                        dynamicConfig,
                    }) as PluginConfig

                await this.set(pluginName, mergedConfig)
            }
        )
    }
}
