import { PathResolver } from '@obsidian_blogger/helpers'

import type { BuildInformation } from '../builder/core/build_store'

/**
 * Type of file tree node
 */
export type NodeType =
    | 'FOLDER'
    | 'TEXT_FILE'
    | 'IMAGE_FILE'
    | 'AUDIO_FILE'
    | 'UNKNOWN_FILE'

type NodeBuildInfo = Pick<
    BuildInformation,
    // ids
    | 'id'
    | 'content_id'
    // stat
    | 'build_state'
    // path
    | 'build_path'
>

export interface ParentNodeInfo {
    absolutePath: string
    fileName: string
    /**
     * The parent node.
     */
    node: FileTreeNode
}
/**
 * Represents an abstract class for a file tree node.
 */
export abstract class FileTreeNode<
    Extension extends string | undefined = string | undefined,
> {
    /**
     * The children of the file tree node.
     */
    public readonly children: Array<FileTreeNode> | undefined = undefined

    /**
     * Excluded status current node.
     */
    public excluded: boolean = false

    /**
     * Mark node as excluded
     */
    public exclude(): void {
        this.excluded = true
    }
    /**
     * Mark node as included
     */
    public include(): void {
        this.excluded = false
    }
    /**
     * The parent information of the file tree node.
     */
    public get parentInfo() {
        return this._parentInfo
    }
    private _parentInfo: ParentNodeInfo | undefined = undefined
    /**
     * Sets the parent information of the file tree node.
     * @param parentInfo The parent information.
     */
    public setParentInfo(parentInfo: ParentNodeInfo): void {
        this._parentInfo = parentInfo
    }

    private _buildInfo: NodeBuildInfo | undefined = undefined
    /**
     * The build information of the file tree node.
     */
    public get buildInfo(): NodeBuildInfo | undefined {
        return this._buildInfo
    }
    /**
     * Injects the build information into the file tree node.
     * @param info The build information.
     */
    public injectBuildInfo(info: NodeBuildInfo): void {
        this._buildInfo = info
    }

    /**
     * Creates a new instance of the FileTreeNode class.
     * @param absolutePath The absolute path of the file.
     * @param nodeDepth The depth of the node in the file tree.
     * @param category The category of the node.
     * @param label The label of the node.
     */
    public constructor(
        public readonly absolutePath: string,
        public readonly fileName: string,
        public readonly fileExtension: Extension,
        public readonly nodeDepth: number,
        public readonly category: NodeType = 'UNKNOWN_FILE',
        public label: string | undefined = undefined
    ) {}

    /**
     * Sets the label of the file tree node.
     * @param label The label to set.
     */
    public setLabel(label: string): void {
        this.label = label
    }

    /**
     * The list of file extensions.
     */
    public static readonly FileExtensionList: Set<string>
    /**
     * Checks if the file extension is in the target.
     * @param extension The file extension to check.
     */
    public static readonly is: (extension: string | undefined) => boolean

    /**
     * Checks whether this node can contain children (is a folder).
     * Returns `true` if the node reports a `children` array or has category 'FOLDER'.
     */
    public isFolder(): this is FolderNode {
        return (
            ((this as any).children !== undefined &&
                Array.isArray((this as any).children)) ||
            this.category === 'FOLDER'
        )
    }

    /**
     * Checks whether this node is a leaf node (cannot have children).
     */
    public isLeaf(): boolean {
        return !this.isFolder()
    }

    /**
     * Returns the parent node if available.
     */
    public getParentNode(): FileTreeNode | undefined {
        return this._parentInfo?.node
    }

    /**
     * Clears the parentInfo, detaching this node from its parent.
     * This does not modify other fields (absolutePath, nodeDepth).
     */
    public clearParentInfo(): void {
        this._parentInfo = undefined
    }

    /**
     * Returns the list of ancestor nodes from immediate parent up to the root.
     * The immediate parent is the first element.
     */
    public getAncestors(): FileTreeNode[] {
        const out: FileTreeNode[] = []
        let cur = this.getParentNode()
        while (cur) {
            out.push(cur)
            cur = cur.getParentNode()
        }
        return out
    }

    /**
     * Returns the path (array of nodes) from the root to this node.
     * Root is first element, this node is last.
     */
    public getPathFromRoot(): FileTreeNode[] {
        const ancestors = this.getAncestors()
        return [...ancestors].reverse().concat([this])
    }

    /**
     * Computes depth dynamically by counting parent links.
     * Note: this returns the computed runtime depth and does not mutate the readonly `nodeDepth` property.
     */
    public getComputedDepth(): number {
        return this.getAncestors().length
    }

    /**
     * Returns `true` if this node is an ancestor of the provided node.
     * Walks the parent chain of `node`.
     */
    public isAncestorOf(node: FileTreeNode): boolean {
        let cur = node.getParentNode()
        while (cur) {
            if (cur === this) return true
            cur = cur.getParentNode()
        }
        return false
    }

    /**
     * Returns `true` if this node is a descendant of the provided node.
     */
    public isDescendantOf(node: FileTreeNode): boolean {
        return node.isAncestorOf(this)
    }

    /**
     * Equality by absolute path.
     * Use when identity semantics are path-based rather than object reference-based.
     */
    public equals(other: FileTreeNode): boolean {
        return this.absolutePath === other.absolutePath
    }

    /**
     * Returns a simple relative path from the provided parent node to this node.
     * If the parent is not actually a parent (paths do not share prefix) returns the absolute path.
     */
    public getRelativePathTo(parent: FileTreeNode): string {
        const relativeToParent = _pathResolver.getRelativePath(
            this.absolutePath,
            parent.absolutePath
        )
        return relativeToParent
    }

    /**
     * Returns a small list of path segments for absolutePath
     */
    public getPathSegments(): string[] {
        return _pathResolver.splitToPathSegments(this.absolutePath)
    }

    /**
     * Checks whether this node has injected build information.
     */
    public hasBuildInfo(): boolean {
        return !!this._buildInfo
    }

    /**
     * Returns the build `id` if available.
     */
    public getBuildId() {
        return this._buildInfo?.id
    }

    /**
     * Returns the content id if available.
     */
    public getContentId() {
        return this._buildInfo?.content_id
    }

    /**
     * Convenience accessor for file extension on the instance.
     */
    public getFileExtension(): Extension {
        return this.fileExtension
    }

    /**
     * Checks whether this node matches the provided node type.
     * Use for quick category checks (e.g. 'TEXT_FILE', 'FOLDER').
     */
    public isOfType(t: NodeType): boolean {
        return this.category === t
    }
}

