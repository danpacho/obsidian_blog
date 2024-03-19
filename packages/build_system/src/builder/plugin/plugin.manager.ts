import { Pluggable, PluggableConstructor } from './pluggable'
import {
    PluginConfigStore,
    type PluginConfigStoreConstructor,
} from './plugin.config.store'

interface PluginManagerConstructor
    extends PluginConfigStoreConstructor,
        PluggableConstructor {}

export class PluginManager<PlugShape, PluginConfig> {
    public readonly $configStore: PluginConfigStore<PluginConfig>
    public readonly $plug: Pluggable<PlugShape>

    public constructor(options?: PluginManagerConstructor) {
        this.$configStore = new PluginConfigStore(options)
        this.$plug = new Pluggable(options)
    }
}
