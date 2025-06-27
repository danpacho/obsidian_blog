import { describe, expect, it } from 'vitest'

import { Stack } from './index'

describe('Stack', () => {
    it('should push data onto the stack', () => {
        const stack = new Stack<number>()
        stack.push(1)
        stack.push(2)
        stack.push(3)
        expect(stack.size).toBe(3)
        expect(stack.top).toBe(3)
    })

    it('should pop data from the stack', () => {
        const stack = new Stack<string>()
        stack.push('a')
        stack.push('b')
        stack.push('c')
        const poppedData = stack.pop()
        expect(poppedData).toBe('c')
        expect(stack.size).toBe(2)
        expect(stack.top).toBe('b')
    })

    it('should clear the stack', () => {
        const stack = new Stack<boolean>()
        stack.push(true)
        stack.push(false)
        stack.push(true)
        stack.clear()
        expect(stack.size).toBe(0)
        expect(stack.top).toBeUndefined()
        expect(stack.isEmpty).toBe(true)
    })

    it('should handle stack overflow', () => {
        const stack = new Stack<number>({ maxSize: 2 })
        stack.push(1)
        stack.push(2)
        stack.push(3)
        expect(stack.size).toBe(2)
        expect(stack.top).toBe(3)
    })

    it('should handle stack underflow', () => {
        const stack = new Stack<string>()
        const poppedData = stack.pop()
        expect(poppedData).toBeUndefined()
        expect(stack.size).toBe(0)
        expect(stack.top).toBeUndefined()
    })
})
