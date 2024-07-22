/* eslint-disable no-irregular-whitespace */
import { describe, expect, it } from 'vitest'
import { FilePathFinder, FileReader } from '../file.reader'

describe('FilePathFinder', () => {
    const filePathMatcher = new FilePathFinder()

    it('should MATCH file path', async () => {
        const res = await filePathMatcher.findFile('$$unique$$.md')
        if (res.success) {
            const searchedPathList = res.data.map((e) => e.path)
            expect(searchedPathList).toStrictEqual([])
        } else {
            expect(res.success).toBe(false)
        }
    })
})

describe('FileReader', () => {
    const reader = new FileReader()
    const finder = new FilePathFinder()

    const basePath = `${process.cwd()}/packages/helpers/src/io/__fixtures__`

    it('should READ file content', async () => {
        const filePath = await finder.findFile('test.md')
        const target = (filePath.success && filePath.data[0]?.path) || ''
        const file = await reader.readFile(target)

        if (file.success) {
            expect(file.data).toMatchSnapshot()
        } else {
            expect(file.success).toBe(false)
        }
    })

    it('should READ directory folder names', async () => {
        const folderNames = await reader.readDir(basePath)
        if (folderNames.success) {
            expect(folderNames.data).toMatchSnapshot()
        }

        const allFolderNames = await reader.readDir(basePath, undefined, {
            recursive: true,
        })
        if (allFolderNames.success) {
            expect(allFolderNames.data).toMatchSnapshot()
        }
    })
})
