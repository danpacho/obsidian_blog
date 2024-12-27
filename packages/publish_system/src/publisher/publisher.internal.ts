import { Runner } from '@obsidian_blogger/plugin'
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
                    await plugin.cleanup?.(job)
                },
            })
        }

        await this.$pluginRunner.processJobs()

        return this.history
    }
}
