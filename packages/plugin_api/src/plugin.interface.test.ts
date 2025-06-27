import { describe, expect, it } from 'vitest'

import { PluginInterface } from './plugin.interface'

import type { PluginInterfaceStaticConfig } from './plugin.interface'

describe('PluginInterface', () => {
    it('should create a new instance of the plugin', () => {
        class TestPlugin extends PluginInterface {
            protected defineStaticConfig() {
                return {
                    name: 'TestPlugin',
                    description: 'A test plugin',
                }
            }

            public async execute() {
                return this.history
            }
        }
        const plugin = new TestPlugin()
        expect(plugin.staticConfig).toEqual({
            name: 'TestPlugin',
            description: 'A test plugin',
        })
    })

    it('should throw error if `defineConfig` method is not implemented', () => {
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
            // @ts-expect-error
            protected defineStaticConfig() {
                return 1
            }

            public async execute() {
                return this.history
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

            public async execute() {
                return this.history
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
            },
            {
                deps: []
            },
            {
                prepare: void
                response: Array<{
                    name: string
                }>
            }
        > {
            protected defineStaticConfig(): PluginInterfaceStaticConfig {
                return {
                    name: 'TestPlugin',
                    description: 'A test plugin',
                    dynamicConfigSchema: {
                        someConfig: {
                            type: 'string',
                            description: 'Some config',
                        },
                    },
                }
            }

            public async execute() {
                return this.history
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
                    dynamicConfigSchema: {
                        stringValue: {
                            type: 'string',
                            description: 'A string value',
                        },
                        numberValue: {
                            type: 'number',
                            description: 'A number value',
                        },
                        booleanValue: {
                            type: 'boolean',
                            description: 'A boolean value',
                        },
                        functionValue: {
                            type: 'Function',
                            description: 'A function value',
                            typeDescription: '(x: number, y: number) => number',
                        },
                        objectValue: {
                            type: {
                                nestedString: {
                                    type: 'string',
                                    description: 'A nested string',
                                },
                                nestedArray: {
                                    type: 'Array',
                                    description: 'A nested array',
                                    typeDescription:
                                        'Array<string | number | boolean>',
                                },
                                k: {
                                    type: 'Array',
                                    description: 'A nested object',
                                    typeDescription:
                                        'Array<{ a: string; b: number; c: Array<{ d: boolean; e: { f: Array<string>; g: { h: Array<number> } } }> }>',
                                },
                            },
                            description: 'An object value',
                        },
                    },
                }
            }

            public async execute() {
                return this.history
            }
        }
        const test = {
            stringValue: 'hello',
            numberValue: 42,
            booleanValue: true,
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
            dynamicConfigSchema: {
                stringValue: {
                    type: 'string',
                    description: 'A string value',
                },
                numberValue: {
                    type: 'number',
                    description: 'A number value',
                },
                booleanValue: {
                    type: 'boolean',
                    description: 'A boolean value',
                },
                functionValue: {
                    type: 'Function',
                    description: 'A function value',
                    typeDescription: '(x: number, y: number) => number',
                },
                objectValue: {
                    type: {
                        nestedString: {
                            type: 'string',
                            description: 'A nested string',
                        },
                        nestedArray: {
                            type: 'Array',
                            description: 'A nested array',
                            typeDescription: 'Array<string | number | boolean>',
                        },
                        k: {
                            type: 'Array',
                            description: 'A nested object',
                            typeDescription:
                                'Array<{ a: string; b: number; c: Array<{ d: boolean; e: { f: Array<string>; g: { h: Array<number> } } }> }>',
                        },
                    },
                    description: 'An object value',
                },
            },
        })
    })

    it('should execute the plugin', async () => {
        class TestPlugin extends PluginInterface<
            PluginInterfaceStaticConfig,
            null,
            null
        > {
            protected defineStaticConfig() {
                return {
                    name: 'TestPlugin',
                    description: 'A test plugin',
                }
            }

            public async execute() {
                this.$jobManager.registerJob({
                    name: 'TestPluginExecution',
                    execute: async () => {
                        return {
                            status: 'success',
                            message: 'TestPlugin executed successfully',
                        }
                    },
                })
                await this.$jobManager.processJobs()
                return this.history
            }
        }
        const plugin = new TestPlugin()
        const response = await plugin.execute()
        expect(response).toHaveLength(1)
        expect(Array.isArray(response)).toBeTruthy()
        expect(response[0]?.status).toEqual('success')
        expect(response[0]?.response).toEqual({
            status: 'success',
            message: 'TestPlugin executed successfully',
        })
    })
})
