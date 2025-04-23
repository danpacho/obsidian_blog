import { IO, Queue } from '@obsidian_blogger/helpers'
import {
    AudioFileNode,
    FileTreeNode,
    FolderNode,
    ImageFileNode,
    type ParentNodeInfo,
    TextFileNode,
} from './node'

interface FolderSyntax {
    /**
     *  A function that determines if a folder should be included in the tree
     * @param folder information(`name`, `depth`) of the folder
     * @returns `true` if the folder should be included in the tree, `false` otherwise
     */
    readonly folderNameMatcher: (folder: {
        name: string
        depth: number
    }) => boolean
}
interface FileSyntax {
    /**
     *  A function that determines if a file should be included in the tree
     * @param file information(`name`, `depth`) of the file
     * @returns `true` if the file should be included in the tree, `false` otherwise
     */
    readonly fileNameMatcher: (file: { name: string; depth: number }) => boolean
}
interface FileTreeSyntax extends FolderSyntax, FileSyntax {}

export interface WalkOption {
    /**
     * Tree traversal type `DFS` or `BFS`
     */
    type: 'DFS' | 'BFS'
    /**
     * Skip executing walk function for folder node
     */
    skipFolderNode?: boolean
    /**
     * Root node to start walking
     */
    walkRoot?: FileTreeNode
    /**
     * Exclude walking
     */
    exclude?: string | Array<string> | RegExp
}
/**
 * A function that walks through the file tree
 */
export type Walker = (
    /**
     * Current node
     */
    node: FileTreeNode,
    /**
     * Context object
     */
    context: {
        /**
         * Children of the current node
         */
        children: Array<FileTreeNode> | undefined
        /**
         * Siblings of the current node
         */
        siblings: Array<FileTreeNode> | undefined
        /**
         * Current node index in the siblings list
         */
        siblingsIndex: number | undefined
    }
) => Promise<void>

export interface FileTreeParserConstructor {
    rootFolder: string
    readonly io: IO
    /**
     *  A custom tree syntax to determine which files and folders should be included in the tree
     */
    readonly treeSyntax?: Partial<FileTreeSyntax>
}
export class FileTreeParser {
    public constructor(public readonly options: FileTreeParserConstructor) {
        this.updateRootFolder(options.rootFolder)
    }

    private _ast: FolderNode | undefined = undefined
    private _queue: Queue<{
        node: FileTreeNode
        siblings: Array<FileTreeNode> | undefined
        siblingsIndex?: number
    }> = new Queue()
    private get $io(): IO {
        return this.options.io
    }
    public get ast(): FolderNode | undefined {
        return this._ast
    }

    public updateRootFolder(rootFolder: string): void {
        const res = this.$io.finder.findFileSync(rootFolder)
        if (!res.success) {
            throw new Error(`Root path not found:\nCheck ${rootFolder}`)
        }

        const { data } = res

        const firstPath = data[0]?.path
        if (!firstPath) {
            throw new Error(`Root path not found:\nCheck ${rootFolder}`)
        }

        const isUnique = data.length === 1
        if (!isUnique) {
            throw new Error(
                `Root path should be unique:\nCheck ${JSON.stringify(data, null, 2)}`
            )
        }

        this.options.rootFolder = firstPath
        this._ast = new FolderNode(firstPath, 0, 'ROOT')
    }

    private async generateTree(
        root: string = this._ast?.absolutePath ?? '',
        parent?: FolderNode
    ): Promise<FolderNode | undefined> {
        const folderList = await this.$io.reader.readDir(root)
        const parentRoot = parent ?? this._ast
        const parentDepth = parentRoot?.nodeDepth ?? 0
        if (!folderList.success) {
            return parentRoot
        }

        for (const node of folderList.data) {
            const { isDir, extension, path, name } = node
            const childDepth = parentDepth + 1
            const parentInfo: ParentNodeInfo | undefined = parentRoot
                ? {
                      absolutePath: parentRoot.absolutePath,
                      fileName: parentRoot.fileName,
                      node: parentRoot,
                  }
                : undefined

            if (isDir) {
                const folder = new FolderNode(path, childDepth)
                const isValidFolder: boolean =
                    this.options?.treeSyntax?.folderNameMatcher?.({
                        name: folder.fileName,
                        depth: childDepth,
                    }) ?? true
                if (!isValidFolder) {
                    continue
                }
                if (this.exclude(folder.fileName)) {
                    continue
                }
                if (parentInfo) {
                    folder.setParentInfo(parentInfo)
                }
                const nodeChildrenList = await this.generateTree(path, folder)
                if (nodeChildrenList) {
                    parentRoot?.children.push(nodeChildrenList)
                }
                continue
            }

            const isValidFile: boolean =
                this.options?.treeSyntax?.fileNameMatcher?.({
                    name,
                    depth: childDepth,
                }) ?? true
            if (!isValidFile) {
                continue
            }

            if (this.exclude(name)) {
                continue
            }

            if (TextFileNode.is(extension)) {
                const textNode = new TextFileNode(path, childDepth)
                if (parentInfo) {
                    textNode.setParentInfo(parentInfo)
                }
                parentRoot?.children.push(textNode)
            } else if (ImageFileNode.is(extension)) {
                const imageNode = new ImageFileNode(path, childDepth)
                if (parentInfo) {
                    imageNode.setParentInfo(parentInfo)
                }
                parentRoot?.children.push(imageNode)
            } else if (AudioFileNode.is(extension)) {
                const audioNode = new AudioFileNode(path, childDepth)
                if (parentInfo) {
                    audioNode.setParentInfo(parentInfo)
                }
                parentRoot?.children.push(audioNode)
            }
        }

        return parentRoot
    }

