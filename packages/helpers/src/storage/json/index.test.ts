import { describe, expect, it } from 'vitest'
import { json } from './index'

describe('Serialization and Deserialization', () => {
    function exampleFunction() {
        return 1
    }

    it('should correctly serialize and deserialize complex objects', async () => {
        const complexObject = {
            simpleValue: 42,
            stringValue: 'Hello, World!',
            nestedObject: {
                innerValue: true,
                innerFunction: function b() {
                    return 'Inner Function'
                },
                deepNestedObject: {
                    deepValue: 3.14,
                    deepFunction: function a() {
                        return 'Deep Function'
                    },
                },
            },
            arrayWithFunctions: [
                function () {
                    return 'First Function in Array'
                },
                function () {
                    return 'Second Function in Array'
                },
                async (...args: Array<unknown>) => {
                    return args
                },
            ],
            functionProperty: exampleFunction,
            regexp: /test/g,
        }

        const serialized = json.serialize(complexObject)
        const deserialized = json.deserialize<{
            simpleValue: number
            stringValue: string
            nestedObject: {
                innerValue: boolean
                innerFunction: () => string
                deepNestedObject: {
                    deepValue: number
                    deepFunction: () => string
                }
            }
            arrayWithFunctions: [
                () => string,
                () => string,
                (...args: Array<unknown>) => Array<unknown>,
            ]
            functionProperty: () => number
            regexp: RegExp
        }>(serialized)

        expect(deserialized.simpleValue).toBe(42)
        expect(deserialized.stringValue).toBe('Hello, World!')
        expect(deserialized.nestedObject.innerValue).toBe(true)
        expect(deserialized.nestedObject.innerFunction()).toBe('Inner Function')
        expect(deserialized.nestedObject.deepNestedObject.deepValue).toBe(3.14)
        expect(deserialized.nestedObject.deepNestedObject.deepFunction()).toBe(
            'Deep Function'
        )
        expect(deserialized.arrayWithFunctions[0]()).toBe(
            'First Function in Array'
        )
        expect(deserialized.arrayWithFunctions[1]()).toBe(
            'Second Function in Array'
        )
        expect(
            await deserialized.arrayWithFunctions[2]('Hello', 'World')
        ).toStrictEqual(['Hello', 'World'])
        expect(typeof deserialized.functionProperty).toBe('function')
        expect(deserialized.functionProperty()).toBe(1)
        expect(deserialized.regexp).toBeInstanceOf(RegExp)
    })
})
