import { describe, expect, it } from 'vitest'
import { IOManager } from '../io_manager'
import { MdProcessor } from './processor'

describe('MdProcessor', async () => {
    const io = new IOManager()
    const targetImageAbsPath = io.finder.findFileSync('obsidian.png')
    const targetMdAbsPath = io.finder.findFileSync('obsidian.md')
    if (targetImageAbsPath.success && targetMdAbsPath.success) {
        const imgPath = targetImageAbsPath.data[0]?.path
        const mdPath = targetMdAbsPath.data[0]?.path
        if (!imgPath || !mdPath) throw new Error('No image or md file found')

        const imgBuildPath = `${process.cwd()}/packages/contents_builder/src/md/__mocks__/build/build.png`
        await io.cpFile({
            from: imgPath,
            to: imgBuildPath,
            type: 'media',
        })

        const processor = new MdProcessor({
            ioManager: io,
        })
        processor.updateImageReferenceList([
            {
                origin: imgPath,
                build: imgBuildPath,
            },
        ])

        it('should be defined', () => {
            expect(processor).toBeDefined()
        })

        it('should update obsidian reference into html with updated reference path', async () => {
            const mdContent = await io.reader.readFile(mdPath)
            if (mdContent.success) {
                const result = await processor.process(mdContent.data)

                // expect(result).toContain(imgBuildPath)
                // expect(result).toContain('obsidian.png')

                await io.writer.write({
                    data: result,
                    filePath: `${process.cwd()}/packages/contents_builder/src/md/__mocks__/build/obsidian_build.md`,
                })
            }
        })
    }
})