const _pathResolver = new PathResolver()

export class FolderNode extends FileTreeNode<undefined> {
    public override children: FileTreeNode<undefined | string>[] = []
    public constructor(
        absolutePath: string,
        nodeDepth: number,
        label?: string
    ) {
        super(
            absolutePath,
            _pathResolver.getFileNameWithExtension(absolutePath),
            undefined,
            nodeDepth,
            'FOLDER',
            label
        )
    }

    /**
     * Adds a child node to this folder.
     * If `position` is provided the child will be inserted at that index, otherwise appended.
     * Returns `true` if the add was successful.
     *
     * This method will:
     * - refuse to add a node into its own descendant (cycle protection).
     * - detach the child from its previous parent (if any FolderNode parent exists).
     * - set child's `parentInfo` to point to this node.
     *
     * Note: this does not change readonly fields such as `absolutePath` or `nodeDepth`.
     */
    public addChild(child: FileTreeNode, position?: number): boolean {
        // disallow self-insert
        if (child === this) return false
        // cycle check: child must not be ancestor of this
        if (child.isAncestorOf(this)) return false

        // remove from old parent (if a FolderNode)
        const oldParent = child.getParentNode()
        if (oldParent && oldParent instanceof FolderNode) {
            oldParent.removeChild(child)
        }

        if (!this.children) this.children = []

        const pos =
            typeof position === 'number'
                ? Math.max(0, Math.min(position, this.children.length))
                : this.children.length

        this.children.splice(pos, 0, child)
        child.setParentInfo({
            absolutePath: this.absolutePath,
            fileName: this.fileName,
            node: this,
        })
        return true
    }

    /**
     * Removes a direct child from this folder.
     * Returns `true` if the child was found and removed.
     * The removed child will have its `parentInfo` cleared.
     */
    public removeChild(child: FileTreeNode): boolean {
        if (!this.children) return false
        const idx = this.children.indexOf(child)
        if (idx === -1) return false
        this.children.splice(idx, 1)
        // detach
        child.clearParentInfo()
        return true
    }

    /**
     * Removes a direct child by index.
     * Returns the removed child instance or `undefined` if index out of range.
     */
    public removeChildAt(index: number): FileTreeNode | undefined {
        if (!this.children) return undefined
        if (index < 0 || index >= this.children.length) return undefined
        const [removed] = this.children.splice(index, 1)
        removed!.clearParentInfo()
        return removed
    }

    /**
     * Returns the index of the provided direct child, or -1 if not found.
     */
    public indexOf(child: FileTreeNode): number {
        if (!this.children) return -1
        return this.children.indexOf(child)
    }

