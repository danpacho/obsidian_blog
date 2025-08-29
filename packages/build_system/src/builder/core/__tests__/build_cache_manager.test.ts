// @ts-nocheck

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BuildStore } from '../build_store'
import { BuildCacheManager } from '../cache_manager'

import { createMockIO } from './utils/io_mock'

import type { BuildInformation } from '../build_store'
import type { ContentId, NodeId } from '../info_generator'

/**
 * A mock factory for BuildInformation.
 * Now includes content_id.
 */
const mkInfo = (
    id: NodeId,
    content_id: ContentId,
    origin: string,
    build: string,
    state: BuildInformation['build_state'],
    file_name: BuildInformation['file_name'] = `f-${id}`,
    file_type: BuildInformation['file_type'] = 'TEXT_FILE'
): BuildInformation => {
    const now = new Date().toISOString()
    return {
        id,
        content_id,
        created_at: now,
        updated_at: now,
        file_name,
        file_type,
        build_state: state,
        build_path: {
            origin,
            build,
        },
    }
}

/**
 * A mock factory for FileTreeNode.
 * Updated to match the new BuildInformation structure.
 */
const mkNode = (
    buildInfo: Partial<BuildInformation> & {
        id: NodeId
        content_id: ContentId
        build_path: { origin: string; build: string }
    },
    fileName = 'test.md',
    category: BuildInformation['file_type'] = 'TEXT_FILE'
) => {
    return {
        buildInfo,
        fileName,
        category,
    } as any
}

