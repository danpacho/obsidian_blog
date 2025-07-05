import path from 'node:path'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { IO } from '../io'

describe('IO Manager', () => {
    const io = new IO()
    const basePath = `${process.cwd()}/packages/helpers/src/io/__tests__/__fixtures__`
    // All tests will run inside a dedicated temporary directory
    const tempDir = path.join(__dirname, '__test_temp__')
    const fromDir = path.join(tempDir, 'from')
    const toDir = path.join(tempDir, 'to')

    // Create the main temporary directory once before all tests
    beforeAll(async () => {
        await io.writer.createDirectory(tempDir)
    })

    // Clean up the temporary directory after all tests are done
    afterAll(async () => {
        await io.writer.deleteDirectory(tempDir)
    })

    // Before each test, clean and set up the `from` and `to` directories
    beforeEach(async () => {
        await io.writer.deleteDirectory(fromDir)
        await io.writer.deleteDirectory(toDir)
        await io.writer.createDirectory(fromDir)
        await io.writer.createDirectory(toDir)
    })

    describe('File Write and Read Operations', () => {
        it('should write and read a text file', async () => {
            const filePath = path.join(fromDir, 'text.txt')
            const content = `Hello World at ${new Date().toISOString()}`

            await io.writer.write({ filePath, data: content })
            const res = await io.reader.readFile(filePath)

            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data).toBe(content)
            }
        })

        it('should append content to an existing file', async () => {
            const filePath = path.join(fromDir, 'append.txt')
            await io.writer.write({ filePath, data: 'Line 1.' })
            await io.writer.append({ filePath, data: ' Line 2.' })

            const res = await io.reader.readFile(filePath)
            expect(res.success).toBe(true)
            if (res.success) {
                expect(res.data).toBe('Line 1. Line 2.')
            }
        })
    })

    describe('cpDirectory', () => {
        it('should recursively copy a directory with nested files and directories', async () => {
            // Setup a nested structure
            await io.writer.write({
                filePath: path.join(fromDir, 'root.txt'),
                data: 'root',
            })
            await io.writer.write({
                filePath: path.join(fromDir, 'level1', 'level2', 'deep.txt'),
                data: 'deep',
            })

            const cp = await io.cpDirectory({ from: fromDir, to: toDir })
            expect(cp.success).toBe(true)

            // Verify the structure and content in the destination
            const rootCopied = await io.reader.checkExists(
                path.join(toDir, 'root.txt')
            )
            const deepCopied = await io.reader.checkExists(
                path.join(toDir, 'level1', 'level2', 'deep.txt')
            )
            const deepContent = await io.reader.readFile(
                path.join(toDir, 'level1', 'level2', 'deep.txt')
            )

            expect(rootCopied).toBe(true)
            expect(deepCopied).toBe(true)
            if (deepContent.success) {
                expect(deepContent.data).toBe('deep')
            }
        })

        it('should fail when trying to copy a directory into itself', async () => {
            const nestedToDir = path.join(fromDir, 'nested')
            const cp = await io.cpDirectory({ from: fromDir, to: nestedToDir })
            expect(cp.success).toBe(false)
            if (!cp.success) {
                expect(cp.error).toBeInstanceOf(Error)
                if (cp.error instanceof Error) {
                    expect(cp.error.message).toContain(
                        'Cannot copy a directory into itself'
                    )
                }
            }
        })
    })

    describe('cpFileStream', () => {
        it('should copy file stream [image]', async () => {
            const from = `${process.cwd()}/packages/helpers/src/io/__tests__/data/large.jpg`
            const to = `${basePath}/@cp_stream/large.jpg`

            const cp = await io.cpFileStream({ from, to })

            // This is the correct way to test the new, safe implementation
            expect(cp.success).toBe(true)

            // You can optionally verify that data is undefined
            if (cp.success) {
                expect(cp.data).toBe(undefined)
            }

            // You can also add a check to see if the file was actually created
            const fileExists = await io.reader.checkExists(to)
            expect(fileExists).toBe(true)
        })

        it('should copy file stream [mp4]', async () => {
            const from = `${process.cwd()}/packages/helpers/src/io/__tests__/data/large.mp4`
            const to = `${basePath}/@cp_stream/large.mp4`

            const cp = await io.cpFileStream({
                from,
                to,
            })
            expect(cp.success).toBe(true)
            // You can also add a check to see if the file was actually created
            const fileExists = await io.reader.checkExists(to)
            expect(fileExists).toBe(true)
        })

        it('should copy file stream [pdf]', async () => {
            const from = `${process.cwd()}/packages/helpers/src/io/__tests__/data/large.pdf`
            const to = `${basePath}/@cp_stream/large.pdf`

            const cp = await io.cpFileStream({
                from,
                to,
            })
            expect(cp.success).toBe(true)
            // You can also add a check to see if the file was actually created
            const fileExists = await io.reader.checkExists(to)
            expect(fileExists).toBe(true)
        })

        it('should copy a large [10MB = 10*1024*1024] file efficiently using streams', async () => {
            const fromPath = path.join(fromDir, 'large_file.bin')
            const toPath = path.join(toDir, 'large_file_copy.bin')
            // Create a dummy large file
            await io.writer.write({
                filePath: fromPath,
                data: Buffer.alloc(1024 * 1024 * 10), // 10 MB
            })

            const cp = await io.cpFileStream({ from: fromPath, to: toPath })
            expect(cp.success).toBe(true)

            const stats = await io.reader.getSize(toPath)
            expect(stats).toBe(1024 * 1024 * 10)
        })
    })

    describe('cpFile', () => {
        it('should copy a text file', async () => {
            const fromPath = path.join(fromDir, 'original.txt')
            const toPath = path.join(toDir, 'copied.txt')
            await io.writer.write({ filePath: fromPath, data: 'test content' })

            const cp = await io.cpFile({
                from: fromPath,
                to: toPath,
                type: 'text',
            })
            expect(cp.success).toBe(true)

            const content = await io.reader.readFile(toPath)
            if (content.success) {
                expect(content.data).toBe('test content')
            }
        })
    })

    describe('moveFile', () => {
        it('should move a file to a new location', async () => {
            const fromPath = path.join(fromDir, 'file.txt')
            const toPath = path.join(toDir, 'moved_file.txt')
            await io.writer.write({ filePath: fromPath, data: 'move me' })

            const mv = await io.moveFile({ from: fromPath, to: toPath })
            expect(mv.success).toBe(true)

            const originalExists = await io.reader.checkExists(fromPath)
            const newExists = await io.reader.checkExists(toPath)
            expect(originalExists).toBe(false)
            expect(newExists).toBe(true)
        })

        it('should move a file and overwrite an existing file at the destination', async () => {
            const fromPath = path.join(fromDir, 'source.txt')
            const toPath = path.join(toDir, 'target.txt')
            await io.writer.write({ filePath: fromPath, data: 'new content' })
            await io.writer.write({ filePath: toPath, data: 'old content' })

            const mv = await io.moveFile({ from: fromPath, to: toPath })
            expect(mv.success).toBe(true)

            const finalContent = await io.reader.readFile(toPath)
            if (finalContent.success) {
                expect(finalContent.data).toBe('new content')
            }
        })
    })

    describe('moveDirectory', () => {
        it('should move a directory to a new, empty location', async () => {
            await io.writer.write({
                filePath: path.join(fromDir, 'file.txt'),
                data: 'content',
            })

            const mv = await io.moveDirectory({ from: fromDir, to: toDir })
            expect(mv.success).toBe(true)

            const originalExists = await io.reader.checkExists(fromDir)
            const newFileExists = await io.reader.checkExists(
                path.join(toDir, 'file.txt')
            )
            expect(originalExists).toBe(false)
            expect(newFileExists).toBe(true)
        })

        it('should MERGE a directory into a destination that already contains files', async () => {
            // Source directory
            await io.writer.write({
                filePath: path.join(fromDir, 'fileA.txt'),
                data: 'A',
            })
            await io.writer.write({
                filePath: path.join(fromDir, 'common.txt'),
                data: 'from source',
            })

            // Destination directory with pre-existing and common files
            await io.writer.write({
                filePath: path.join(toDir, 'fileB.txt'),
                data: 'B',
            })
            await io.writer.write({
                filePath: path.join(toDir, 'common.txt'),
                data: 'from destination',
            })

            const mv = await io.moveDirectory({ from: fromDir, to: toDir })
            expect(mv.success).toBe(true)

            // Verify merge results
            const originalSourceExists = await io.reader.checkExists(fromDir)
            const fileA = await io.reader.readFile(
                path.join(toDir, 'fileA.txt')
            )
            const fileB = await io.reader.readFile(
                path.join(toDir, 'fileB.txt')
            )
            const common = await io.reader.readFile(
                path.join(toDir, 'common.txt')
            )

            expect(originalSourceExists).toBe(false) // Original is gone
            if (fileA.success) expect(fileA.data).toBe('A') // New file is present
            if (fileB.success) expect(fileB.data).toBe('B') // Old file is still present
            if (common.success) expect(common.data).toBe('from source') // Common file is overwritten
        })
    })

    describe('deleteDirectory', () => {
        it('should delete a directory and all its contents', async () => {
            const nestedFilePath = path.join(fromDir, 'level1', 'file.txt')
            await io.writer.write({
                filePath: nestedFilePath,
                data: 'delete me',
            })

            const del = await io.writer.deleteDirectory(fromDir)
            expect(del.success).toBe(true)

            const directoryExists = await io.reader.checkExists(fromDir)
            expect(directoryExists).toBe(false)
        })

        it('should succeed even if the directory does not exist (idempotency)', async () => {
            const nonExistentPath = path.join(tempDir, 'non-existent-directory')
            const del = await io.writer.deleteDirectory(nonExistentPath)
            expect(del.success).toBe(true)
        })
    })
})
