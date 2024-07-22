import { Runner } from '@obsidian_blogger/helpers/plugin'
import type {
    BuildContentsPlugin,
    BuildContentsPluginDependencies,
    BuildContentsPluginStaticConfig,
    BuildTreePlugin,
    BuildTreePluginDependencies,
    BuildTreePluginDynamicConfig,
    BuildTreePluginStaticConfig,
    WalkTreePlugin,
    WalkTreePluginDependencies,
    WalkTreePluginDynamicConfig,
    WalkTreePluginStaticConfig,
} from './plugin'
import type { BuildPluginDynamicConfig } from './plugin/build.plugin'

export class BuildTreePluginRunner extends Runner.PluginRunner<
    BuildTreePlugin,
    BuildTreePluginDependencies
> {
    public async run(
        pluginPipes: BuildTreePlugin<
            BuildTreePluginStaticConfig,
            BuildTreePluginDynamicConfig
        >[],
        deps: BuildTreePluginDependencies
    ): Promise<this['history']> {
        for (const plugin of pluginPipes) {
            this.$jobManager.registerJob({
                name: plugin.name,
                prepare: async () => {
                    plugin.injectDependencies(deps)
                    await plugin.prepare?.()
                },
                execute: async (controller) => {
                    return await plugin.execute(controller, deps.cachePipeline)
                },
                cleanup: async (job) => {
                    await plugin.cleanup?.(job)
                },
            })
        }

        await this.$jobManager.processJobs()

        return this.history
    }
}

export class WalkTreePluginRunner extends Runner.PluginRunner<
    WalkTreePlugin,
    WalkTreePluginDependencies
> {
    public async run(
        pluginPipes: WalkTreePlugin<
            WalkTreePluginStaticConfig,
            WalkTreePluginDynamicConfig
        >[],
        deps: WalkTreePluginDependencies
    ): Promise<this['history']> {
        for (const plugin of pluginPipes) {
            this.$jobManager.registerJob({
                name: plugin.name,
                prepare: async () => {
                    plugin.injectDependencies(deps)
                    await plugin.prepare?.()
                },
                execute: async (controller) => {
                    return await plugin.execute(controller, deps.cachePipeline)
                },
                cleanup: async (job) => {
                    await plugin.cleanup?.(job)
                },
            })
        }

        await this.$jobManager.processJobs()

        return this.history
    }
}

export class BuildContentsPluginRunner extends Runner.PluginRunner<
    BuildContentsPlugin,
    BuildContentsPluginDependencies
> {
    public async run(
        pluginPipes: BuildContentsPlugin<
            BuildContentsPluginStaticConfig,
            BuildPluginDynamicConfig
        >[],
        deps: BuildContentsPluginDependencies
    ): Promise<this['history']> {
        for (const plugin of pluginPipes) {
            this.$jobManager.registerJob({
                name: plugin.name,
                prepare: async () => {
                    plugin.injectDependencies(deps)
                    await plugin.prepare?.()
                },
                execute: async (controller) => {
                    const buildedContents = await plugin.execute(
                        controller,
                        deps.cachePipeline
                    )

                    const target = buildedContents[0]?.response
                    if (!target) return

                    for (const { writePath, newContent } of target) {
                        const updatedTextFile = await deps.io.writer.write({
                            data: newContent,
                            filePath: writePath,
                        })

                        if (!updatedTextFile.success) {
                            deps.logger.error(
                                `Failed to modify contents at ${writePath}`
                            )
                        }
                    }

                    return target.map(({ writePath }) => writePath)
                },
                cleanup: async (job) => {
                    await plugin.cleanup?.(job)
                },
            })
        }

        await this.$jobManager.processJobs()

        return this.history
    }
}