    /**
     * Depth-first traversal generator starting at this folder.
     * Yields this folder first, then its descendants.
     * Iterative implementation avoids recursion limits.
     */
    public *traverseDFS(): Generator<FileTreeNode, void, unknown> {
        const stack: FileTreeNode[] = [this]
        while (stack.length) {
            const node = stack.pop()!
            yield node
            if (node.isFolder()) {
                const children = (node as FolderNode).children ?? []
                // push children in reverse to preserve left-to-right order
                if (children.length === 0) {
                    continue
                }
                for (let i = children.length - 1; i >= 0; --i)
                    stack.push(children[i]!)
            }
        }
    }

    /**
     * Breadth-first traversal starting at this folder.
     * Iterative queue implementation.
     */
    public *traverseBFS(): Generator<FileTreeNode, void, unknown> {
        const queue: FileTreeNode[] = [this]
        while (queue.length) {
            const node = queue.shift()!
            yield node
            if (node.isFolder()) {
                const children = (node as FolderNode).children ?? []
                for (const c of children) queue.push(c)
            }
        }
    }

    /**
     * Finds the first node in this subtree satisfying the predicate using DFS.
     */
    public find(
        predicate: (node: FileTreeNode) => boolean
    ): FileTreeNode | undefined {
        for (const n of this.traverseDFS()) {
            if (predicate(n)) return n
        }
        return undefined
    }

    /**
     * Finds all nodes in this subtree satisfying the predicate.
     */
    public findAll(predicate: (node: FileTreeNode) => boolean): FileTreeNode[] {
        const out: FileTreeNode[] = []
        for (const n of this.traverseDFS()) {
            if (predicate(n)) out.push(n)
        }
        return out
    }

    /**
     * Finds a node by its absolute path in this subtree.
     */
    public findByAbsolutePath(absolutePath: string): FileTreeNode | undefined {
        return this.find((n) => n.absolutePath === absolutePath)
    }

    /**
     * Finds a node by file name in this subtree.
     * Returns the first match found in DFS order.
     */
    public findByFileName(fileName: string): FileTreeNode | undefined {
        return this.find((n) => n.fileName === fileName)
    }

    /**
     * Returns all descendant nodes (excludes this folder).
     */
    public getDescendants(): FileTreeNode[] {
        const out: FileTreeNode[] = []
        for (const n of this.traverseDFS()) {
            if (n !== this) out.push(n)
        }
        return out
    }

    /**
     * Returns all leaf nodes contained in this subtree.
     */
    public getLeaves(): FileTreeNode[] {
        const out: FileTreeNode[] = []
        for (const n of this.traverseDFS()) {
            if (n.isLeaf()) out.push(n)
        }
        return out
    }

    /**
     * Returns the number of nodes in this subtree including this folder.
     */
    public size(): number {
        let c = 0
        for (const _ of this.traverseDFS()) c++
        return c
    }

    /**
     * Returns true if the folder has no children or children array is empty.
     */
    public isEmpty(): boolean {
        return !this.children || this.children.length === 0
    }

    /**
     * Sorts direct children in-place using the provided comparator.
     * If no comparator is provided children are sorted by fileName.
     */
    public sortChildren(
        comparator?: (a: FileTreeNode, b: FileTreeNode) => number
    ): void {
        if (!this.children) return
        if (!comparator) {
            this.children.sort((x, y) =>
                x.fileName < y.fileName ? -1 : x.fileName > y.fileName ? 1 : 0
            )
        } else {
            this.children.sort(comparator)
        }
    }

    /**
     * Replaces an existing direct child with a new node, preserving index.
     * Returns true on success.
     */
    public replaceChild(
        oldChild: FileTreeNode,
        newChild: FileTreeNode
    ): boolean {
        if (!this.children) return false
        const idx = this.children.indexOf(oldChild)
        if (idx === -1) return false
        // cycle check
        if (newChild.isAncestorOf(this)) return false
        // detach old
        oldChild.clearParentInfo()
        // attach new
        this.children[idx] = newChild
        newChild.setParentInfo({
            absolutePath: this.absolutePath,
            fileName: this.fileName,
            node: this,
        })
        return true
    }

    /**
     * Move a direct child of this folder to another FolderNode.
     * Returns true on success.
     *
     * This operation will:
     * - remove the child from this folder (if present),
     * - insert it into `targetFolder` at optional `position`,
     * - update the child's parentInfo to the target folder.
     *
     * It will refuse the move if it would create a cycle.
     */
    public moveChildTo(
        child: FileTreeNode,
        targetFolder: FolderNode,
        position?: number
    ): boolean {
        if (!this.children) return false
        const idx = this.children.indexOf(child)
        if (idx === -1) return false
        // cannot move into descendant
        if (child.isAncestorOf(targetFolder)) return false
        // remove from old
        this.children.splice(idx, 1)
        child.clearParentInfo()
        // add to target
        return targetFolder.addChild(child, position)
    }
}

