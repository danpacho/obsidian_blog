import { describe, expect, it } from 'vitest'

import { Queue } from '.'

describe('Queue', () => {
    it('should enqueue and dequeue items correctly', () => {
        const queue = new Queue<number>({ maxSize: 3 })

        queue.enqueue(1)
        queue.enqueue(2)
        queue.enqueue(3)

        expect(queue.size).toBe(3)
        expect(queue.full).toBe(true)

        expect(queue.dequeue()).toBe(1)
        expect(queue.dequeue()).toBe(2)
        expect(queue.dequeue()).toBe(3)
        expect(queue.dequeue()).toBeUndefined()

        expect(queue.size).toBe(0)
        expect(queue.full).toBe(false)
    })

    it('should return the top and bottom items correctly', () => {
        const queue = new Queue<string>({ maxSize: 3 })

        queue.enqueue('A')
        queue.enqueue('B')
        queue.enqueue('C')

        expect(queue.front).toBe('A')
        expect(queue.rear).toBe('C')

        queue.dequeue()

        expect(queue.front).toBe('B')
        expect(queue.rear).toBe('C')
    })

    it('should return the correct store', () => {
        const queue = new Queue<number>({ maxSize: 3 })

        queue.enqueue(1)
        queue.enqueue(2)
        queue.enqueue(3)

        expect(queue.store).toEqual([1, 2, 3])

        queue.dequeue()

        expect(queue.store).toEqual([2, 3])
    })

    it('should handle enqueueing and dequeueing when maxSize is reached', () => {
        const queue = new Queue<number>({ maxSize: 2 })

        queue.enqueue(1)
        queue.enqueue(2)
        queue.enqueue(3)

        expect(queue.store).toEqual([2, 3])

        expect(queue.dequeue()).toBe(2)
        expect(queue.dequeue()).toBe(3)
        expect(queue.dequeue()).toBeUndefined()
    })
})
