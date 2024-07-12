import type { PluginInterface } from './plugin.interface'

export interface PluginLoaderConstructor {}

/**
 * Represents a PluginLoader that can register and manage plugins.
 * @template Plugin The shape/interface of the plugins.
 */
export class PluginLoader<Plugin extends PluginInterface = PluginInterface> {
    /**
     * Creates a new instance of PluginLoader.
     * @param config Optional configuration for the PluginLoader.
     */
    public constructor(public readonly config?: PluginLoaderConstructor) {}

    private readonly _pluginSet: Set<Plugin> = new Set<Plugin>()
    private _pluginList: Array<Plugin> = []

    /**
     * Register a plugin or an array of plugins.
     * @param plugin The plugin(s) to register.
     * @returns The current instance of PluginLoader.
     */
    public use(plugin: Plugin | Array<Plugin> | undefined): this {
        if (!plugin) return this

        if (Array.isArray(plugin)) {
            plugin.forEach((p) => this._pluginSet.add(p))
            this._pluginList = Array.from(this._pluginSet)
            return this
        }

        this._pluginSet.add(plugin)
        this._pluginList = Array.from(this._pluginSet)
        return this
    }

    /**
     * Get the list of registered plugins.
     */
    public getPluginNames(): Array<string> {
        return this._pluginList.map((p) => p.config.name)
    }

    /**
     * Load the list of registered plugins.
     * @param include An array of plugin names to include.
     * @returns An array of registered plugins.
     */
    public load(include?: Array<string>): Array<Plugin> {
        if (!include) return this._pluginList

        return this._pluginList.filter((p) => include.includes(p.config.name))
    }
}
