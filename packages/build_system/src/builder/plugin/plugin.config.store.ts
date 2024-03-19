//TODO: Is this really needed?
type PluginName = string

export interface PluginConfigStoreConstructor {}
export class PluginConfigStore<PluginConfig> {
    public constructor(
        private readonly options?: PluginConfigStoreConstructor
    ) {}

    private readonly _store: Map<PluginName, PluginConfig> = new Map()
    public get store(): Map<PluginName, PluginConfig> {
        return this._store
    }

    public hasConfig(name: string): boolean {
        return this._store.has(name)
    }

    public addConfig(pluginName: string, config: PluginConfig) {
        if (this.hasConfig(pluginName)) return
        this._store.set(pluginName, config)
    }

    public updateConfig(pluginName: string, config: PluginConfig) {
        this._store.set(pluginName, config)
    }

    public getConfig(name: string): PluginConfig | undefined {
        return this._store.get(name)
    }
}
