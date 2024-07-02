import { describe, expect, it } from 'vitest'
import { templateInjector } from './template.injector.js'

describe('templateInjector', () => {
    it('should replace template keys with corresponding values', () => {
        const source = 'Hello, {{name}}! Your age is {{age}}.'
        const template = {
            name: 'John',
            age: '30',
        }
        const expected = 'Hello, John! Your age is 30.'
        const result = templateInjector(source, template)
        expect(result.replaced).toEqual(expected)
    })

    it('should throw an error if template key is not found', () => {
        const source = 'Hello, {{name}} !'
        const template = {
            age: '30',
        }
        const inject = templateInjector(source, template)
        expect(inject.success).toBe(false)
        if (inject.success) return
        expect(inject.issues).toEqual(['Template key not found for age'])
    })
})
