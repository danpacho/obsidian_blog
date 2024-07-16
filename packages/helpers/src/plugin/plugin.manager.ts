import { type JobManagerConstructor } from '../job'
import {
    PluginConfigStore,
    type PluginConfigStoreConstructor,
} from './plugin.config.store'
import { PluginShape } from './plugin.interface'
import { PluginLoader, type PluginLoaderConstructor } from './plugin.loader'
import { PluginRunner } from './plugin.runner'

/**
 * PluginManager constructor options.
 */
export interface PluginManagerConstructor
    extends PluginConfigStoreConstructor,
        PluginLoaderConstructor,
        JobManagerConstructor {
    runner: PluginRunner
}
/**
 * Represents a plugin manager that handles the configuration and loading of plugins.
 */
export class PluginManager<Plugin extends PluginShape = PluginShape> {
    /**
     * The configuration store for the plugins.
     */
    public readonly $config: PluginConfigStore
    /**
     * The plugin loader for loading plugins.
     */
    public readonly $loader: PluginLoader<Plugin>
    /**
     * The plugin runner for running plugins.
     */
    public readonly $runner: PluginRunner<Plugin>
    /**
     * Creates a new instance of the PluginManager class.
     *
     * @param options - Optional options for configuring the plugin manager.
     */
    public constructor(options: PluginManagerConstructor) {
        this.$config = new PluginConfigStore(options)
        this.$loader = new PluginLoader(options)
        this.$runner = options.runner
    }

    public updateRoot(root: string) {
        this.$config.options.root = root
    }
}
