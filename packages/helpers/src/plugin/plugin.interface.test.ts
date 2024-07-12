import { describe, expect, it } from 'vitest'
import { PluginInterface } from './plugin.interface'

describe('PluginInterface', () => {
    it('should create a new instance of the plugin', () => {
        class TestPlugin extends PluginInterface {
            protected defineConfig() {
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
        expect(plugin.config).toEqual({
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
                expect(e.message).toContain('this.defineConfig')
            }
        }
    })

    it('should throw error if `defineConfig` method returns invalid config', () => {
        class Invalid extends PluginInterface {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            protected defineConfig() {
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
})
