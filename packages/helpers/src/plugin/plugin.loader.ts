export interface PluginLoaderConstructor {}

/**
 * Represents a PluginLoader that can register and manage plugins.
 * @template PlugShape The shape/interface of the plugins.
 */
export class PluginLoader<PlugShape> {
    /**
     * Creates a new instance of PluginLoader.
     * @param config Optional configuration for the PluginLoader.
     */
    public constructor(private readonly config?: PluginLoaderConstructor) {}

    private readonly _pluginSet: Set<PlugShape> = new Set<PlugShape>()
    private _pluginList: Array<PlugShape> = []

    /**
     * Register a plugin or an array of plugins.
     * @param plugin The plugin(s) to register.
     * @returns The current instance of PluginLoader.
     */
    public use(plugin: PlugShape | Array<PlugShape> | undefined): this {
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
     * @returns An array of registered plugins.
     */
    public get plugins(): Array<PlugShape> {
        return this._pluginList
    }
}
