import { describe, expect, it } from 'vitest'

import { json } from './json'
import { JsonStorage } from './json.storage'

describe('JsonStorage', () => {
    const root = `${process.cwd()}/packages/helpers/src/storage/__fixtures__/storage.json`
    const storage: JsonStorage = new JsonStorage({
        name: 'JSONStorage',
        root,
    })

    it('should create a new instance', () => {
        expect(storage).toBeDefined()
    })

    it('should migrate(updateRoot)', async () => {
        await storage.updateRoot(
            `${process.cwd()}/packages/helpers/src/storage/__fixtures__/storage2.json`,
            true
        )
    })

    it('should load the storage file', async () => {
        expect(
            storage.storageRecord.$$key$$.toString().replace(/[ \n]/g, '')
        ).toBe(`()=>{return1;}`)

        expect(storage.storageRecord.key).toEqual({
            key: {
                key: {
                    key: 'value',
                },
            },
        })
    })

    it('should set a value in the storage', async () => {
        await storage.reset()
        await storage.set('key', 'value')
    })

    it('should get a value from the storage', async () => {
        const value = storage.get('key')
        expect(value).toEqual('value')
    })

    it('should remove a value from the storage', async () => {
        await storage.remove('key')
    })

    it('should clear the storage', async () => {
        await storage.reset()
    })

    it('should save the storage', async () => {
        await storage.set('key', {
            key: {
                key: {
                    key: 'value',
                },
            },
        })
        await storage.set('key2', {
            key: {
                key: {
                    key: 'value',
                },
            },
        })
        await storage.set('key3', {
            key: {
                key: {
                    key: 'value',
                },
            },
        })
    })

    it('should have custom serializer and deserializer', async () => {
        storage.updateSerializer(json.serialize)
        storage.updateDeserializer(json.deserialize)

        await storage.set('$$key$$', () => {
            return 1
        })

        await storage.load()
        const value = await storage.get('$$key$$')

        expect(value()).toBe(1)
    })
})
