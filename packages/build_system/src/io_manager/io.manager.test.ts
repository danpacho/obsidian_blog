import { describe, expect, it } from 'vitest'
import { m } from '../utils/logger'
import { IOManager } from './io.manager'

describe('IOManager', () => {
    const io = new IOManager()
    const basePath = `${process.cwd()}/packages/contents_builder/src/io_manager/__mocks__`

    it('should WRITE file', async () => {
        const res = await io.writer.write({
            data: 'hello world',
            filePath: `${basePath}/@test_2/test_markdown.md`,
        })
        expect(res.success).toBe(true)
    })

    it('should MOVE folder', async () => {
        const cp = await io.moveFolder({
            from: `${basePath}/@test_2`,
            to: `${basePath}/@move`,
        })
        const cpTwo = await io.moveFolder({
            from: `${basePath}/@move`,
            to: `${basePath}/@test_2`,
        })
        expect(cp.success).toBe(true)
        expect(cpTwo.success).toBe(true)
    })

    it('should MOVE file', async () => {
        await io.writer.write({
            data: 'move target file',
            filePath: `${basePath}/@test/moved_file.md`,
        })
        const cp = await io.moveFile({
            from: `${basePath}/@test/moved_file.md`,
            to: `${basePath}/@move/moved_file.md`,
        })
        expect(cp.success).toBe(true)
    })

    it('should COPY & PASTE single file', async () => {
        await io.writer.write({
            data: 'hello world',
            filePath: `${basePath}/@test/test_markdown.md`,
        })
        const cp = await io.cpFile({
            from: `${basePath}/@test/test_markdown.md`,
            to: `${basePath}/@cp_pasted/test2.md`,
        })
        expect(cp.success).toBe(true)
        if (cp.success) {
            expect(cp.data).toBe('hello world')
        }
    })

    it('should COPY & PASTE folder', async () => {
        const cp = await io.cpFolder({
            from: `${basePath}/@test`,
            to: `${basePath}/@cp_pasted_folder`,
        })
        expect(cp.success).toBe(true)
    })

    it('should COPY & PASTE folder with files', async () => {
        await io.writer.write({
            data: 'hello world2',
            filePath: `${basePath}/@test/@sub/test_markdown2.md`,
        })
        await io.writer.write({
            data: 'hello world3',
            filePath: `${basePath}/@test/@sub/@sub_two/test_markdown3.md`,
        })
        const cp = await io.cpFolder({
            from: `${basePath}/@test`,
            to: `${basePath}/@cp_pasted_folder_with_files`,
        })
        expect(cp.success).toBe(true)
    })

    it('should DELETE root folder - cleanup mocks', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))

        const res = await io.writer.deleteFolder__FORCE(`${basePath}`)
        expect(res.success).toBe(true)

        m.success('IOManager - cleanup')
    })

    it('should FIND file path', async () => {
        const res = await io.finder.findFile('@test/test_markdown.md')
        expect(res.success).toBe(true)
        if (res.success) {
            // removed, so there is no matching file list
            expect(res.data).toStrictEqual([])
        }
    })
})
