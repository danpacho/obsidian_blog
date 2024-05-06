export class Node<Data> {
    public readonly data: Data
    public next: Node<Data> | null = null

    constructor(data: Data) {
        this.data = data
    }
}
