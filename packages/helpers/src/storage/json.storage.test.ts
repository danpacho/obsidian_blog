import { describe, expect, it } from 'vitest'
import { JsonStorage } from './json.storage'

describe('JsonStorage', () => {
    const root = `${process.cwd()}/packages/helpers/src/storage/__mocks__/storage.json`
    const storage: JsonStorage = new JsonStorage({
        name: 'JSONStorage',
        root,
    })

    it('should create a new instance', () => {
        expect(storage).toBeDefined()
    })

    it('should load the storage file', async () => {
        await storage.load()
    })

    it('should set a value in the storage', async () => {
        await storage.set('key', 'value')
    })

    it('should get a value from the storage', async () => {
        const value = await storage.get('key')
        expect(value).toEqual('value')
    })

    it('should remove a value from the storage', async () => {
        await storage.remove('key')
    })

    it('should clear the storage', async () => {
        await storage.clear()
    })

    it('should save the storage', async () => {
        await storage.set('key', 'value')
    })
})
