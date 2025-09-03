import { Runner } from '@obsidian_blogger/plugin_api'

import type {
    PublishPlugin,
    PublishPluginDependencies,
} from './plugin/publish.plugin'

export class PublishPluginRunner extends Runner.PluginRunner<
    PublishPlugin,
    PublishPluginDependencies
> {
    protected override async pluginPrepare(
        plugin: PublishPlugin,
        runtimeDependencies: PublishPluginDependencies
    ): Promise<void> {
        runtimeDependencies.logger.updateName(plugin.name)
    }
}
