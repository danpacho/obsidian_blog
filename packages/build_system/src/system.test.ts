import { describe, expect, it } from 'vitest'
import { FTreeNode } from './parser/node'
import { System } from './system'

describe('BuildSystem', async () => {
    const pathGen = (node: FTreeNode, rootPath: string) => {
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
            node: FTreeNode
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

    const system = new System({
        builder: {
            buildPath: {
                contents: `${process.cwd()}/packages/build_system/src/__tests__/dist/contents`,
                assets: `${process.cwd()}/packages/build_system/src/__tests__/dist/assets`,
            },
            pathGenerator: {
                contents: async (node) => {
                    const path =
                        `${process.cwd()}/packages/build_system/src/__tests__/__mocks__/$$blog$$` as const
                    // '/Users/june/Documents/obsidian_june'
                    // '/Users/june/Documents/obsidian_june'
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
            'build:origin:tree': [],
            'walk:generated:tree': [],
            'build:contents': [],
        })
    })

    it('should build', async () => {
        expect(system.build).toBeDefined()
        await system.build()
    })
})
