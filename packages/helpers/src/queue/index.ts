import { Node } from './node'

export class Queue<Data> {
    constructor(
        public readonly option: {
            maxSize: number
        } = {
            maxSize: Infinity,
        }
    ) {}

    private _front: Node<Data> | null = null
    private _rear: Node<Data> | null = null

    public size: number = 0

    public get front(): Data | undefined {
        return this._front?.data
    }
    public get rear(): Data | undefined {
        return this._rear?.data
    }
    public get full(): boolean {
        return this.size === this.option.maxSize
    }

    public enqueue(data: Data): void {
        if (this.size === 0) {
            const newNode = new Node(data)
            this._front = newNode
            this._rear = newNode
            this.size++
            return
        }

        if (this.size >= this.option.maxSize) {
            this.dequeue()
        }

        const newRear = new Node(data)
        if (this._rear) {
            this._rear.next = newRear
        }
        this._rear = newRear
        this.size++
    }

    public dequeue(): Data | undefined {
        if (this.size === 0) {
            return undefined
        }

        const data = this._front?.data
        this._front = this._front?.next ?? null
        this.size--
        return data
    }

    public get store(): Array<Data> {
        const store: Array<Data> = []
        let current = this._front
        // console.log('current', current)
        while (current !== null) {
            store.push(current.data)
            current = current.next
        }
        return store
    }
}
