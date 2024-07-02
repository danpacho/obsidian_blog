import { type BuilderPlugin } from '@obsidian_blogger/build_system'
/* eslint-disable @typescript-eslint/no-unused-vars */

// -------------------------------------------------------------- //
// --------------------- Contents Plugin ------------------------ //
// -------------------------------------------------------------- //

interface ExampleContentsPluginConfig {
    // Add your configuration here
    option1: string
    option2: number
}

export const ExampleContentsPlugin = (
    config: ExampleContentsPluginConfig
): BuilderPlugin['build:contents'] => {
    const { option1, option2 } = config

    return async ({
        buildPath,
        io,
        logger,
        meta,
        pathGenerator,
        processor,
        disableCorePlugins,
    }) => {
        return {
            name: 'ExampleContentsPlugin',
            disableCache: false,
            modifier: async ({ buildStore }) => {
                return [
                    {
                        content: 'Hello World',
                        writePath: 'hello-world.md',
                    },
                ]
            },
        }
    }
}
