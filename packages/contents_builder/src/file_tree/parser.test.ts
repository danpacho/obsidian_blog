import { describe, expect, it } from 'vitest'
import { IOManager } from '../io_manager'
import { FileTreeParser } from './parser'

describe('FileTreeParser', async () => {
    const parser = await FileTreeParser.create({
        ioManager: new IOManager(),
        rootFolder: '$$blog$$',
    })

    it('should CREATE a new instance of FileTreeAnalyzer via static method', () => {
        expect(parser).toBeDefined()
    })

    it('should RETURN a file tree', async () => {
        const fileTree = await parser.parse()
        expect(fileTree).toBeDefined()
        expect(fileTree).toMatchSnapshot()
    })

    const parserWithSyntax = await FileTreeParser.create({
        ioManager: new IOManager(),
        rootFolder: '$$blog$$',
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

    it('should RETURN a file tree based on tree_syntax', async () => {
        const fileTree = await parserWithSyntax.parse()
        expect(fileTree).toBeDefined()
        expect(fileTree).toMatchSnapshot()
    })

    it('should WALK through the file tree', async () => {
        const fileTree = await parserWithSyntax.parse()
        await parserWithSyntax.walkAST(
            fileTree.children,
            async (node) => {
                node.fileName = ''

                expect(node.fileName).toBe('')
                expect(node.absolutePath).toBeDefined()
            },
            true
        )
    })
})
