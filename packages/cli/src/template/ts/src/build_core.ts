#!/usr/bin/env node
import {
    BuildSystem,
    CorePlugins,
    type Node,
    type PathGenerator,
} from '@obsidian_blogger/build_system'
import { IO } from '@obsidian_blogger/helpers/io'

//==============================================================================
//                           Contents Path Generator                          //
//==============================================================================
const contentsPathGenerator: PathGenerator = async (node, buildTools) => {
    const analyzeFileName = (
        folderName?: string
    ): {
        type: 'route' | 'group' | 'series' | 'root'
        value: string
    } => {
        // empty -> root
        if (!folderName) {
            return {
                type: 'root',
                value: '',
            }
        }
        // [folderName] -> route
        if (folderName.match(/^\[(.*?)\]$/)) {
            const matchedValue = folderName.slice(1, -1)
            return {
                type: 'route',
                value: matchedValue,
            }
        }
        // @[folderName] -> series
        else if (folderName.startsWith('@')) {
            const matchedValue = folderName.substring(1)
            return {
                type: 'series',
                value: matchedValue,
            }
        }
        // folderName -> group
        else {
            return {
                type: 'group',
                value: folderName,
            }
        }
    }

    const io = new IO()

    const getBuildRouteInfo = ({
        node,
        rootPath,
    }: {
        node: Node.FileTreeNode
        rootPath: string
    }): string => {
        const absPath = node.absolutePath
        const relativePath = absPath.replace(rootPath, '')

        const pathSegments = io.pathResolver
            .splitToPathSegments(relativePath)
            .slice(0, -1)

        const buildFolderPath = pathSegments.reduce<string>((buildPath, e) => {
            const { type, value } = analyzeFileName(e)
            switch (type) {
                case 'route': {
                    return `${buildPath}/${value}`
                }
                case 'group': {
                    return `${buildPath}/${value}`
                }
                case 'series': {
                    return buildPath
                }
                case 'root': {
                    return buildPath
                }
            }
        }, '')

        return buildFolderPath
    }

    return getBuildRouteInfo({
        node,
        rootPath: buildTools.vaultRoot,
    })
}

export const Builder = new BuildSystem({
    bridgeRoot: '{{bridge_install_root}}',
    vaultRoot: '{{obsidian_vault_root}}',
    buildPath: {
        contents: '{{blog_contents_root}}',
        assets: '{{blog_assets_root}}',
    },
    pathGenerator: {
        contents: async (node, buildTools) =>
            await contentsPathGenerator(node, buildTools),
    },
})
    //==============================================================================
    //                             Plugin Registration                            //
    //==============================================================================
    .use({
        'build:tree': [
            // CorePlugins. you can remove it and modify the plugins
            new CorePlugins.ExcludeDraftPlugin(),
        ],
        'walk:tree': [
            // CorePlugins. you can remove it and modify the plugins
            new CorePlugins.MetaValidatorPlugin(),
            new CorePlugins.MetaBuilderPlugin(),
            new CorePlugins.MetaImgPathMatcherPlugin(),
            new CorePlugins.StaticParamBuilderPlugin(),
            new CorePlugins.SeriesInfoGeneratorPlugin(),
            new CorePlugins.PaginationBuilderPlugin(),
            new CorePlugins.CategoryDescriptionGeneratorPlugin(),
        ],
        'build:contents': [
            // CorePlugins. you can remove it and modify the plugins
            new CorePlugins.ObsidianReferencePlugin(),
        ],
    })
