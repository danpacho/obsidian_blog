import { describe, expect, it } from 'vitest'
import {
    PluginInterface,
    PluginInterfaceStaticConfig,
} from './plugin.interface'

describe('PluginInterface', () => {
    it('should create a new instance of the plugin', () => {
        class TestPlugin extends PluginInterface {
            protected defineStaticConfig() {
                return {
                    name: 'TestPlugin',
                    description: 'A test plugin',
                }
            }

            public async execute(): Promise<void> {
                return
            }
        }
        const plugin = new TestPlugin()
        expect(plugin.staticConfig).toEqual({
            name: 'TestPlugin',
            description: 'A test plugin',
        })
    })

    it('should throw error if `defineConfig` method is not implemented', () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        class Invalid extends PluginInterface {}
        try {
            new Invalid()
        } catch (e) {
            if (e instanceof Error) {
                expect(e).toBeInstanceOf(SyntaxError)
                expect(e.message).toContain('this.defineStaticConfig')
            }
        }
    })

    it('should throw error if `defineConfig` method returns invalid config', () => {
        class Invalid extends PluginInterface {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            protected defineStaticConfig() {
                return 1
            }

            public async execute(): Promise<unknown> {
                return
            }
        }
        try {
            new Invalid()
        } catch (e) {
            if (e instanceof Error) {
                expect(e).toBeInstanceOf(SyntaxError)
                expect(e.message).toContain('config: 1')
            }
        }
    })

    it('should null when accessing dynamicConfig before setting it', () => {
        class TestPlugin extends PluginInterface {
            protected defineStaticConfig() {
                return {
                    name: 'TestPlugin',
                    description: 'A test plugin',
                }
            }

            public async execute(): Promise<void> {
                return
            }
        }
        const plugin = new TestPlugin()
        expect(plugin.dynamicConfig).toBeNull()
    })

    it('should set dynamicConfig', () => {
        class TestPlugin extends PluginInterface<
            PluginInterfaceStaticConfig,
            {
                someConfig: string
            }
        > {
            protected defineStaticConfig(): PluginInterfaceStaticConfig {
                return {
                    name: 'TestPlugin',
                    description: 'A test plugin',
                }
            }

            public async execute(): Promise<void> {
                return
            }
        }
        const plugin = new TestPlugin()
        plugin.injectDynamicConfig({ someConfig: 'test' })
        expect(plugin.dynamicConfig).toEqual({ someConfig: 'test' })
    })

    it('should correctly generate default dynamicConfigDescriptions, if it is not provided', () => {
        class TestPlugin extends PluginInterface<
            PluginInterfaceStaticConfig,
            {
                stringValue: string
                numberValue: number
                booleanValue: boolean
                nullValue: null
                functionValue: (x: number, y: number) => number
                objectValue: {
                    nestedString: string
                    nestedArray: (string | number | boolean)[]
                    k: Array<{
                        a: string
                        b: number
                        c: Array<{
                            d: boolean
                            e: {
                                f: Array<string>
                                g: {
                                    h: Array<number>
                                }
                            }
                        }>
                    }>
                }
                arrayValue: (string | number | boolean)[]
            }
        > {
            protected defineStaticConfig(): PluginInterfaceStaticConfig {
                return {
                    name: 'TestPlugin',
                    description: 'A test plugin',
                }
            }

            public async execute(): Promise<void> {
                return
            }
        }
        const test = {
            stringValue: 'hello',
            numberValue: 42,
            booleanValue: true,
            nullValue: null,
            functionValue: (x: number, y: number) => x + y,
            objectValue: {
                nestedString: 'world',
                nestedArray: [1, '2', false],
                k: [
                    {
                        a: 'a',
                        b: 1,
                        c: [
                            {
                                d: true,
                                e: {
                                    f: ['f'],
                                    g: {
                                        h: [1],
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            arrayValue: [1, 2, 3],
        }
        const plugin = new TestPlugin()
        plugin.injectDynamicConfig(test)
        expect(plugin.staticConfig).toStrictEqual({
            name: 'TestPlugin',
            description: 'A test plugin',
            dynamicConfigDescriptions: [
                { property: 'stringValue', type: 'string' },
                { property: 'numberValue', type: 'number' },
                { property: 'booleanValue', type: 'boolean' },
                { property: 'nullValue', type: 'null' },
                { property: 'functionValue', type: '(x, y) => unknown' },
                {
                    property: 'objectValue',
                    type: '{ nestedString: string; nestedArray: readonly [number, string, boolean]; k: Array<{ a: string; b: number; c: Array<{ d: boolean; e: { f: Array<string>; g: { h: Array<number> } } }> }> }',
                },
                { property: 'arrayValue', type: 'Array<number>' },
            ],
        })
    })
})
