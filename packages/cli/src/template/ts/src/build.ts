#!/usr/bin/env node
import {
    BuildSystem,
    CorePlugins,
    type Node,
} from '@obsidian_blogger/build_system'

const PathGenerator = (node: Node.FileTreeNode, rootPath: string) => {
    const analyzeFileName = (
        folderName?: string
    ): {
        type: 'route' | 'group' | 'series' | 'root'
        value: string
    } => {
        if (!folderName) {
            return {
                type: 'root',
                value: '',
            }
        }
        if (folderName.match(/^\[(.*?)\]$/)) {
            const matchedValue = folderName.slice(1, -1)
            return {
                type: 'route',
                value: matchedValue,
            }
        } else if (folderName.startsWith('@')) {
            const matchedValue = folderName.substring(1)
            return {
                type: 'series',
                value: matchedValue,
            }
        } else {
            return {
                type: 'group',
                value: folderName,
            }
        }
    }

    const getBuildRouteInfo = ({
        node,
        rootPath,
    }: {
        node: Node.FileTreeNode
        rootPath: string
    }): string => {
        const absPath = node.absolutePath
        const originPath = absPath.replace(rootPath, '')

        const buildFolderPath = originPath
            .split('/')
            .filter(Boolean)
            .slice(0, -1)
            .reduce<string>((buildPath, e) => {
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
        rootPath,
    })
}

const Builder = new BuildSystem({
    builder: {
        buildPath: {
            contents: '{{blog_contents_root}}',
            assets: '{{blog_assets_root}}',
        },
        pathGenerator: {
            contents: async (node) => {
                const rootPath = '{{obsidian_vault_root}}'
                return PathGenerator(node, rootPath)
            },
            assets: async () => '',
        },
    },
    parser: {
        rootFolder: '{{obsidian_vault_root}}',
        treeSyntax: {
            fileNameMatcher: ({ name, depth }) => {
                if (depth >= 6) return false
                const validFileNames = /[a-zA-Z0-9-_]/
                return validFileNames.test(name)
            },
            folderNameMatcher: ({ name, depth }) => {
                const startsWithAt = name.startsWith('@')
                if (startsWithAt) return true

                const first = name.at(0)
                const last = name.at(-1)
                if (first === '[' && last === ']') return depth < 3
                if (first === '{' && last === '}') return depth < 3

                return true
            },
        },
    },
})

const build = async () => {
    Builder.use({
        'build:tree': [],
        'walk:tree': [
            // CorePlugins. you can remove it and modify the plugins
            new CorePlugins.MetaValidatorPlugin(),
            new CorePlugins.MetaBuilderPlugin(),
            new CorePlugins.StaticParamBuilderPlugin(),
            new CorePlugins.PaginationBuilderPlugin(),
            new CorePlugins.SeriesInfoGeneratorPlugin(),
            new CorePlugins.CategoryDescriptionGeneratorPlugin(),
        ],
        'build:contents': [new CorePlugins.ObsidianReferencePlugin()],
    })
    const buildResult = await Builder.build()
    return buildResult
}

build()
