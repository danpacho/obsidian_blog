import { Runner } from '@obsidian_blogger/plugin_api'
import type {
    PublishPlugin,
    PublishPluginDependencies,
} from './plugin/publish.plugin'

export class PublishPluginRunner extends Runner.PluginRunner<
    PublishPlugin,
    PublishPluginDependencies
> {
    public async run(
        pluginPipes: PublishPlugin[],
        dependencies: PublishPluginDependencies
    ) {
        for (const plugin of pluginPipes) {
            this.$pluginRunner.registerJob({
                name: plugin.name,
                prepare: async () => {
                    dependencies.logger.updateName(plugin.name)
                    plugin.injectDependencies(dependencies)
                    return await plugin.prepare?.()
                },
                execute: async (controller, prepared) => {
                    return await plugin.execute(controller, prepared)
                },
                cleanup: async (job) => {
                    for (const res of job?.response ?? []) {
                        await plugin.cleanup?.(res)
                    }
                },
            })
        }

        await this.$pluginRunner.processJobs()

        return this.history
    }
}
