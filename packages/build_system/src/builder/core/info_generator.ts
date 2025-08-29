import { type UUID, createHash } from 'crypto'

import { type IO } from '@obsidian_blogger/helpers'

import type { BuildInformation } from './build_store'
import type { FileTreeNode } from '../../parser/node'
import type { BuildPluginDependencies } from '../plugin/build.plugin'

/**
 *  A unique identifier for a node
 */
export type NodeId = UUID

/**
 *  Unique content identifier id for a node
 */
export type ContentId = UUID

/**
 * A function that generates a build path for a node
 * @description **internally, automatically handles OS specific path separators.**
 *
 * @param node The node to generate a path for
 * @param buildTools The build tools
 * @returns The target generated path
 * @example
 * ```ts
 * const pathGenerator: PathGenerator = async (node, { vaultRoot }) => {
 *     return `${node.fileName}`
 * }
 * // CurrentNode    -> "example.md"
 * // Generated Path -> "{{vaultRoot}}/example.md`"
 * ```
 */
export type PathGenerator = (
    node: FileTreeNode,
    buildTools: BuildPluginDependencies
) => Promise<string>
export interface BuildInfoGeneratorConstructor {
    readonly io: IO
    /**
     * Base build path for the `content` and `asset` nodes
     */
    readonly buildPath: {
        /**
         * Base build path for the `content` node
         */
        contents: string
        /**
         * Base build path for the `asset` node
         */
        assets: string
    }
    /**
     * Generate a build path for the `content` and `asset` node
     */
    readonly pathGenerator: {
        /**
         * A function that generates a build path for a content node
         * @example
         * ```ts
         * // This will generate a path for a content node
         * `${buildPath.contents}/${GEN_PATH}/${node.fileName}`
         * ```
         */
        contents: PathGenerator
        /**
         * A function that generates a build path for an asset node
         * @example
         * ```ts
         * // This will generate a path for an asset node
         * `${buildPath.assets}/${prefix}/${id}_${GEN_PATH}.${node.fileExtension}`
         * ```
         */
        assets?: PathGenerator
    }
}

type BuildInfoGenerationTarget = Pick<
    BuildInformation,
    'id' | 'content_id' | 'build_path'
>

export class BuildInfoGenerator {
    public constructor(
        private readonly options: BuildInfoGeneratorConstructor
    ) {}

    private get $io() {
        return this.options.io
    }

    private buildPathStore = new Map<string, number>()

    private getBuildPath(assembledName: string): string {
        const count = this.buildPathStore.get(assembledName) || 0
        this.buildPathStore.set(assembledName, count + 1)

        return count === 0
            ? assembledName
            : assembledName.replace(
                  /^(.*)\.([^.]*)$/,
                  (_, name, ext) => `${name}_${count + 1}.${ext}`
              )
    }

    private getSafeRoutePath(...routes: Array<string>): string {
        // 1) unify separators
        const purifiedRoutes = routes
            .map((route) => route.replace(/[@{}[\]()<>?!#+=~^'"`\s]/g, ''))
            .filter(Boolean)

        const route = this.$io.pathResolver.join(...purifiedRoutes)

        // 2) automatically resolve to OS specific path
        // e.g. /path/to/file.md -> C:\path\to\file.md
        const normalizedRoute = this.$io.pathResolver.resolveToOsPath(route)

        const buildPath = this.getBuildPath(normalizedRoute)
        return buildPath
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

    private getNodeHashSeed(originPath: string, raw: string): string {
        return `${originPath}&${raw}`
    }

    private getContentHashSeed(raw: string): string {
        return raw
    }

    /**
     *  Generate a unique identifier for a content node
     * @param originPath source path of the content
     */
    public async generateContentBuildInfo(
        contentNode: FileTreeNode,
        buildTools: BuildPluginDependencies
    ): Promise<BuildInfoGenerationTarget> {
        const originPath = contentNode.absolutePath

        const raw = await this.$io.reader.readFile(originPath)
        if (!raw.success)
            throw new Error(`failed to read file at ${originPath}`)

        const buildBaseString = this.getNodeHashSeed(originPath, raw.data)
        const contentBuildBaseString = this.getContentHashSeed(raw.data)

        const generatedRoute = this.$io.pathResolver.resolveToOsPath(
            await this.options.pathGenerator.contents(contentNode, buildTools)
        )

        const buildPath = this.getSafeRoutePath(
            this.options.buildPath.contents,
            generatedRoute,
            contentNode.fileName
        )
        const path = {
            build: buildPath,
            origin: originPath,
        }
        const id = this.encodeHashUUID(buildBaseString)
        const contentId = this.encodeHashUUID(contentBuildBaseString)

        return {
            id,
            content_id: contentId,
            build_path: path,
        }
    }

    /**
     *  Generate a unique identifier for an asset node
     * @param originPath source path of the asset
     */
    public async generateAssetBuildInfo(
        assetNode: FileTreeNode,
        buildTools: BuildPluginDependencies,
        strict: boolean = false
    ): Promise<BuildInfoGenerationTarget> {
        const ASSET_PREFIX = {
            image: 'images',
            audio: 'audios',
            unknown: 'unknowns',
        } as const
        const prefix =
            assetNode.category === 'IMAGE_FILE'
                ? ASSET_PREFIX.image
                : assetNode.category === 'AUDIO_FILE'
                  ? ASSET_PREFIX.audio
                  : ASSET_PREFIX.unknown

        const originPath = assetNode.absolutePath

        let id: NodeId
        let contentId: ContentId
        if (strict) {
            const raw = await this.$io.reader.readMedia(originPath)
            if (!raw.success) {
                const rawSize = String(
                    await this.$io.reader.getSize(originPath)
                )
                const buildBaseString = this.getNodeHashSeed(
                    originPath,
                    rawSize
                )
                const contentBuildBaseString = this.getContentHashSeed(rawSize)
                id = this.encodeHashUUID(buildBaseString)
                contentId = this.encodeHashUUID(contentBuildBaseString)
            } else {
                const rawString = raw.data.toString()
                const buildBaseString = this.getNodeHashSeed(
                    originPath,
                    rawString
                )
                const contentBuildBaseString =
                    this.getContentHashSeed(rawString)
                id = this.encodeHashUUID(buildBaseString)
                contentId = this.encodeHashUUID(contentBuildBaseString)
            }
        } else {
            const rawSize = String(await this.$io.reader.getSize(originPath))
            const buildBaseString = this.getNodeHashSeed(originPath, rawSize)
            const contentBuildBaseString = this.getContentHashSeed(rawSize)
            id = this.encodeHashUUID(buildBaseString)
            contentId = this.encodeHashUUID(contentBuildBaseString)
        }

        const generatedAssetPath = await this.options.pathGenerator.assets?.(
            assetNode,
            buildTools
        )
        const generatedRoute: string | undefined = generatedAssetPath
            ? this.$io.pathResolver.resolveToOsPath(generatedAssetPath)
            : undefined

        const resultId: string = generatedRoute
            ? `${id}_${generatedRoute}`
            : `${id}_${this.$io.pathResolver.getFileName(assetNode.fileName)}`

        const buildPath: string = this.getSafeRoutePath(
            this.options.buildPath.assets,
            prefix,
            `${resultId}.${assetNode.fileExtension}`
        )
        return {
            id,
            content_id: contentId,
            build_path: {
                build: buildPath,
                origin: originPath,
            },
        }
    }
}
