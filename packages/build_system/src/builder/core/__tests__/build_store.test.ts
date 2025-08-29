import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type BuildInformation, BuildStore } from '../build_store'

import { createMockIO } from './utils/io_mock'

const mkInfo = (
    id: string,
    origin: string,
    build: string,
    state: BuildInformation['build_state'],
    file_name: BuildInformation['file_name'] = `f-${id}`,
    file_type: BuildInformation['file_type'] = 'TEXT_FILE'
): BuildInformation => {
    const now = new Date().toISOString()
    return {
        id: id as any,
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

describe('BuildStore', () => {
    let io: ReturnType<typeof createMockIO>
    let store: BuildStore

    beforeEach(() => {
        io = createMockIO()
        store = new BuildStore({ io, root: '/tmp/report.json' })
        // ensure clean maps
        store.resetStore()
    })

    it('getStoreList and storeId reflect current/prev maps', () => {
        const a = mkInfo('a', '/orig/a', '/build/a', 'ADDED')
        store.store.current.set(a.id, a)
        store.store.prev.set(
            'p1' as any,
            mkInfo('p1', '/orig/p1', '/build/p1', 'CACHED')
        )
        expect(store.getStoreList('current')).toEqual([a])
        expect(store.getStoreList('prev').length).toBe(1)
        expect(store.storeId.has('a' as any)).toBe(true)
    })

    it('getRemoveTarget and getMoveTarget filter correctly', () => {
        store.store.current.set('r' as any, mkInfo('r', '/x', '/x', 'REMOVED'))
        store.store.current.set('m' as any, mkInfo('m', '/y', '/y', 'MOVED'))
        expect(store.getRemoveTarget().map((r) => r.id)).toContain('r')
        expect(store.getMoveTarget().map((r) => r.id)).toContain('m')
    })

    it('storeJson excludes REMOVED entries', () => {
        store.store.current.set(
            'keep' as any,
            mkInfo('keep', '/1', '/1', 'ADDED')
        )
        store.store.current.set(
            'rem' as any,
            mkInfo('rem', '/2', '/2', 'REMOVED')
        )
        const json = store.storeJson
        const obj = JSON.parse(json)
        expect(Object.keys(obj)).toContain('keep')
        expect(Object.keys(obj)).not.toContain('rem')
    })

    it('findById success and failure', () => {
        const i = mkInfo('i', '/o', '/b', 'ADDED')
        store.store.current.set('i' as any, i)
        const s = store.findById('i' as any, { target: 'current' })
        expect(s.success).toBe(true)
        if (s.success) {
            expect(s.data.id).toBe('i')
        }
        const f = store.findById('missing' as any, { target: 'current' })
        expect(f.success).toBe(false)
        if (!f.success) {
            expect(f.error).toBeInstanceOf(Error)
        }
    })

    it('findByBuildPath uses normalization and returns failure when not found', () => {
        // mock normalize to transform slashes
        // @ts-ignore
        io.pathResolver = {
            normalize: (p: string) => p.replace(/\\/g, '/'),
        } as any
        store = new BuildStore({ io, root: '/tmp/report.json' })
        store.store.current.set(
            'x' as any,
            mkInfo('x', '\\origin\\x', '\\build\\x', 'ADDED')
        )
        const res = store.findByBuildPath('/build/x', { target: 'current' })
        expect(res.success).toBe(true)
        const fail = store.findByBuildPath('/notexists', { target: 'current' })
        expect(fail.success).toBe(false)
    })

    it('findByOriginPath uses normalization and failure path', () => {
        // @ts-ignore
        io.pathResolver = { normalize: (p: string) => p.trim() } as any
        store = new BuildStore({ io, root: '/tmp/report.json' })
        store.store.current.set(
            'q' as any,
            mkInfo('q', ' /orig/q ', '/b', 'ADDED')
        )
        const s = store.findByOriginPath('/orig/q', { target: 'current' })
        expect(s.success).toBe(true)
        const f = store.findByOriginPath('/no', { target: 'current' })
        expect(f.success).toBe(false)
    })

    it('resetStore clears maps', () => {
        store.store.current.set('a' as any, mkInfo('a', '/1', '/1', 'ADDED'))
        store.store.prev.set('b' as any, mkInfo('b', '/2', '/2', 'ADDED'))
        store.resetStore()
        expect(store.getStoreList('current')).toEqual([])
        expect(store.getStoreList('prev')).toEqual([])
    })

    it('loadReport failure and success', async () => {
        // failure
        // @ts-ignore
        io.reader = {
            readFile: vi.fn(async () => ({
                success: false,
                error: new Error('no file'),
            })),
        } as any
        store = new BuildStore({ io, root: '/tmp/report.json' })
        const fail = await store.loadReport()
        expect(fail.success).toBe(false)

        // success: prepare a JSON map string
        const mapObj: Record<string, any> = {
            pId: mkInfo('pId', '/orig/p', '/b/p', 'CACHED'),
        }
        // @ts-ignore
        io.reader = {
            readFile: vi.fn(async () => ({
                success: true,
                data: JSON.stringify(mapObj),
            })),
        } as any
        store = new BuildStore({ io, root: '/tmp/report.json' })
        const suc = await store.loadReport()
        expect(suc.success).toBe(true)
        expect(store.getStoreList('prev').length).toBe(1)
    })

    it('saveReport failure and success', async () => {
        // @ts-ignore
        io.writer = {
            write: vi.fn(async () => ({
                success: false,
                error: new Error('io fail'),
            })),
        } as any
        store = new BuildStore({ io, root: '/tmp/report.json' })
        const f = await store.saveReport()
        expect(f.success).toBe(false)

        // @ts-ignore
        io.writer = { write: vi.fn(async () => ({ success: true })) } as any
        store = new BuildStore({ io, root: '/tmp/report.json' })
        store.store.current.set('c' as any, mkInfo('c', '/o', '/b', 'ADDED'))
        const s = await store.saveReport()
        expect(s.success).toBe(true)
        if (s.success) {
            expect(s.data.has('c' as any)).toBe(true)
        }
    })

    it('add rejects duplicate', () => {
        const info = mkInfo('a', '/o', '/b', 'ADDED')
        expect(store.add('a' as any, info).success).toBe(true)
        const dup = store.add('a' as any, info)
        expect(dup.success).toBe(false)
        if (!dup.success) {
            expect(dup.error).toBeInstanceOf(Error)
        }
    })

    it('remove success and failure', () => {
        store.store.current.set('r' as any, mkInfo('r', '/o', '/b', 'ADDED'))
        const s = store.remove('r' as any)
        expect(s.success).toBe(true)
        const f = store.remove('missing' as any)
        expect(f.success).toBe(false)
    })

    it('update overwrites/sets current', () => {
        const i = mkInfo('u', '/x', '/y', 'ADDED')
        const u = store.update('u' as any, i)
        expect(u.success).toBe(true)
        expect(store.store.current.get('u' as any)?.id).toBe('u')
    })
})
