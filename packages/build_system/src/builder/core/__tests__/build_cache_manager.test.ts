import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BuildStore } from '../build_store'
import { BuildCacheManager } from '../cache_manager'

import { createMockIO } from './utils/io_mock'

import type { BuildInformation } from '../build_store'

type NodeId = string

const mkInfo = (
    id: NodeId,
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

const mkNode = (
    buildInfo?: Partial<BuildInformation> & {
        id: string
        build_path: { origin: string; build: string }
    },
    fileName = 'test.md',
    category: BuildInformation['file_type'] = 'TEXT_FILE'
) => {
    return {
        buildInfo: buildInfo ? (buildInfo as any) : undefined,
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
        // default normalize returns same string
        // @ts-ignore
        io.pathResolver = { normalize: (p: string) => p } as any
        store = new BuildStore({ io, root: '/tmp/report.json' })
        store.resetStore()
        mgr = new BuildCacheManager({ store })
    })

    it('setup resets store when loadReport fails', async () => {
        // @ts-ignore
        io.reader = {
            readFile: vi.fn(async () => ({
                success: false,
                error: new Error('fail'),
            })),
        } as any
        const s = new BuildStore({ io, root: '/x' })
        const spy = vi.spyOn(s, 'resetStore')
        const m = new BuildCacheManager({ store: s })
        await m.setup()
        expect(spy).toHaveBeenCalled()
    })

    it('save returns true/false depending on saveReport', async () => {
        // @ts-ignore
        io.writer = {
            write: vi.fn(async () => ({
                success: false,
                error: new Error('fail'),
            })),
        } as any
        const s = new BuildStore({ io, root: '/x' })
        const m = new BuildCacheManager({ store: s })
        expect(await m.save()).toBe(false)
        // @ts-ignore
        io.writer = { write: vi.fn(async () => ({ success: true })) } as any
        const s2 = new BuildStore({ io, root: '/x' })
        const m2 = new BuildCacheManager({ store: s2 })
        expect(await m2.save()).toBe(true)
    })

    it('checkStatus and checkStatusByPath success and failure', () => {
        const info = mkInfo('s1', '/o', '/b', 'ADDED')
        store.store.current.set('s1' as any, info)
        const res = mgr.checkStatus('s1' as any)
        expect(res.success).toBe(true)
        if (res.success) {
            expect(res.data).toBe('ADDED')
        }

        const not = mgr.checkStatus('no' as any)
        expect(not.success).toBe(false)

        // check by path
        const p = mgr.checkStatusByPath('/b')
        expect(p.success).toBe(true)
        if (p.success) {
            expect(p.data).toBe('ADDED')
        }

        const pfail = mgr.checkStatusByPath('/missing')
        expect(pfail.success).toBe(false)
    })

    it('updateStore returns error when node.buildInfo missing', () => {
        const node = mkNode(undefined)
        const r = mgr.updateStore(node)
        expect(r.success).toBe(false)
    })

    it('updateStore CACHED path (same id, same origin) updates current with CACHED', () => {
        const prev = mkInfo('idA', '/orig/a', '/build/a', 'CACHED')
        store.store.prev.set('idA' as any, prev)
        const node = mkNode({
            id: 'idA' as any,
            build_path: { origin: '/orig/a', build: '/build/a' },
        })
        const res = mgr.updateStore(node)
        expect(res.success).toBe(true)
        const cur = store.store.current.get('idA' as any)!
        expect(cur.build_state).toBe('CACHED')
        expect(cur.updated_at).toBeDefined()
    })

    it('updateStore MOVED path (same id, different origin) updates current and movedFromOrigins', () => {
        const prev = mkInfo('idB', '/orig/old', '/build/old', 'CACHED')
        store.store.prev.set('idB' as any, prev)
        const node = mkNode({
            id: 'idB' as any,
            build_path: { origin: '/orig/new', build: '/build/new' },
        })
        const res = mgr.updateStore(node)
        expect(res.success).toBe(true)
        const cur = store.store.current.get('idB' as any)!
        expect(cur.build_state).toBe('MOVED')
        // movedFromOrigins should contain old (normalized) origin
        // Note: movedFromOrigins is private; we check via performing a later ADDED branch that deletes it
        // For explicit check, we can reach internal via (mgr as any).movedFromOrigins
        expect((mgr as any).movedFromOrigins.has('/orig/old')).toBe(true)
    })

    it('updateStore UPDATED branch removes oldId and creates updated newId', () => {
        // prev contains an entry discovered by origin
        const prevOriginInfo = mkInfo(
            'oldId',
            '/orig/present',
            '/build/p',
            'CACHED'
        )
        // prev holds the origin -> this will be found by findByOriginPath
        store.store.prev.set('oldId' as any, prevOriginInfo)
        // to simulate situation where oldId is not in current, ensure current empty
        const node = mkNode({
            id: 'newId' as any,
            build_path: { origin: '/orig/present', build: '/build/new' },
        })
        const res = mgr.updateStore(node)
        expect(res.success).toBe(true)
        // new id should be added/updated in current with UPDATED state
        const cur = store.store.current.get('newId' as any)!
        expect(cur).toBeTruthy()
        expect(cur.build_state).toBe('UPDATED')
        expect(cur.id).toBe('newId')
    })

    it('updateStore UPDATED branch where remove fails is tolerated', () => {
        // if oldId != newId and current does not contain oldId, remove will fail but code tolerates it
        const prevOriginInfo = mkInfo('oldX', '/o/x', '/b/x', 'CACHED')
        store.store.prev.set('oldX' as any, prevOriginInfo)
        // ensure current is empty (remove will return failure)
        const node = mkNode({
            id: 'newX' as any,
            build_path: { origin: '/o/x', build: '/b/newx' },
        })
        const res = mgr.updateStore(node)
        expect(res.success).toBe(true)
        expect(store.store.current.has('newX' as any)).toBe(true)
    })

    it('updateStore ADDED branch when origin was moved (wasMovedOrigin true) creates ADDED and clears movedFromOrigins', () => {
        // we simulate an origin that was previously moved
        const prev = mkInfo('z', '/orig/reused', '/b/z', 'CACHED')
        store.store.prev.set('z' as any, prev)
        // mark origin as moved previously
        ;(mgr as any).movedFromOrigins.add('/orig/reused')

        const node = mkNode({
            id: 'addedId' as any,
            build_path: { origin: '/orig/reused', build: '/b/added' },
        })

        const res = mgr.updateStore(node)
        expect(res.success).toBe(true)
        // added to current
        const cur = store.store.current.get('addedId' as any)!
        expect(cur.build_state).toBe('ADDED')
        // movedFromOrigins should be cleared for that origin
        expect((mgr as any).movedFromOrigins.has('/orig/reused')).toBe(false)
    })

    it('updateStore ADDED when origin never existed', () => {
        const node = mkNode({
            id: 'brandNew' as any,
            build_path: { origin: '/some/new', build: '/b/new' },
        })
        const res = mgr.updateStore(node)
        expect(res.success).toBe(true)
        const cur = store.store.current.get('brandNew' as any)!
        expect(cur.build_state).toBe('ADDED')
    })

    it('syncRemovedStore marks prev-only items as REMOVED in current', () => {
        // prev has an item not present in current
        const prevOnly = mkInfo('pR', '/prev/only', '/b/pR', 'CACHED')
        store.store.prev.set('pR' as any, prevOnly)
        // ensure current does not have this origin
        mgr.syncRemovedStore()
        const cur = store.store.current.get('pR' as any)!
        expect(cur).toBeTruthy()
        expect(cur.build_state).toBe('REMOVED')
    })

    it('path normalization is used by manager', () => {
        // set a normalize that trims
        // @ts-ignore
        io.pathResolver = { normalize: (s: string) => s.trim() } as any
        store = new BuildStore({ io, root: '/tmp/r' })
        const m = new BuildCacheManager({ store })
        store.store.prev.set(
            'p' as any,
            mkInfo('p', ' /space/orig ', '/b', 'CACHED')
        )
        const node = mkNode({
            id: 'nid' as any,
            build_path: { origin: ' /space/orig ', build: '/b' },
        })
        const res = m.updateStore(node)
        expect(res.success).toBe(true)
        // should find by normalized origin and produce UPDATED or ADDED; ensure no exception
    })
})
