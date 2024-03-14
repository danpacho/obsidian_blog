import { Logger } from '@blogger/logger'
import { describe, expect, it } from 'vitest'
import { IOManager } from '../io_manager'
import { FTreeNode } from '../parser/node'
import { FileTreeParser } from '../parser/parser'
import { BuildSystem } from './core/system'
describe('FileTreeGenerator', async () => {
    const parser = new FileTreeParser({
        rootFolder: '$$blog$$',
        ioManager: new IOManager(),
        treeSyntax: {
            fileNameMatcher: ({ name, depth }) => {
                if (depth >= 6) return false
                const validFileNames = /[a-zA-Z0-9-_]/
                return validFileNames.test(name)
            },
            folderNameMatcher: ({ depth, name }) => {
                const startsWithAt = name.startsWith('@')
                if (startsWithAt) return true

                const first = name.at(0)
                const last = name.at(-1)
                if (first === '[' && last === ']') return depth < 3
                if (first === '{' && last === '}') return depth < 3

                return true
            },
        },
    })

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

    const builder = new BuildSystem({
        parser,
        io: new IOManager(),
        logger: new Logger({
            name: 'Builder',
        }),
        buildPath: {
            contents: `${process.cwd()}/packages/contents_builder/src/__tests__/dist/contents`,
            assets: `${process.cwd()}/packages/contents_builder/src/__tests__/dist/assets`,
        },
        pathGenerator: {
            contents: (node) => {
                const postGes = pathGen(node, parser.ast!.absolutePath)
                return postGes
            },
            assets: () => '',
        },
    })

    builder.use({
        'build:contents': [],
        'build:origin:tree': [],
        'walk:generated:tree': [],
    })

    it('should pass', () => {
        expect(builder).toBeDefined()
    })

    it('should build', async () => {
        expect(builder.build).toBeDefined()
        await builder.build()
    })
})
