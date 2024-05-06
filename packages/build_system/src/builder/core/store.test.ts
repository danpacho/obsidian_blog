import { UUID } from 'crypto'
import { IO as IOManager } from '@blogger/helpers'
import { describe, expect, it } from 'vitest'
import { BuildInformation, BuildStore } from './store'

describe('BuildStore', () => {
    const buildPath = {
        assets: '/path/to/assets',
        contents: '/path/to/contents',
    }
    const buildStore = new BuildStore({
        buildPath,
        io: new IOManager(),
    })

    const buildId: UUID =
        '6b172373-3f83-aed1-1dd1-a3c9ecc3c2656c6df2e66981c4c3c9414401dac958f2'

    const buildInformation: BuildInformation = {
        build_path: {
            build: '/path/to/build',
            origin: '/path/to/origin',
        },
        build_state: 'ADDED',
        created_at: new Date().toISOString(),
        file_name: 'file_name',
        file_type: 'TEXT_FILE',
        id: buildId,
    }

    it('should add build information to the store', () => {
        const result = buildStore.add(buildId, buildInformation)

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toBe(buildInformation)
            expect(buildStore.store.current.get(buildId)).toBe(buildInformation)
        }
    })

    it('should not add build information if build id already exists', () => {
        buildStore.store.current.set(buildId, buildInformation)

        const result = buildStore.add(buildId, buildInformation)

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error).toEqual(
                new Error(`build id ${buildId} already exists`)
            )
            expect(buildStore.store.current.get(buildId)).toBe(buildInformation)
        }
    })

    it('should remove build information from the store', () => {
        buildStore.store.current.set(buildId, buildInformation)

        const result = buildStore.remove(buildId)

        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toBe(true)
            expect(buildStore.store.current.has(buildId)).toBe(false)
        }
    })

    it('should not remove build information if build id does not exist', () => {
        const buildId: UUID =
            '6b172373-DIFF-aed1-1dd1-a3c9ecc3c2656c6df2e66981c4c3c9414401dac958f2'

        const result = buildStore.remove(buildId)

        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error).toEqual(
                new Error(`build id ${buildId} does not exist`)
            )
        }
    })

    //TODO: Fill out rest method's test suite
})
