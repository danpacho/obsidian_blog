import { describe, expect, it } from 'vitest'

import { FileWriter } from '../file_writer'
describe('FileWriter', () => {
    const writer = new FileWriter()
    const basePath = `${process.cwd()}/packages/helpers/src/io/__tests__/__fixtures__`
    const writingTargetExtension = ['md', 'txt', 'html', 'png', 'jpg'] as const

    it('should WRITE to a file root folder exists', async () => {
        for (const extension of writingTargetExtension) {
            const result = await writer.write({
                filePath: `${basePath}/test.${extension}`,
                data: 'hello world',
            })
            expect(result.success).toBe(true)
        }
    })

    it('should DELETE a file', async () => {
        for (const extension of writingTargetExtension) {
            const result = await writer.deleteFile(
                `${basePath}/test.${extension}`
            )
            expect(result.success).toBe(true)
        }
    })

    it('should CREATE a new folder', async () => {
        const result = await writer.createDirectory(`${basePath}/@created`)
        expect(result.success).toBe(true)
    })

    it('should DELETE a folder', async () => {
        const result = await writer.deleteDirectory(`${basePath}/@created`)
        expect(result.success).toBe(true)
    })

    it('should WRITE text to a file root folder does not exist', async () => {
        const result = await writer.write({
            filePath: `${basePath}/@test/test_markdown.md`,
            data: 'hello world',
        })
        expect(result.success).toBe(true)
    })

    it('should NOT_DELETE folder recursively', async () => {
        const result = await writer.deleteDirectory(`${basePath}/@test`)
        expect(result.success).toBe(true)
    })

    it('should DELETE file at target', async () => {
        const result = await writer.deleteFile(
            `${basePath}/@test/test_markdown.md`
        )
        expect(result.success).toBe(true)
    })

    it('should DELETE folder when folder is empty', async () => {
        const result = await writer.deleteDirectory(`${basePath}/@test`)
        expect(result.success).toBe(true)
    })

    it('should NOT_DELETE folder when folder is not empty', async () => {
        const folderCreation = await writer.createDirectory(`${basePath}/@test`)
        expect(folderCreation.success).toBe(true)
        const fileCreation = await writer.write({
            filePath: `${basePath}/@test/test_markdown.md`,
            data: 'hello world',
        })
        expect(fileCreation.success).toBe(true)
        const folderDeleteOperation = await writer.deleteDirectory(
            `${basePath}/@test`
        )
        expect(folderDeleteOperation.success).toBe(true)
    })

    it('should DELETE folder', async () => {
        const newFolder = await writer.createDirectory(
            `${basePath}/@WILL_DELETE`
        )
        expect(newFolder.success).toBe(true)
        const forceDeleteOperation = await writer.delete(
            `${basePath}/@WILL_DELETE`
        )
        expect(forceDeleteOperation.success).toBe(true)
    })
})
