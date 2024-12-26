type NodeID = string
type NodeChildren<T> = Map<NodeID, Node<T>>

class Node<T> {
    _id: NodeID
    _data: T
    _children: NodeChildren<T> = new Map()

    public constructor(id: NodeID, data: T) {
        this._data = data
        this._id = id
    }

    public get id(): NodeID {
        return this._id
    }

    public get data(): T {
        return this._data
    }

    public get children(): NodeChildren<T> {
        return this._children
    }

    public get hasChildren(): boolean {
        return this._children !== null
    }

    public appendChild(newId: NodeID, data: T): boolean {
        if (this._children.has(newId)) return false

        const newNode = new Node<T>(newId, data)
        this._children.set(newId, newNode)
        return true
    }

    public appendChildren(...children: Array<[NodeID, T]>): Array<boolean> {
        return children.map(([newId, data]) => this.appendChild(newId, data))
    }

    public removeChild(targetId: NodeID): boolean {
        if (!this._children.has(targetId)) return false

        this._children.delete(targetId)
        return true
    }

    public removeChildren(targetIds: Array<NodeID>): Array<boolean> {
        return targetIds.map(this.removeChild)
    }
}

export class AST<T> {
    private _root: Node<T>
    public constructor() {}
}