export type TextFileExtension = 'md' | 'mdx' | 'txt' | 'html'
export class TextFileNode extends FileTreeNode<TextFileExtension> {
    public constructor(
        absolutePath: string,
        nodeDepth: number,
        label?: string
    ) {
        super(
            absolutePath,
            _pathResolver.getFileNameWithExtension(absolutePath),
            _pathResolver.getExtension(absolutePath) as TextFileExtension,
            nodeDepth,
            'TEXT_FILE',
            label
        )
    }

    public static override readonly FileExtensionList =
        new Set<TextFileExtension>(['md', 'mdx', 'txt', 'html'])
    public static override readonly is = (
        extension: string | undefined
    ): extension is TextFileExtension =>
        extension
            ? TextFileNode.FileExtensionList.has(extension as TextFileExtension)
            : false

    /**
     * Returns true when this node is a text file (by category or extension).
     */
    public isTextFile(): boolean {
        return (
            this.category === 'TEXT_FILE' || TextFileNode.is(this.fileExtension)
        )
    }

    /**
     * Returns the display title for previews: prefer `label` then `fileName`.
     */
    public getPreviewTitle(): string {
        return this.label ?? this.fileName
    }

    /**
     * Checks whether this node's extension matches the provided extension.
     */
    public matchesExtension(extension: string | undefined): boolean {
        return TextFileNode.is(extension) && this.fileExtension === extension
    }
}

export type ImageFileExtension =
    | 'png'
    | 'jpg'
    | 'jpeg'
    | 'gif'
    | 'svg'
    | 'webp'
    | 'tiff'
    | 'bmp'
    | 'ico'
    | 'avif'
    | 'apng'
    | 'heif'
    | 'heic'
export class ImageFileNode extends FileTreeNode<ImageFileExtension> {
    public constructor(
        absolutePath: string,
        nodeDepth: number,
        label?: string
    ) {
        super(
            absolutePath,
            _pathResolver.getFileNameWithExtension(absolutePath),
            _pathResolver.getExtension(absolutePath) as ImageFileExtension,
            nodeDepth,
            'IMAGE_FILE',
            label
        )
    }

    public static override readonly FileExtensionList =
        new Set<ImageFileExtension>([
            'png',
            'jpg',
            'jpeg',
            'gif',
            'svg',
            'webp',
            'tiff',
            'bmp',
            'ico',
            'avif',
            'apng',
            'heif',
            'heic',
        ])

    public static override readonly is = (
        extension: string | undefined
    ): extension is ImageFileExtension =>
        extension
            ? ImageFileNode.FileExtensionList.has(
                  extension as ImageFileExtension
              )
            : false

    /**
     * Returns true when this node is an image file (by category or extension).
     */
    public isImageFile(): boolean {
        return (
            this.category === 'IMAGE_FILE' ||
            ImageFileNode.is(this.fileExtension)
        )
    }

    /**
     * Returns a short label suitable for image lists: prefer label, then filename.
     */
    public getDisplayLabel(): string {
        return this.label ?? this.fileName
    }

    /**
     * Checks whether this node's extension matches the provided extension.
     */
    public matchesExtension(extension: string | undefined): boolean {
        return ImageFileNode.is(extension) && this.fileExtension === extension
    }
}

export type AudioFileExtension =
    | 'mp3'
    | 'wav'
    | 'ogg'
    | 'flac'
    | 'aac'
    | 'wma'
    | 'alac'
    | 'aiff'
export class AudioFileNode extends FileTreeNode<AudioFileExtension> {
    public constructor(
        absolutePath: string,
        nodeDepth: number,
        label?: string
    ) {
        super(
            absolutePath,
            _pathResolver.getFileNameWithExtension(absolutePath),
            _pathResolver.getExtension(absolutePath) as AudioFileExtension,
            nodeDepth,
            'AUDIO_FILE',
            label
        )
    }

    public static override readonly FileExtensionList =
        new Set<AudioFileExtension>([
            'mp3',
            'wav',
            'ogg',
            'flac',
            'aac',
            'wma',
            'alac',
            'aiff',
        ])

    public static override readonly is = (
        extension: string | undefined
    ): extension is AudioFileExtension =>
        extension
            ? AudioFileNode.FileExtensionList.has(
                  extension as AudioFileExtension
              )
            : false

    /**
     * Returns true when this node is an audio file (by category or extension).
     */
    public isAudioFile(): boolean {
        return (
            this.category === 'AUDIO_FILE' ||
            AudioFileNode.is(this.fileExtension)
        )
    }

    /**
     * Returns a user-friendly label for audio lists.
     */
    public getDisplayLabel(): string {
        return this.label ?? this.fileName
    }

    /**
     * Checks whether this node's extension matches the provided extension.
     */
    public matchesExtension(extension: string | undefined): boolean {
        return AudioFileNode.is(extension) && this.fileExtension === extension
    }
}
