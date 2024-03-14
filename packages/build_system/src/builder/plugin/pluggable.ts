export class Pluggable<PlugShape> {
    private readonly _pluginSet: Set<PlugShape> = new Set<PlugShape>()
    private _pluginList: Array<PlugShape> = []

    public constructor() {}

    public use(plugin: PlugShape | Array<PlugShape>): this {
        if (Array.isArray(plugin)) {
            plugin.forEach((p) => this._pluginSet.add(p))
            this._pluginList = Array.from(this._pluginSet)
            return this
        }

        this._pluginSet.add(plugin)
        this._pluginList = Array.from(this._pluginSet)
        return this
    }

    public get plugin(): Array<PlugShape> {
        return this._pluginList
    }
}
