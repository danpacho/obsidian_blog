import { Runner } from '@obsidian_blogger/helpers/plugin'
import type { FileTreeNode, FileTreeParser } from '../parser'
import type { BuildStoreList } from './core'
import type {
    BuildContentsPlugin,
    BuildContentsPluginDependencies,
    BuildContentsPluginStaticConfig,
    BuildTreePlugin,
    BuildTreePluginDynamicConfig,
    BuildTreePluginStaticConfig,
    WalkTreePlugin,
    WalkTreePluginDynamicConfig,
    WalkTreePluginStaticConfig,
} from './plugin'
import type {
    BuildPluginDependencies,
    BuildPluginDynamicConfig,
} from './plugin/build.plugin'

export class BuildTreePluginRunner extends Runner.PluginRunner<BuildTreePlugin> {
    public async run(
        pluginPipes: BuildTreePlugin<
            BuildTreePluginStaticConfig,
            BuildTreePluginDynamicConfig
        >[],
        context: {
            parser: FileTreeParser
            walkRoot?: FileTreeNode
        } & BuildPluginDependencies
    ): Promise<this['history']> {
        for (const plugin of pluginPipes) {
            this.$jobManager.registerJob({
                name: plugin.name,
                prepare: async () => {
                    plugin.injectDependencies(context)
                },
                execute: async (controller) => {
                    return await plugin.execute(controller, context)
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

export class WalkTreePluginRunner extends Runner.PluginRunner<WalkTreePlugin> {
    public async run(
        pluginPipes: WalkTreePlugin<
            WalkTreePluginStaticConfig,
            WalkTreePluginDynamicConfig
        >[],
        context: {
            parser: FileTreeParser
            walkRoot?: FileTreeNode
        } & BuildPluginDependencies
    ): Promise<this['history']> {
        for (const plugin of pluginPipes) {
            this.$jobManager.registerJob({
                name: plugin.name,
                prepare: async () => {
                    plugin.injectDependencies(context)
                },
                execute: async (controller) => {
                    return await plugin.execute(controller, context)
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

export class BuildContentsPluginRunner extends Runner.PluginRunner<BuildContentsPlugin> {
    public async run(
        pluginPipes: BuildContentsPlugin<
            BuildContentsPluginStaticConfig,
            BuildPluginDynamicConfig
        >[],
        context: {
            buildStoreList: BuildStoreList
        } & BuildContentsPluginDependencies
    ): Promise<this['history']> {
        for (const plugin of pluginPipes) {
            this.$jobManager.registerJob({
                name: plugin.name,
                prepare: async () => {
                    plugin.injectDependencies(context)
                },
                execute: async (controller) => {
                    return await plugin.execute(controller, {
                        buildStore: context.buildStoreList,
                    })
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