    public reset(): void {
        this._ast = undefined
        this.updateRootFolder(this.options.rootFolder)
        this._queue = new Queue()
    }

    public async parse(): Promise<FolderNode> {
        this.reset()
        this._ast = await this.generateTree()

        if (!this._ast) throw new Error('AST undefined, check errors')

        return this._ast
    }

    /**
     * Default exclude patterns
     * @default [/^\.\w+/, /^\./]
     * @description Exclude files that start with a `.`(dot)
     */
    public static defaultExclude = [/^\.\w+/, /^\./]

    private exclude(
        fileName: string,
        pattern: string | Array<string> | RegExp = []
    ) {
        const excludeResult: boolean = [
            ...FileTreeParser.defaultExclude,
            pattern,
        ].some((pattern) => {
            if (typeof pattern === 'string') {
                return pattern === fileName
            }
            if (pattern instanceof RegExp) {
                return pattern.test(fileName)
            }
            return pattern.some((patternName) => patternName === fileName)
        })
        return excludeResult
    }

    private async walkDFS(
        node: FileTreeNode,
        walker: Walker,
        skipFolderNode: boolean = false,
        exclude: string | RegExp | Array<string> | undefined = undefined,
        siblings: Array<FileTreeNode> | undefined = undefined,
        siblingsIndex: number | undefined = undefined
    ): Promise<void> {
        if (!node) return
        if (this.exclude(node.fileName, exclude)) {
            return
        }

        const shouldWalk: boolean = !(
            skipFolderNode && node instanceof FolderNode
        )

        if (shouldWalk) {
            await walker(node, {
                children: node.children,
                siblings,
                siblingsIndex,
            })
        }

        if (!node.children) return
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i]
            if (!child) continue

            await this.walkDFS(
                child,
                walker,
                skipFolderNode,
                exclude,
                node.children,
                i
            )
        }
    }

    private async walkBFS(
        node: FileTreeNode,
        walker: Walker,
        skipFolderNode: boolean = false,
        exclude: string | RegExp | Array<string> | undefined = undefined
    ): Promise<void> {
        if (!node) return
        if (this.exclude(node.fileName, exclude)) {
            return
        }

        this._queue.enqueue({
            node,
            siblings: undefined,
        })

        while (this._queue.size !== 0) {
            const dequeued = this._queue.dequeue()
            if (!dequeued) continue
            const { node, siblings, siblingsIndex } = dequeued

            const shouldWalk: boolean = !(
                skipFolderNode && node instanceof FolderNode
            )

            if (shouldWalk) {
                await walker(node, {
                    children: node.children,
                    siblings,
                    siblingsIndex,
                })
            }

            const nodeChildren = node.children
            if (nodeChildren) {
                for (let i = 0; i < nodeChildren.length; i++) {
                    const child = nodeChildren[i]
                    if (!child) continue

                    this._queue.enqueue({
                        node: child,
                        siblings: nodeChildren,
                        siblingsIndex: i,
                    })
                }
            }
        }
    }

    /**
     * Walk through the file tree
     * @param walker Walk function to execute on each node
     * @param options Walk options
     */
    public async walk(
        walker: Walker,
        options: {
            /**
             * Tree traversal type `DFS` or `BFS`
             */
            type: 'DFS' | 'BFS'
            /**
             * Skip executing walk function for folder node
             */
            skipFolderNode?: boolean
            /**
             * Root node to start walking
             */
            walkRoot?: FileTreeNode
            /**
             * Exclude walking
             */
            exclude?: string | Array<string> | RegExp
        }
    ): Promise<void> {
        const { skipFolderNode, type } = options
        const targetAST = options.walkRoot ?? this._ast
        if (!targetAST) return

        const skipFolderNodeCondition = skipFolderNode ?? false
        if (type === 'DFS') {
            await this.walkDFS(
                targetAST,
                walker,
                skipFolderNodeCondition,
                options.exclude
            )
        } else {
            await this.walkBFS(
                targetAST,
                walker,
                skipFolderNodeCondition,
                options.exclude
            )
        }
    }
}
