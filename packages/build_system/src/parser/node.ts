import { FileReader } from '@obsidian_blogger/helpers'
import type { BuildInformation } from '../builder/core/store'

/**
 * Type of file tree node
 */
export type NodeType =
    | 'FOLDER'
    | 'TEXT_FILE'
    | 'IMAGE_FILE'
    | 'AUDIO_FILE'
    | 'UNKNOWN_FILE'

type NodeBuildInfo = Pick<BuildInformation, 'build_path' | 'id' | 'build_state'>

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
export abstract class FileTreeNode {
    /**
     * The children of the file tree node.
     */
    public readonly children: Array<FileTreeNode> | undefined = undefined
    /**
     * The name of the file.
     */
    public fileName: string

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
        public readonly nodeDepth: number,
        public readonly category: NodeType = 'UNKNOWN_FILE',
        public label: string | undefined = undefined
    ) {
        this.fileName = FileReader.getFileNameWithExtension(absolutePath)
    }

    /**
     * Sets the label of the file tree node.
     * @param label The label to set.
     */
    public setLabel(label: string): void {
        this.label = label
    }

    /**
     * The file extension of the file tree node.
     */
    public get fileExtension(): string | undefined {
        return FileReader.getExtension(this.fileName)
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
}

export class FolderNode extends FileTreeNode {
    public override children: FileTreeNode[] = []
    public constructor(
        absolutePath: string,
        nodeDepth: number,
        label?: string
    ) {
        super(absolutePath, nodeDepth, 'FOLDER', label)
    }
}

export type TextFileExtension = 'md' | 'mdx' | 'txt' | 'html'
export class TextFileNode extends FileTreeNode {
    public constructor(
        absolutePath: string,
        nodeDepth: number,
        label?: string
    ) {
        super(absolutePath, nodeDepth, 'TEXT_FILE', label)
    }

    public static override readonly FileExtensionList =
        new Set<TextFileExtension>(['md', 'mdx', 'txt', 'html'])
    public static override readonly is = (
        extension: string | undefined
    ): extension is TextFileExtension =>
        extension
            ? TextFileNode.FileExtensionList.has(extension as TextFileExtension)
            : false

    public override get fileExtension(): TextFileExtension {
        return super.fileExtension as TextFileExtension
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
export class ImageFileNode extends FileTreeNode {
    public constructor(
        absolutePath: string,
        nodeDepth: number,
        label?: string
    ) {
        super(absolutePath, nodeDepth, 'IMAGE_FILE', label)
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

    public override get fileExtension(): ImageFileExtension {
        return super.fileExtension as ImageFileExtension
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
export class AudioFileNode extends FileTreeNode {
    public constructor(
        absolutePath: string,
        nodeDepth: number,
        label?: string
    ) {
        super(absolutePath, nodeDepth, 'AUDIO_FILE', label)
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

    public override get fileExtension(): AudioFileExtension {
        return super.fileExtension as AudioFileExtension
    }
}
