import { BuildSystem, type Node } from '@blogger/build_system'

export interface ObsidianBloggerBuildSystemConfig {
    originPath: string
    buildContentsPath: string
    buildAssetsPath: string
}

export class ObsidianBloggerBuildSystem extends BuildSystem {
    public constructor(
        public readonly config: ObsidianBloggerBuildSystemConfig
    ) {
        super({
            parser: {
                rootFolder: config.originPath,
            },
            builder: {
                buildPath: {
                    assets: config.buildAssetsPath,
                    contents: config.buildContentsPath,
                },
                pathGenerator: {
                    contents: async (node) => {
                        return ObsidianBloggerBuildSystem.generateContentsPath(
                            node,
                            config.originPath
                        )
                    },
                    assets: async () => {
                        return ''
                    },
                },
            },
            shell: {
                maxTraceCount: 10,
            },
        })
    }

    public static generateContentsPath(node: Node.FTreeNode, rootPath: string) {
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
            node: Node.FTreeNode
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
}
