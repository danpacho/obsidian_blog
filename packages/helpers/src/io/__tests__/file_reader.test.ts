import { describe, expect, it } from 'vitest'

import { FilePathFinder } from '../file_path_finder'
import { FileReader } from '../file_reader'
import { PathResolver } from '../path_resolver'

describe('FileReader', () => {
    const resolver = new PathResolver()
    const finder = new FilePathFinder(resolver)
    const reader = new FileReader(resolver)
    const basePath = resolver.normalize(
        `${process.cwd()}/packages/helpers/src/io/__fixtures__`
    )

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
        const folderNames = await reader.readDirectory(basePath)
        if (folderNames.success) {
            expect(folderNames.data).toMatchSnapshot()
        }

        const allFolderNames = await reader.readDirectory(basePath, undefined, {
            recursive: true,
            encoding: 'buffer',
        })
        if (allFolderNames.success) {
            expect(allFolderNames.data).toMatchSnapshot()
        }
    })
})
