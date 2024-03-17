import { describe, expect, it } from 'vitest'
import { Queue } from './queue'

describe('Queue', () => {
    it('should enqueue and dequeue items correctly', () => {
        const queue = new Queue<number>({ size: 3 })

        queue.enqueue(1)
        queue.enqueue(2)
        queue.enqueue(3)

        expect(queue.length).toBe(3)
        expect(queue.full).toBe(true)

        expect(queue.dequeue()).toBe(1)
        expect(queue.dequeue()).toBe(2)
        expect(queue.dequeue()).toBe(3)
        expect(queue.dequeue()).toBeUndefined()

        expect(queue.length).toBe(0)
        expect(queue.full).toBe(false)
    })

    it('should return the top and bottom items correctly', () => {
        const queue = new Queue<string>({ size: 3 })

        queue.enqueue('A')
        queue.enqueue('B')
        queue.enqueue('C')

        expect(queue.getTop()).toBe('C')
        expect(queue.getBottom()).toBe('A')

        queue.dequeue()

        expect(queue.getTop()).toBe('C')
        expect(queue.getBottom()).toBe('B')
    })
})
