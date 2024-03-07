import { t } from '@metal-box/type'
import { describe, expect, it } from 'vitest'
import { IOManager } from '../io_manager'
import { MetaManager } from './manager'

describe('MetaManager', () => {
    const io = new IOManager()
    const Meta = t
        .object({
            title: t.string,
            date: t.date,
        })
        .transform((meta) => ({
            ...meta,
            date: new Date(meta.date),
        }))

    const manager = new MetaManager({
        ioManager: io,
        parser: Meta.parse,
        generator: (meta) => ({
            date: new Date(),
            title: 'Hello World',
            ...meta,
        }),
    })

    const innerContent = `# Inner contents\n- yes` as const
    const pureMdString =
        `---\ntitle: Test title\ndate: 2024-03-01\n---${innerContent}` as const
    const expectedTransformedString =
        `---\ntitle: Test title\ndate: 2024-03-01T00:00:00.000Z\n---\n${innerContent}\n` as const

    it('should define manager with custom parser and generator', async () => {
        expect(manager).toBeDefined()
    })
    it('should include <gray-matter> methods', () => {
        expect(manager.test(pureMdString)).toBe(true)

        const readResult = manager.read(pureMdString)
        expect(manager.read(pureMdString)).toEqual({
            meta: {
                title: 'Test title',
                date: new Date('2024-03-01'),
            },
            content: '# Inner contents\n- yes',
        })

        const stringified = manager.stringify(readResult)
        expect(stringified).toBe(expectedTransformedString)
    })

    it('should extract meta from md string', () => {
        const extractedMeta = manager.extractFromMd(pureMdString)
        expect(extractedMeta.success).toBe(true)
        if (extractedMeta.success) {
            expect(extractedMeta.data).toEqual({
                meta: {
                    title: 'Test title',
                    date: new Date('2024-03-01'),
                },
                content: innerContent,
            })
        }
    })

    it('should extract meta from md file', async () => {
        const path = `${process.cwd()}/packages/contents_builder/src/meta/__mocks__/meta.filled.md`
        const extractedMeta = await manager.extractFromFile(path)
        expect(extractedMeta.success).toBe(true)
        if (extractedMeta.success) {
            expect(extractedMeta.data).toEqual({
                meta: {
                    title: 'Meta filled title',
                    date: new Date('2024-03-01'),
                },
                content: `\n# Meta filled title\n\nContents is here\n`,
            })
        }
    })

    it('should generate meta from invalid meta', () => {
        const invalidMeta = {
            date: '2024-03-01',
        }
        const generated = manager.generate(invalidMeta)
        expect(generated).toEqual({
            title: 'Hello World',
            date: '2024-03-01',
        })
    })

    it('should validate meta', () => {
        const validMeta = {
            title: 'Hello World',
            date: new Date('2024-03-01'),
        }
        const validated = manager.parse(validMeta)
        expect(validated).toEqual(validMeta)
    })

    it('should inject meta to new file', async () => {
        const path = `${process.cwd()}/packages/contents_builder/src/meta/__mocks__/meta.injected.md`
        const metaData = {
            title: 'Hello World',
            date: new Date('2024-03-01'),
        }
        const injectionOption = {
            metaData: {
                meta: metaData,
                content: 'This is injected contents.',
            },
            injectPath: path,
        }
        const injected = await manager.inject(injectionOption)
        expect(injected.success).toBe(true)

        if (injected.success) {
            expect(injected.data).toEqual({
                ...injectionOption,
                injected: `---\ntitle: Hello World\ndate: 2024-03-01T00:00:00.000Z\n---\nThis is injected contents.\n`,
            })
        }
    })

    it('should inject meta to existing file', async () => {
        const path = `${process.cwd()}/packages/contents_builder/src/meta/__mocks__/meta.injected.md`
        const metaData = {
            title: 'New title ',
            date: new Date('2024-05-05'),
        }
        const injectionOption = {
            metaData: {
                meta: metaData,
                content: 'This is UPDATED injected contents.',
            },
            injectPath: path,
        }
        const injected = await manager.inject(injectionOption)
        expect(injected.success).toBe(true)
        if (injected.success) {
            expect(injected.data).toEqual({
                ...injectionOption,
                injected: `---\ntitle: 'New title '\ndate: 2024-05-05T00:00:00.000Z\n---\nThis is UPDATED injected contents.\n`,
            })
        }
    })

    it('should inject meta with invalid meta data', async () => {
        const path = `${process.cwd()}/packages/contents_builder/src/meta/__mocks__/meta.injected.md`
        const metaData = {
            date: '2024-05-05',
        }
        const injectionOption = {
            metaData: {
                meta: metaData,
                content: 'This is UPDATED invalid injected contents.',
            },
            injectPath: path,
        }
        const injected = await manager.inject(injectionOption)
        expect(injected.success).toBe(true)

        if (injected.success) {
            expect(injected.data).toEqual({
                ...injectionOption,
                injected: `---\ndate: '2024-05-05'\ntitle: Hello World\n---\nThis is UPDATED invalid injected contents.\n`,
            })
        }
    })
})
