export interface PluggableConstructor {}
export class Pluggable<PlugShape> {
    public constructor(private readonly options?: PluggableConstructor) {}

    private readonly _pluginSet: Set<PlugShape> = new Set<PlugShape>()
    private _pluginList: Array<PlugShape> = []

    /**
     * Register a plugin
     * @param plugin Plugin to use
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
     * Get the list of plugins
     */
    public get pluginList(): Array<PlugShape> {
        return this._pluginList
    }
}
