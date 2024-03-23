export class Queue<Type> {
    public constructor(
        public readonly options: {
            size: number
        }
    ) {
        this.pointer = {
            rear: 1,
            back: 1,
        }
    }
    public readonly queue: Map<number, Type> = new Map()
    private readonly pointer: {
        rear: number
        back: number
    }

    public get full(): boolean {
        return this.pointer.back - this.pointer.rear === this.options.size
    }

    public enqueue(target: Type): Type {
        if (this.full) {
            this.dequeue()
        }
        this.queue.set(this.pointer.back, target)
        this.pointer.back++
        return target
    }

    public dequeue(): Type | undefined {
        const dequeueTarget = this.queue.get(this.pointer.rear)
        if (dequeueTarget === undefined) {
            return undefined
        }
        this.queue.delete(this.pointer.rear)
        this.pointer.rear++
        return dequeueTarget
    }

    public get length() {
        return this.queue.size
    }

    public getTop() {
        return this.queue.get(this.pointer.back - 1)
    }

    public getBottom() {
        return this.queue.get(this.pointer.rear)
    }
}
