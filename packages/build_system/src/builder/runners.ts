import { Runner } from '@obsidian_blogger/plugin_api'

import type {
    BuildContentsPlugin,
    BuildContentsPluginDependencies,
    BuildContentsPluginStaticConfig,
    BuildContentsUpdateInformation,
    BuildTreePlugin,
    BuildTreePluginDependencies,
    WalkTreePlugin,
    WalkTreePluginDependencies,
} from './plugin'
import type {
    BuildPluginDynamicConfig,
    BuildPluginResponse,
} from './plugin/build.plugin'
import type { Job } from '@obsidian_blogger/helpers/job'

export class BuildTreePluginRunner extends Runner.PluginRunner<
    BuildTreePlugin,
    BuildTreePluginDependencies
> {}

export class WalkTreePluginRunner extends Runner.PluginRunner<
    WalkTreePlugin,
    WalkTreePluginDependencies
> {}

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

    protected override async pluginCleanupAll(
        _: BuildContentsPlugin<
            BuildContentsPluginStaticConfig,
            BuildPluginDynamicConfig
        >,
        dependencies: BuildContentsPluginDependencies,
        response: Job<
            BuildPluginResponse & {
                contentsUpdateInfo: BuildContentsUpdateInformation
            }
        >[]
    ): Promise<void> {
        // update
        const buildContentsInformationList = response
            .map((e) => e.response?.contentsUpdateInfo)
            .filter((e) => e !== undefined)

        if (buildContentsInformationList.length !== 0) {
            await this.write(buildContentsInformationList, dependencies)
        }
    }
}
