import { IO } from '@obsidian_blogger/helpers/io'
import { describe, expect, it } from 'vitest'
import { templateInjector } from './template.injector.js'
describe('templateInjector', () => {
    const io = new IO()

    it('should replace template keys with corresponding values', () => {
        const source = 'Hello, "{{name}}"! Your age is "{{age}}".'
        const template = {
            name: 'John',
            age: '30',
        }
        const expected = 'Hello, "John"! Your age is "30".'
        const result = templateInjector(source, template)
        expect(result.replaced).toEqual(expected)
    })

    it('should throw an error if template key is not found', () => {
        const source = 'Hello, "{{name}}"!'
        const template = {
            age: '30',
        }
        const inject = templateInjector(source, template)
        expect(inject.success).toBe(false)
        if (inject.success) return
        expect(inject.issues).toEqual(['Template key not found for age'])
    })

    it('should replace template keys with real-world template', async () => {
        const source = await io.reader.readFile(
            'packages/cli/src/template/ts/build.ts'
        )
        if (!source.success) return
        const inject = templateInjector(source.data, {
            root: '$$ROOT$$',
            contents: '$$CONTENTS$$',
            assets: '$$ASSETS$$',
        })
        expect(inject.success).toBe(true)
        expect(inject.replaced).toContain("const rootPath = '$$ROOT$$'")
    })
})
