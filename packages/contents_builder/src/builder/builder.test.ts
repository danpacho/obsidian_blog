import { Logger } from '@blogger/logger'
import { describe, expect, it } from 'vitest'
import { IOManager } from '../io_manager'
import { FileTreeParser } from '../parser/parser'
import { FileBuilder } from './builder'
describe('FileTreeGenerator', async () => {
    const parser = await FileTreeParser.create({
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

    const builder = await FileBuilder.create({
        fileTreeParser: parser,
        ioManager: new IOManager(),
        logger: new Logger({
            name: 'Builder',
        }),
        buildPath: {
            content: `${process.cwd()}/packages/contents_builder/src/__tests__/dist/contents`,
            assets: `${process.cwd()}/packages/contents_builder/src/__tests__/dist/assets`,
        },
    })

    it('should pass', () => {
        expect(builder).toBeDefined()
    })

    it('should build', async () => {
        expect(builder.build).toBeDefined()
        await builder.build()
    })
})
