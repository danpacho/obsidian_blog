import { type JobManagerConstructor } from '../job'
import {
    PluginConfigStore,
    type PluginConfigStoreConstructor,
} from './plugin.config.store'
import type {
    PluginInterfaceDependencies,
    PluginShape,
} from './plugin.interface'
import { PluginLoader, type PluginLoaderConstructor } from './plugin.loader'
import type { PluginRunner } from './plugin.runner'

/**
 * PluginManager constructor options.
 */
export interface PluginManagerConstructor<Runner extends PluginRunner>
    extends PluginConfigStoreConstructor,
        PluginLoaderConstructor,
        JobManagerConstructor {
    runner: Runner
}
/**
 * Represents a plugin manager that handles the configuration and loading of plugins.
 */
export class PluginManager<
    Plugin extends PluginShape,
    Runner extends PluginRunner<Plugin, PluginInterfaceDependencies | null>,
> {
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
    public readonly $runner: Runner
    /**
     * Creates a new instance of the PluginManager class.
     *
     * @param options - Optional options for configuring the plugin manager.
     */
    public constructor(options: PluginManagerConstructor<Runner>) {
        this.$config = new PluginConfigStore(options)
        this.$loader = new PluginLoader(options)
        this.$runner = options.runner
    }

    public updateRoot(root: string) {
        this.$config.options.root = root
    }
}
