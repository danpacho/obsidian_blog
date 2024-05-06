import { FilePathFinder, FileReader, IO as IOManager } from '@blogger/helpers'
import {
    AudioFileNode,
    FTreeNode,
    FolderNode,
    ImageFileNode,
    TextFileNode,
} from './node'

interface FolderSyntax {
    /**
     * @description A function that determines if a folder should be included in the tree
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
     * @description A function that determines if a file should be included in the tree
     * @param file information(`name`, `depth`) of the file
     * @returns `true` if the file should be included in the tree, `false` otherwise
     */
    readonly fileNameMatcher: (file: { name: string; depth: number }) => boolean
}
interface FileTreeSyntax extends FolderSyntax, FileSyntax {}

export interface FileTreeParserConstructor {
    rootFolder: string
    readonly io: IOManager
    /**
     * @description A custom tree syntax to determine which files and folders should be included in the tree
     */
    readonly treeSyntax?: Partial<FileTreeSyntax>
}
export class FileTreeParser {
    public constructor(public readonly options: FileTreeParserConstructor) {
        this.updateRootFolder(options.rootFolder)
    }

    private _ast: FolderNode | undefined = undefined
    private get $reader(): FileReader {
        return this.options.io.reader
    }
    private get $finder(): FilePathFinder {
        return this.options.io.finder
    }
    public get ast(): FolderNode | undefined {
        return this._ast
    }

    public updateRootFolder(rootFolder: string): void {
        const res = this.$finder.findFileSync(rootFolder)
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
        const folderList = await this.$reader.readDir(root)
        const parentRoot = parent ?? this._ast
        const parentDepth = parentRoot?.nodeDepth ?? 0
        if (!folderList.success) {
            return parentRoot
        }

        for (const node of folderList.data) {
            const { isDir, extension, path, name } = node
            const childDepth = parentDepth + 1
            const parentInfo = parentRoot
                ? {
                      absolutePath: parentRoot.absolutePath,
                      fileName: parentRoot.fileName,
                  }
                : undefined

            if (isDir) {
                const folder = new FolderNode(path, childDepth)
                const isValidFolder: boolean =
                    this.options?.treeSyntax?.folderNameMatcher?.({
                        name: folder.fileName,
                        depth: childDepth,
                    }) ?? true
                if (!isValidFolder) continue

                if (parentInfo) folder.setParentInfo(parentInfo)
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
            if (!isValidFile) continue

            if (TextFileNode.is(extension)) {
                const textNode = new TextFileNode(path, childDepth)
                if (parentInfo) textNode.setParentInfo(parentInfo)
                parentRoot?.children.push(textNode)
            } else if (ImageFileNode.is(extension)) {
                const imageNode = new ImageFileNode(path, childDepth)
                if (parentInfo) imageNode.setParentInfo(parentInfo)
                parentRoot?.children.push(imageNode)
            } else if (AudioFileNode.is(extension)) {
                const audioNode = new AudioFileNode(path, childDepth)
                if (parentInfo) audioNode.setParentInfo(parentInfo)
                parentRoot?.children.push(audioNode)
            }
        }

        return parentRoot
    }

    public async parse(): Promise<FolderNode> {
        const generated = await this.generateTree()
        this._ast = generated

        if (!this._ast) throw new Error('AST undefined, check errors')

        return this._ast
    }

    public async walkAST(
        children: Array<FTreeNode>,
        walker: (
            node: FTreeNode,
            i: number,
            children: Array<FTreeNode>
        ) => Promise<void>,
        skipFolderNode: boolean = false
    ): Promise<void> {
        if (!children || children.length === 0) return

        for (let i = 0; i < children.length; i++) {
            const child = children[i]
            if (child instanceof FolderNode) {
                if (!skipFolderNode) {
                    await walker(child, i, children)
                }
                await this.walkAST(child.children, walker, skipFolderNode)
            } else {
                await walker(child!, i, children)
            }
        }

        return
    }
}
