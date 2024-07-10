import { describe, expect, it } from 'vitest'
import { FileTreeNode } from './parser/node'
import { BuildSystem, CorePlugins } from './index'

describe('BuildSystem', async () => {
    const pathGen = (node: FileTreeNode, rootPath: string) => {
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
            node: FileTreeNode
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

    const system = new BuildSystem({
        builder: {
            buildPath: {
                contents: `${process.cwd()}/packages/build_system/src/__tests__/dist/contents`,
                assets: `${process.cwd()}/packages/build_system/src/__tests__/dist/assets`,
            },
            pathGenerator: {
                contents: async (node) => {
                    const path =
                        `${process.cwd()}/packages/build_system/src/__tests__/__mocks__/$$blog$$` as const
                    return pathGen(node, path)
                },
                assets: async () => '',
            },
        },
        parser: {
            rootFolder: '$$blog$$',
            // rootFolder: '/Users/june/Documents/obsidian_june',
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

    it('should pass', () => {
        expect(system).toBeDefined()
    })

    it('should use plugin', () => {
        system.use({
            'build:tree': [],
            'walk:tree': [
                new CorePlugins.MetaValidatorPlugin(),
                new CorePlugins.MetaBuilderPlugin(),
                new CorePlugins.StaticParamBuilderPlugin(),
                new CorePlugins.PaginationBuilderPlugin(),
                new CorePlugins.SeriesInfoGeneratorPlugin(),
                new CorePlugins.CategoryDescriptionGeneratorPlugin(),
            ],
            'build:contents': [new CorePlugins.ObsidianReferencePlugin()],
        })
    })

    it('should build', async () => {
        expect(system.build).toBeDefined()
        const report = await system.build()
        expect(report).toBeDefined()
    })
})
