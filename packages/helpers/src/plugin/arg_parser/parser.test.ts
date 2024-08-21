import { describe, expect, it } from 'vitest'
import {
    DynamicConfigParser,
    DynamicConfigParserError,
    PluginDynamicConfigSchema,
} from './parser'

describe('DynamicConfigParser', () => {
    const parser = new DynamicConfigParser()
    const schema: PluginDynamicConfigSchema = {
        name: {
            type: 'Array<string>',
            description: 'The name of the person',
            defaultValue: ['John Doe'],
        },
        type: {
            defaultValue: [1.1, 1.0],
            type: 'Array<number>',
            description: 'The type of the person',
        },
        json: {
            type: {
                bg: {
                    type: 'string',
                    description: 'This is nice bg',
                    defaultValue: '#fff',
                },
                bias: {
                    type: {
                        x: {
                            type: 'number',
                            description: 'This is x',
                            defaultValue: 0,
                        },
                    },
                    description: 'This is a bias object',
                },
            },
            description: 'This is a json object',
        },
        union: {
            type: ['boolean', 'int', 'Array'],
            description: 'This is a union type',
        },
        optional: {
            optional: true,
            description: 'This is an optional field',
            type: 'string',
        },
        literal: {
            type: {
                a: {
                    type: ['Literal<red>', 'Literal<green>'],
                    description: 'This is a literal field',
                    optional: true,
                },
            },
            description: 'This is a literal field',
            optional: true,
        },
        regexp: {
            type: 'RegExp',
            description: 'This is a regexp field',
            optional: true,
        },
    }

    it('should be correctly parse and track errors', () => {
        const parsed = parser.parse(schema, {
            name: ['John Doe'],
            type: [1.2],
            json: {
                bg: 'red',
            },
        })
        expect(parsed.success).toBe(false)
        if (!parsed.success) {
            expect(parsed.error).toBeInstanceOf(DynamicConfigParserError)
            expect(parsed.error.schema).toStrictEqual(schema.json?.type)
        }

        const safe = parser.parse(schema, {
            name: ['June', 'Shy'],
            type: [1.2, 1],
            json: {
                bg: 'yellow',
                bias: {
                    x: 1,
                },
            },
            union: true,
        })
        expect(safe.success).toBe(true)
        if (safe.success) {
            expect(safe.data).toStrictEqual({
                name: ['June', 'Shy'],
                type: [1.2, 1],
                json: {
                    bg: 'yellow',
                    bias: {
                        x: 1,
                    },
                },
                union: true,
            })
        }
    })

    it('should add defaultValue', () => {
        const parsed = parser.parse(schema, {
            name: ['June', 'Shy'],
            type: [1.2, 1],
            json: {
                bg: 'yellow',
                bias: {},
            },
            union: [],
            optional: '1',
            literal: {
                a: 'green',
            },
        })
        expect(parsed.success).toBe(true)
        if (parsed.success) {
            expect(parsed.data).toStrictEqual({
                name: ['June', 'Shy'],
                type: [1.2, 1],
                json: {
                    bg: 'yellow',
                    bias: {
                        x: 0,
                    },
                },
                union: [],
                optional: '1',
                literal: {
                    a: 'green',
                },
            })
        }
    })
})