describe('BuildCacheManager', () => {
    let io: ReturnType<typeof createMockIO>
    let store: BuildStore
    let mgr: BuildCacheManager

    beforeEach(() => {
        io = createMockIO()
        store = new BuildStore({ io, root: '/tmp/report.json' })
        mgr = new BuildCacheManager({ store })
    })

    it('setup resets store when loadReport fails', async () => {
        io.reader.readFile = vi.fn().mockResolvedValue({
            success: false,
            error: new Error('fail'),
        })
        const spy = vi.spyOn(store, 'resetStore')
        await mgr.setup()
        expect(spy).toHaveBeenCalled()
    })

    it('save returns true/false depending on saveReport', async () => {
        io.writer.write = vi
            .fn()
            .mockResolvedValueOnce({
                success: false,
                error: new Error('fail'),
            })
            .mockResolvedValueOnce({ success: true })

        expect(await mgr.save()).toBe(false)
        expect(await mgr.save()).toBe(true)
    })

    describe('Two-Phase Processing (processNode -> finalize)', () => {
        beforeEach(() => {
            vi.spyOn(store, 'loadReport').mockResolvedValue({ success: true })
        })

        it('should mark unchanged files as CACHED', async () => {
            // Arrange
            const prevInfo = mkInfo('idA', 'cidA', '/orig/a', '/b/a', 'CACHED')
            store.store.prev.set('idA', prevInfo)
            const newNode = mkNode({
                id: 'idA',
                content_id: 'cidA',
                build_path: { origin: '/orig/a', build: '/b/a' },
            })
            await mgr.setup()

            // Act
            mgr.processNode(newNode)
            mgr.finalize()

            // Assert
            const cur = store.store.current.get('idA')!
            expect(cur.build_state).toBe('CACHED')
            expect(store.store.current.size).toBe(1)
        })

        it('should mark files with same origin but new content as UPDATED', async () => {
            // Arrange
            const prevInfo = mkInfo('idA', 'cidA', '/orig/a', '/b/a', 'CACHED')
            store.store.prev.set('idA', prevInfo)
            const newNode = mkNode({
                id: 'idA_new', // New NodeId because content changed
                content_id: 'cidA_new', // New ContentId
                build_path: { origin: '/orig/a', build: '/b/a_new' }, // Same origin
            })
            await mgr.setup()

            // Act
            mgr.processNode(newNode)
            mgr.finalize()

            // Assert
            const cur = store.store.current.get('idA_new')!
            expect(cur.build_state).toBe('UPDATED')
            expect(store.store.current.has('idA')).toBe(false)
            expect(store.store.current.size).toBe(1)
        })

        it('should mark new files as ADDED', async () => {
            // Arrange
            const newNode = mkNode({
                id: 'idB',
                content_id: 'cidB',
                build_path: { origin: '/orig/b', build: '/b/b' },
            })
            await mgr.setup()

            // Act
            mgr.processNode(newNode)
            mgr.finalize()

            // Assert
            const cur = store.store.current.get('idB')!
            expect(cur.build_state).toBe('ADDED')
            expect(store.store.current.size).toBe(1)
        })

        it('should mark files with same content but new origin as MOVED', async () => {
            // Arrange
            const prevInfo = mkInfo('idC', 'cidC', '/orig/c', '/b/c', 'CACHED')
            store.store.prev.set('idC', prevInfo)
            const newNode = mkNode({
                id: 'idC_new', // New NodeId because path changed
                content_id: 'cidC', // Same ContentId
                build_path: { origin: '/orig/c_moved', build: '/b/c' }, // New origin
            })
            await mgr.setup()

            // Act
            mgr.processNode(newNode)
            mgr.finalize()

            // Assert
            const cur = store.store.current.get('idC_new')!
            expect(cur.build_state).toBe('MOVED')
            // Important: created_at should be preserved from the old info
            expect(cur.created_at).toBe(prevInfo.created_at)
            expect(store.store.current.has('idC')).toBe(false)
        })

        it('should mark files present in prev but not current as REMOVED', async () => {
            // Arrange
            const prevInfo = mkInfo('idD', 'cidD', '/orig/d', '/b/d', 'CACHED')
            store.store.prev.set('idD', prevInfo)
            await mgr.setup()

            // Act: Process no new nodes, just finalize
            mgr.finalize()

            // Assert
            const cur = store.store.current.get('idD')!
            expect(cur.build_state).toBe('REMOVED')
            expect(store.store.current.size).toBe(1)
        })

        it('should handle all states correctly in a complex scenario', async () => {
            // Arrange: Setup a complex previous state
            const infoCached = mkInfo(
                'id_A',
                'cid_A',
                '/orig/a',
                '/b/a',
                'CACHED'
            )
            const infoUpdated = mkInfo(
                'id_B',
                'cid_B',
                '/orig/b',
                '/b/b',
                'CACHED'
            )
            const infoMoved = mkInfo(
                'id_C',
                'cid_C',
                '/orig/c',
                '/b/c',
                'CACHED'
            )
            const infoRemoved = mkInfo(
                'id_D',
                'cid_D',
                '/orig/d',
                '/b/d',
                'CACHED'
            )
            store.store.prev.set('id_A', infoCached)
            store.store.prev.set('id_B', infoUpdated)
            store.store.prev.set('id_C', infoMoved)
            store.store.prev.set('id_D', infoRemoved)

            // New nodes for the current build
            const nodeCached = mkNode({ ...infoCached }) // No change
            const nodeUpdated = mkNode({
                id: 'id_B_new',
                content_id: 'cid_B_new',
                build_path: { origin: '/orig/b', build: '/b/b_new' },
            })
            const nodeMoved = mkNode({
                id: 'id_C_new',
                content_id: 'cid_C', // Same content
                build_path: { origin: '/orig/c_moved', build: '/b/c_new' }, // New origin
            })
            const nodeAdded = mkNode({
                id: 'id_E',
                content_id: 'cid_E',
                build_path: { origin: '/orig/e', build: '/b/e' },
            })
            const newNodes = [nodeCached, nodeUpdated, nodeMoved, nodeAdded]

            await mgr.setup()

            // Act
            for (const node of newNodes) {
                mgr.processNode(node)
            }
            mgr.finalize()

            // Assert
            const current = store.store.current
            expect(current.size).toBe(5)
            expect(current.get('id_A')?.build_state).toBe('CACHED')
            expect(current.get('id_B_new')?.build_state).toBe('UPDATED')
            expect(current.get('id_C_new')?.build_state).toBe('MOVED')
            expect(current.get('id_D')?.build_state).toBe('REMOVED')
            expect(current.get('id_E')?.build_state).toBe('ADDED')
        })
    })
})
