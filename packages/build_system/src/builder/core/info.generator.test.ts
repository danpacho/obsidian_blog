import { FileReader, type IO } from '@obsidian_blogger/helpers'
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import { BuildInfoGenerator } from '.'

import type { BuildInfoGeneratorConstructor } from '.'
import type { FileTreeNode } from '../../parser/node'
import type { BuildPluginDependencies } from '../plugin/build.plugin'

describe('BuildInfoGenerator', () => {
    const UUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{44}$/

    let io: IO
    let fakeReader: IO['reader']
    let fakeContentsGen: Parameters<
        BuildInfoGeneratorConstructor['pathGenerator']['contents']
    >[0]
    let fakeAssetsGen: Parameters<
        Exclude<
            BuildInfoGeneratorConstructor['pathGenerator']['assets'],
            undefined
        >
    >[0]

    let options: {
        io: IO
        buildPath: { contents: string; assets: string }
        pathGenerator: {
            contents: typeof fakeContentsGen
            assets?: typeof fakeAssetsGen
        }
    }
    let generator: BuildInfoGenerator
    const buildTools = {} as BuildPluginDependencies

    //@ts-ignore
    const fakeContentNode = {
        absolutePath: '/src/content/file.md',
        fileName: 'file.md',
        fileExtension: 'md',
        category: 'TEXT_FILE',
    } as FileTreeNode

    const fakeAssetNode = {
        absolutePath: '/src/asset/img.png',
        fileName: 'img.png',
        fileExtension: 'png',
        category: 'IMAGE_FILE',
    } as FileTreeNode

    beforeEach(() => {
        // --- mock I/O reader ---
        fakeReader = {
            //@ts-ignore
            readFile: vi.fn(async () => ({
                success: true,
                data: 'fake file contents',
            })),
            //@ts-ignore
            readMedia: vi.fn(async () => ({
                success: true,
                data: Buffer.from('fake media'),
            })),
        }
        io = { reader: fakeReader } as IO

        // --- mock path generators ---
        //@ts-ignore
        fakeContentsGen = vi.fn(async () => 'my-route')
        //@ts-ignore
        fakeAssetsGen = vi.fn(async () => 'asset-route')

        options = {
            io,
            buildPath: {
                contents: '/build/contents',
                assets: '/build/assets',
            },
            pathGenerator: {
                contents: fakeContentsGen,
                assets: fakeAssetsGen,
            },
        }

        //@ts-ignore
        generator = new BuildInfoGenerator(options)

        // --- stub FileReader helpers to use simple basename logic ---
        vi.spyOn(FileReader, 'getFileName').mockImplementation((p: string) => {
            // strip dirs and extension
            const base = p.split(/[\\/]/).pop()!
            return base.split('.').slice(0, -1).join('.')
        })
        vi.spyOn(FileReader, 'getExtension').mockImplementation((p: string) => {
            return p.split('.').pop()!
        })
    })

    it('generates content build info correctly', async () => {
        const info = await generator.generateContentBuildInfo(
            fakeContentNode,
            buildTools
        )

        // 1) It read the right file
        expect(fakeReader.readFile).toHaveBeenCalledWith('/src/content/file.md')
        // 2) It invoked your "contents" path generator
        expect(fakeContentsGen).toHaveBeenCalledWith(
            fakeContentNode,
            buildTools
        )
        // 3) The build_path.build is a POSIX path
        expect(info.build_path.build).toBe('/build/contents/my-route/file.md')
        // 4) ID is 64 hex chars plus 4 hyphens (8-4-4-4-44 grouping)
        expect(info.id).toMatch(UUID)
    })

    it('throws if readFile fails', async () => {
        // make readFile return failure
        // @ts-ignore
        fakeReader.readFile = vi.fn(async () => ({ success: false, data: '' }))
        options.io = { reader: fakeReader } as IO

        // @ts-ignore
        generator = new BuildInfoGenerator(options)

        await expect(
            generator.generateContentBuildInfo(fakeContentNode, buildTools)
        ).rejects.toThrow('failed to read file at /src/content/file.md')
    })

    it('generates non-strict asset build info', async () => {
        const info = await generator.generateAssetBuildInfo(
            fakeAssetNode,
            buildTools
        )

        // 1) It did *not* call readMedia in non-strict
        expect(fakeReader.readMedia).not.toHaveBeenCalled()
        // 2) It invoked your "assets" path generator
        expect(fakeAssetsGen).toHaveBeenCalledWith(fakeAssetNode, buildTools)
        // 3) build_path.build starts with your assets prefix
        expect(info.build_path.build).toContain('/build/assets/images/')
        // 4) path includes the generated ID and asset-route and correct extension
        expect(info.build_path.build).toBe(
            `/build/assets/images/${info.id}_asset-route.png`
        )
        // 5) ID also matches the UUID pattern
        expect(info.id).toMatch(UUID)
    })

    it('generates strict asset build info even if readMedia fails', async () => {
        // force readMedia to fail
        // @ts-ignore
        fakeReader.readMedia = vi.fn(async () => ({
            success: false,
            data: null,
        }))
        options.io = { reader: fakeReader } as IO
        // @ts-ignore
        generator = new BuildInfoGenerator(options)

        const info = await generator.generateAssetBuildInfo(
            fakeAssetNode,
            buildTools,
            true
        )

        // it still called readMedia
        expect(fakeReader.readMedia).toHaveBeenCalledWith('/src/asset/img.png')
        // and still returns a valid ID
        expect(info.id).toMatch(UUID)
    })

    describe('getSafeRoutePath – Windows branch', () => {
        const originalPlatform = process.platform
        beforeAll(() => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
            })
        })
        afterAll(() => {
            Object.defineProperty(process, 'platform', {
                value: originalPlatform,
            })
        })

        it('keep window path format', () => {
            const rawRoute = 'alpha\\beta\\file.txt'
            // private method access via `any`
            const normalize = (generator as any).getSafeRoutePath.bind(
                generator
            )
            const first = normalize(rawRoute)
            expect(first).toBe('alpha\\beta\\file.txt')
        })

        it('keep window path format', () => {
            const rawRoute = 'C:\\Users\\alpha\\beta\\file.txt'
            // private method access via `any`
            const normalize = (generator as any).getSafeRoutePath.bind(
                generator
            )
            const first = normalize(rawRoute)
            expect(first).toBe('C:\\Users\\alpha\\beta\\file.txt')
        })

        it('appends a counter on duplicate paths', () => {
            const rawRoute = 'alpha\\beta\\file.txt'
            const normalize = (generator as any).getSafeRoutePath.bind(
                generator
            )

            // first call
            const first = normalize(rawRoute)
            expect(first).toBe('alpha\\beta\\file.txt')

            // second call should bump to _2
            const second = normalize(rawRoute)
            expect(second).toBe('alpha\\beta\\file_2.txt')

            // third call should bump to _3
            const third = normalize(rawRoute)
            expect(third).toBe('alpha\\beta\\file_3.txt')
        })
    })
})
