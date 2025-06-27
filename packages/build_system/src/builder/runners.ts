import { Runner } from '@obsidian_blogger/plugin_api'

import type {
    BuildContentsPlugin,
    BuildContentsPluginDependencies,
    BuildContentsPluginStaticConfig,
    BuildContentsUpdateInformation,
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
    ) {
        for (const plugin of pluginPipes) {
            this.$pluginRunner.registerJob({
                name: plugin.name,
                prepare: async () => {
                    plugin.injectDependencies(deps)
                    await plugin.prepare?.()
                },
                execute: async (controller) => {
                    return await plugin.execute(controller, deps.cachePipeline)
                },
                cleanup: async (job) => {
                    for (const res of job.response ?? []) {
                        await plugin.cleanup?.(res)
                    }
                },
            })
        }

        await this.$pluginRunner.processJobs()

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
            this.$pluginRunner.registerJob({
                name: plugin.name,
                prepare: async () => {
                    plugin.injectDependencies(deps)
                    await plugin.prepare?.()
                },
                execute: async (controller) => {
                    const res = await plugin.execute(
                        controller,
                        deps.cachePipeline
                    )
                    return res
                },
                cleanup: async (job) => {
                    for (const res of job.response ?? []) {
                        await plugin.cleanup?.(res)
                    }
                },
            })
        }

        await this.$pluginRunner.processJobs()

        return this.history
    }
}

export class BuildContentsPluginRunner extends Runner.PluginRunner<
    BuildContentsPlugin,
    BuildContentsPluginDependencies
> {
    private async write(
        buildContentsInformationList: BuildContentsUpdateInformation[],
        deps: BuildContentsPluginDependencies
    ): Promise<void> {
        const {
            io: { writer },
            logger,
        } = deps

        // 1) Flatten all of your per-file write‐jobs into a single array of Promises
        const writeTasks: Promise<void>[] = buildContentsInformationList
            .flat()
            .map(async ({ writePath, newContent }) => {
                try {
                    const result = await writer.write({
                        data: newContent,
                        filePath: writePath,
                    })

                    if (!result.success) {
                        logger.error(
                            `Failed to modify contents at ${writePath}`
                        )
                    }
                } catch (err) {
                    // catch any unexpected writer errors (e.g. FS exceptions)
                    logger.error(
                        `Error writing contents at ${writePath}: ${
                            (err as Error).message
                        }`,
                        err
                    )
                }
            })

        // 2) Await them all in parallel
        await Promise.all(writeTasks)
    }

    public async run(
        pluginPipes: BuildContentsPlugin<
            BuildContentsPluginStaticConfig,
            BuildPluginDynamicConfig
        >[],
        deps: BuildContentsPluginDependencies
    ) {
        for (const plugin of pluginPipes) {
            this.$pluginRunner.registerJob({
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

                    const buildContentsInformationList = buildedContents
                        .map((e) => e.response?.contentsUpdateInfo)
                        .filter((e) => e !== undefined)

                    if (buildContentsInformationList.length !== 0) {
                        await this.write(buildContentsInformationList, deps)
                    }

                    return buildedContents
                },
                cleanup: async (job) => {
                    for (const res of job.response ?? []) {
                        await plugin.cleanup?.(res)
                    }
                },
            })
        }

        await this.$pluginRunner.processJobs()

        return this.history
    }
}
