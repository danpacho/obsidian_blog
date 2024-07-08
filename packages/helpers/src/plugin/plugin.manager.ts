import {
    PluginConfigStore,
    type PluginConfigStoreConstructor,
} from './plugin.config.store'
import { PluginLoader, type PluginLoaderConstructor } from './plugin.loader'

/**
 * PluginManager constructor options.
 */
export interface PluginManagerConstructor
    extends PluginConfigStoreConstructor,
        PluginLoaderConstructor {}

/**
 * Represents a plugin manager that handles the configuration and loading of plugins.
 *
 * @template PlugShape - The shape/interface of the plugin.
 * @template PluginConfig - The configuration type for the plugin.
 */
export class PluginManager<PlugShape, PluginConfig> {
    /**
     * The configuration store for the plugins.
     */
    public readonly $config: PluginConfigStore<PluginConfig>

    /**
     * The plugin loader for loading plugins.
     */
    public readonly $loader: PluginLoader<PlugShape>

    /**
     * Creates a new instance of the PluginManager class.
     *
     * @param options - Optional options for configuring the plugin manager.
     */
    public constructor(options?: PluginManagerConstructor) {
        this.$config = new PluginConfigStore(options)
        this.$loader = new PluginLoader(options)
    }
}
