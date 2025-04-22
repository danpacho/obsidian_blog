import type {
    PluginInterface,
    PluginInterfaceDynamicConfig,
    PluginShape,
} from './plugin.interface'

export interface PluginLoaderConstructor {}

/**
 * Loading information for plugins.
 */
export type PluginLoadInformation = Array<{
    /**
     * Name of the plugin, should be unique
     */
    name: string
    /**
     * Dynamic configuration for the plugin, injected from the `obsidian`
     */
    dynamicConfig: PluginInterfaceDynamicConfig | null
}>

type PluginKey = PluginInterface['name']
/**
 * Represents a PluginLoader that can register and manage plugins.
 * @template Plugin The shape/interface of the plugins.
 */
export class PluginLoader<Plugin extends PluginShape = PluginShape> {
    /**
     * Creates a new instance of PluginLoader.
     * @param options Optional configuration for the PluginLoader.
     */
    public constructor(public readonly options?: PluginLoaderConstructor) {}

    private readonly _pluginMap: Map<PluginKey, Plugin> = new Map<
        PluginKey,
        Plugin
    >()
    public get pluginMap(): Map<PluginKey, Plugin> {
        return this._pluginMap
    }

    private _pluginList: Array<Plugin> = []
    public get pluginList(): Array<Plugin> {
        return this._pluginList
    }

    private register(plugin: Plugin): void {
        if (this._pluginMap.has(plugin.name)) return

        this._pluginMap.set(plugin.name, plugin)
        this._pluginList.push(plugin)
    }
    /**
     * Register a plugin or an array of plugins.
     * @param plugin The plugin(s) to register.
     * @returns The current instance of PluginLoader.
     */
    public use(plugin: Plugin | Array<Plugin> | undefined): this {
        if (!plugin) return this

        if (Array.isArray(plugin)) {
            plugin.forEach((plugin) => this.register(plugin))
            return this
        }

        this.register(plugin)
        return this
    }

    /**
     * Get the list of registered plugins.
     */
    public getPluginNames(): Array<string> {
        return this._pluginList.map((p) => p.staticConfig.name)
    }

    /**
     * Load the list of registered plugins.
     * @param loadInformation The information to load the plugins.
     * @returns The loaded plugins.
     */
    public load(loadInformation: PluginLoadInformation): Array<Plugin> {
        const loaded: Set<PluginKey> = new Set<PluginKey>()
        const plugins: Array<Plugin> = loadInformation
            .map((info) => {
                if (loaded.has(info.name)) return undefined

                const plugin: Plugin | undefined = this._pluginMap.get(
                    info.name
                )
                loaded.add(info.name)

                if (!plugin)
                    throw new Error(`Plugin with name ${info.name} not found`)

                if (info.dynamicConfig) {
                    plugin.injectDynamicConfig(info.dynamicConfig)
                }
                return plugin
            })
            .filter((p) => p !== undefined)

        return plugins
    }
}
