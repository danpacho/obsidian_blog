import { IO as IOManager } from '@obsidian_blogger/helpers'
import { describe, expect, it } from 'vitest'
import { FileTreeParser } from './parser'

describe('FileTreeParser', () => {
    const parser = new FileTreeParser({
        io: new IOManager(),
        rootFolder: '$$tree$$',
    })

    it('should generate a file tree', async () => {
        const fileTree = await parser.parse()
        expect(fileTree.label).toStrictEqual('ROOT')
    })

    it('should walk a file tree by DFS', async () => {
        const names: Array<string> = []
        await parser.walk(
            async (node) => {
                names.push(node.fileName)
            },
            {
                type: 'DFS',
                skipFolderNode: false,
            }
        )

        expect(names).toStrictEqual([
            '$$tree$$',
            'sub1',
            'sub1_1',
            '1_1.txt',
            'sub1_2',
            '1_2.txt',
            'sub2',
            'sub2_1',
            'sub2_1_1',
            '2_1_1.txt',
            'sub3',
            'sub3_1',
            '3_1.txt',
        ])
    })

    it('should walk a file tree by BFS', async () => {
        const names: Array<string> = []
        await parser.walk(
            async (node) => {
                names.push(node.fileName)
            },
            {
                type: 'BFS',
                skipFolderNode: false,
            }
        )

        expect(names).toStrictEqual([
            '$$tree$$',
            'sub1',
            'sub2',
            'sub3',
            'sub1_1',
            'sub1_2',
            'sub2_1',
            'sub3_1',
            '1_1.txt',
            '1_2.txt',
            'sub2_1_1',
            '3_1.txt',
            '2_1_1.txt',
        ])
    })

    const parserWithSyntax = new FileTreeParser({
        io: new IOManager(),
        rootFolder: '$$tree$$',
        treeSyntax: {
            fileNameMatcher: ({ name }) => {
                const validFileNames = /[a-zA-Z0-9-_]/
                return validFileNames.test(name)
            },
            folderNameMatcher: ({ depth, name }) => {
                return depth < 2 && name !== 'sub3'
            },
        },
    })

    it('should walk a file tree based on tree_syntax by DFS', async () => {
        const fileTree = await parserWithSyntax.parse()
        expect(fileTree).toBeDefined()

        const names: Array<string> = []
        await parserWithSyntax.walk(
            async (node) => {
                names.push(node.fileName)
            },
            {
                type: 'BFS',
                skipFolderNode: false,
            }
        )

        expect(names).toStrictEqual(['$$tree$$', 'sub1', 'sub2'])
    })

    it('should walk a file tree based on tree_syntax by BFS', async () => {
        const fileTree = await parserWithSyntax.parse()
        expect(fileTree).toBeDefined()
        const names: Array<string> = []
        await parserWithSyntax.walk(
            async (node) => {
                names.push(node.fileName)
            },
            {
                type: 'DFS',
                skipFolderNode: false,
            }
        )
        expect(names).toStrictEqual(['$$tree$$', 'sub1', 'sub2'])
    })
})
