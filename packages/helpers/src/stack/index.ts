export interface StackConstructor {
    maxSize: number
}
export class Stack<Data> {
    constructor(
        public readonly option: StackConstructor = {
            maxSize: Infinity,
        }
    ) {}

    private _stack: Array<Data> = []

    public size: number = 0

    public get top(): Data | undefined {
        return this._stack[this.size - 1]
    }
    public get bottom(): Data | undefined {
        return this._stack[0]
    }
    public get full(): boolean {
        return this.size === this.option.maxSize
    }
    public get isEmpty(): boolean {
        return this.size === 0
    }

    public push(data: Data): void {
        if (this.size >= this.option.maxSize) {
            this.pop()
        }

        this._stack.push(data)
        this.size++
    }

    public pop(): Data | undefined {
        if (this.size === 0) {
            return undefined
        }

        const data = this._stack.pop()
        this.size--
        return data
    }

    public clear(): void {
        this._stack = []
        this.size = 0
    }

    public get stack(): Array<Data> {
        return this._stack
    }
}
