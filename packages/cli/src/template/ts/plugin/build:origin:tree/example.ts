import { type BuilderPlugin } from '@obsidian_blogger/build_system'
/* eslint-disable @typescript-eslint/no-unused-vars */

// -------------------------------------------------------------- //
// ------------------------ Tree Plugin ------------------------- //
// -------------------------------------------------------------- //

interface ExampleTreeBuilderPluginConfig {
    // Add your configuration here
    option1: string
    option2: number
}
export const ExampleTreeBuilder = (
    config: ExampleTreeBuilderPluginConfig
): BuilderPlugin['build:origin:tree'] => {
    const { option1, option2 } = config

    return async ({
        buildPath,
        io,
        logger,
        meta,
        pathGenerator,
        disableCorePlugins,
    }) => {
        return {
            name: 'ExampleTreeBuilder',
            disableCache: false,
            skipFolderNode: true,
            exclude: [],
            walker: async (node, i, children) => {},
        }
    }
}
