import { type JobManagerConstructor } from '@obsidian_blogger/helpers/job'

import { PluginLoader, type PluginLoaderConstructor } from '../plugin.loader'

import {
    PluginConfigStorage,
    type PluginConfigStoreConstructor,
} from './plugin.config.storage'

import type {
    PluginInterfaceDependencies,
    PluginShape,
} from '../plugin.interface'
import type { PluginRunner } from '../plugin.runner'

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
    public readonly $config: PluginConfigStorage
    /**
     * The plugin loader for loading plugins.
     */
    public readonly $loader: PluginLoader<Plugin>
    /**
     * The plugin runner for running plugins.
     */
    public get $runner(): Runner {
        return this.options.runner
    }
    /**
     * Creates a new instance of the PluginManager class.
     *
     * @param options - Optional options for configuring the plugin manager.
     */
    public constructor(
        public readonly options: PluginManagerConstructor<Runner>
    ) {
        this.$config = new PluginConfigStorage(options)
        this.$loader = new PluginLoader(options)
    }

    /**
     * Initializes the config json storage
     */
    public async init(): Promise<void> {
        await this.$config.init()
    }
}
