import { type UUID, createHash } from 'crypto'
import { FileReader, type IO as IOManager } from '@obsidian_blogger/helpers'
import { type FTreeNode } from '../../parser/node'
import { PluginCommonConstructor } from '../plugin'
import { type BuildInformation } from './store'
/**
 * @description A unique identifier for a node
 */
export type NodeId = UUID

export interface BuildInfoGeneratorConstructor {
    readonly io: IOManager
    readonly buildPath: {
        contents: string
        assets: string
    }
    readonly pathGenerator: {
        assets: (
            node: FTreeNode,
            config: PluginCommonConstructor
        ) => Promise<string>
        contents: (
            node: FTreeNode,
            config: PluginCommonConstructor
        ) => Promise<string>
    }
}
export class BuildInfoGenerator {
    public constructor(
        private readonly options: BuildInfoGeneratorConstructor
    ) {}

    private get $io() {
        return this.options.io
    }

    private buildPathStore = new Map<string, number>()
    private getBuildPath(path: string): string {
        const name = FileReader.getPureFileName(path)
        const extension = FileReader.getExtension(path)
        const assembled = `${name}.${extension}`
        const count = this.buildPathStore.get(assembled)
        if (!count) {
            this.buildPathStore.set(path, 1)
            return path
        }

        const updatedCount = count + 1
        this.buildPathStore.set(path, updatedCount)
        return `${name}_${updatedCount}.${extension}`
    }
    private getSafeRoutePath(path: string): string {
        const safePath = this.getBuildPath(
            `/${path.split('/').filter(Boolean).join('/')}`
        )
        return safePath
    }

    private encodeHashUUID(inputString: string): UUID {
        const hash = createHash('sha256').update(inputString).digest('hex')
        const uuid: UUID = [...hash]
            .reduce((acc, cur, i) => {
                if (i === 8 || i === 12 || i === 16 || i === 20) {
                    acc.push('-')
                }
                acc.push(cur)
                return acc
            }, [] as Array<string>)
            .join('') as UUID

        return uuid
    }

    private getBaseString(originPath: string, raw: string): string {
        return `${originPath}&${raw}`
    }

    /**
     * @description Generate a unique identifier for a content node
     * @param originPath source path of the content
     */
    public async generateContentBuildInfo(
        contentNode: FTreeNode,
        config: PluginCommonConstructor
    ): Promise<Pick<BuildInformation, 'id' | 'build_path'>> {
        const originPath = contentNode.absolutePath

        const raw = await this.$io.reader.readFile(originPath)
        if (!raw.success)
            throw new Error(`failed to read file at ${originPath}`)

        const buildBaseString = this.getBaseString(originPath, raw.data)

        const generatedRoute = await this.options.pathGenerator.contents(
            contentNode,
            config
        )

        const buildPath = this.getSafeRoutePath(
            `${this.options.buildPath.contents}/${generatedRoute}/${contentNode.fileName}`
        )
        const path = {
            build: buildPath,
            origin: originPath,
        }
        const id = this.encodeHashUUID(buildBaseString)

        return {
            id,
            build_path: path,
        }
    }

    /**
     * @description Generate a unique identifier for an asset node
     * @param originPath source path of the asset
     */
    public async generateAssetBuildInfo(
        assetNode: FTreeNode,
        config: PluginCommonConstructor,
        strict: boolean = false
    ): Promise<Pick<BuildInformation, 'id' | 'build_path'>> {
        const ASSET_PREFIX = {
            image: 'image',
            audio: 'audio',
            unknown: 'unknown',
        } as const
        const prefix =
            assetNode.category === 'IMAGE_FILE'
                ? ASSET_PREFIX.image
                : assetNode.category === 'AUDIO_FILE'
                  ? ASSET_PREFIX.audio
                  : ASSET_PREFIX.unknown

        const originPath = assetNode.absolutePath

        if (strict) {
            const raw = await this.$io.reader.readMedia(originPath)
            if (!raw.success)
                throw new Error(`failed to read file at ${originPath}`)

            const buildBaseString = this.getBaseString(
                originPath,
                raw.data.toString()
            )
            const id = this.encodeHashUUID(buildBaseString)

            const generatedRoute = await this.options.pathGenerator.assets(
                assetNode,
                config
            )

            const buildPath = this.getSafeRoutePath(
                `${this.options.buildPath.assets}/${prefix}/${id}_${generatedRoute}.${assetNode.fileExtension}`
            )
            const path = {
                build: buildPath,
                origin: originPath,
            }

            return {
                id,
                build_path: path,
            }
        }

        const buildBaseString = this.getBaseString(
            originPath,
            assetNode.category
        )
        const id = this.encodeHashUUID(buildBaseString)

        const generatedRoute = await this.options.pathGenerator.assets(
            assetNode,
            config
        )

        const buildPath = this.getSafeRoutePath(
            `${this.options.buildPath.assets}/${prefix}/${id}-${generatedRoute}.${assetNode.fileExtension}`
        )
        return {
            id,
            build_path: {
                build: buildPath,
                origin: originPath,
            },
        }
    }
}
