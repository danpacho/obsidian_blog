export class Queue<Type> {
    public constructor(
        public readonly options: {
            size: number
        }
    ) {
        this.pointer = {
            back: 1,
            curr: 1,
        }
    }
    public readonly queue: Map<number, Type> = new Map()
    private readonly pointer: {
        back: number
        curr: number
    }

    public get full(): boolean {
        return this.pointer.curr - this.pointer.back === this.options.size
    }

    public enqueue(target: Type): Type {
        if (this.full) {
            this.dequeue()
        }
        this.queue.set(this.pointer.curr, target)
        this.pointer.curr++
        return target
    }

    public dequeue(): Type | undefined {
        const dequeueTarget = this.queue.get(this.pointer.back)
        if (dequeueTarget === undefined) {
            return undefined
        }
        this.queue.delete(this.pointer.back)
        this.pointer.back++
        return dequeueTarget
    }

    public get length() {
        return this.queue.size
    }

    public getTop() {
        return this.queue.get(this.pointer.curr - 1)
    }

    public getBottom() {
        return this.queue.get(this.pointer.back)
    }
}
