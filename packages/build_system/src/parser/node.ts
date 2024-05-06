import { FileReader } from '@blogger/helpers'
import type { BuildInformation } from '../builder/core/store'

export type NodeType =
    | 'FOLDER'
    | 'TEXT_FILE'
    | 'IMAGE_FILE'
    | 'AUDIO_FILE'
    | 'UNKNOWN_FILE'

type NodeBuildInfo = Pick<BuildInformation, 'build_path' | 'id'>

export abstract class FTreeNode {
    public readonly children: FTreeNode[] | undefined = undefined
    public fileName: string

    public get parentInfo() {
        return this._parentInfo
    }
    private _parentInfo:
        | {
              absolutePath: string
              fileName: string
          }
        | undefined = undefined
    public setParentInfo(parentInfo: {
        absolutePath: string
        fileName: string
    }): void {
        this._parentInfo = parentInfo
    }

    private _buildInfo: NodeBuildInfo | undefined = undefined
    public get buildInfo(): NodeBuildInfo | undefined {
        return this._buildInfo
    }
    public injectBuildInfo(info: NodeBuildInfo): void {
        this._buildInfo = info
    }

    public constructor(
        public readonly absolutePath: string,
        public readonly nodeDepth: number,
        public readonly category: NodeType = 'UNKNOWN_FILE',
        public label: string | undefined = undefined
    ) {
        this.fileName = FTreeNode.getFileName(absolutePath)
    }

    public setLabel(label: string): void {
        this.label = label
    }

    private static getFileName(basePath: string): string {
        const pathList = basePath.split('/')

        const fileNameTarget = pathList[pathList.length - 1]
        if (!fileNameTarget) {
            throw new Error('File name not found')
        }
        return fileNameTarget
    }

    public get fileExtension(): string | undefined {
        return FileReader.getExtension(this.fileName)
    }

    /**
     * @description category of data node tags
     */
    public static readonly FileExtensionList: Set<string>
    /**
     * @description get current tagName is in data node category
     */
    public static readonly is: (extension: string | undefined) => boolean
}

export class FolderNode extends FTreeNode {
    public override children: FTreeNode[] = []
    public constructor(
        absolutePath: string,
        nodeDepth: number,
        label?: string
    ) {
        super(absolutePath, nodeDepth, 'FOLDER', label)
    }
}

export type TextFileExtension = 'md' | 'mdx' | 'txt' | 'html'
export class TextFileNode extends FTreeNode {
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
export class ImageFileNode extends FTreeNode {
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
export class AudioFileNode extends FTreeNode {
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
