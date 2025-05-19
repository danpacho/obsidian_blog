import { type UUID, createHash } from 'crypto'
import { FileReader, type IO } from '@obsidian_blogger/helpers'
import type { FileTreeNode } from '../../parser/node'
import type { BuildPluginDependencies } from '../plugin/build.plugin'
import type { BuildInformation } from './store'
import path, { posix, win32 } from 'path'

/**
 *  A unique identifier for a node
 */
export type NodeId = UUID
/**
 * A function that generates a build path for a node
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
        const route = path.join(...routes)
        const normalizedRoute = path.normalize(route)

        const DIVIDER = '|' as const
        const unified = normalizedRoute.replaceAll(path.sep, DIVIDER)

        // 2) split & drop any empty pieces
        const routeSegments = unified
            .split(DIVIDER)
            // remove unnecessary characters
            .map((e) => e.replace(/[@{}\[\]\(\)<>?!#+=~^'"`\s]/g, ''))
            .filter(Boolean)

        let safeRoute: string
        if (process.platform === 'win32') {
            // Windows: back-slashes, no leading slash
            safeRoute = win32.join(...routeSegments)
            safeRoute = win32.normalize(safeRoute)
        } else {
            // macOS/Linux: forward-slashes, ensure leading slash
            safeRoute = posix.join('/', ...routeSegments)
            safeRoute = posix.normalize(safeRoute)
        }

        const buildPath = this.getBuildPath(safeRoute)

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

    private getBaseString(originPath: string, raw: string): string {
        return `${originPath}&${raw}`
    }

    /**
     *  Generate a unique identifier for a content node
     * @param originPath source path of the content
     */
    public async generateContentBuildInfo(
        contentNode: FileTreeNode,
        buildTools: BuildPluginDependencies
    ): Promise<Pick<BuildInformation, 'id' | 'build_path'>> {
        const originPath = contentNode.absolutePath

        const raw = await this.$io.reader.readFile(originPath)
        if (!raw.success)
            throw new Error(`failed to read file at ${originPath}`)

        const buildBaseString = this.getBaseString(originPath, raw.data)

        const generatedRoute = await this.options.pathGenerator.contents(
            contentNode,
            buildTools
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

        return {
            id,
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
    ): Promise<Pick<BuildInformation, 'id' | 'build_path'>> {
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
        if (strict) {
            const raw = await this.$io.reader.readMedia(originPath)
            if (!raw.success) {
                const buildBaseString = this.getBaseString(
                    originPath,
                    assetNode.category
                )
                id = this.encodeHashUUID(buildBaseString)
            } else {
                const buildBaseString = this.getBaseString(
                    originPath,
                    raw.data.toString()
                )
                id = this.encodeHashUUID(buildBaseString)
            }
        } else {
            const buildBaseString = this.getBaseString(
                originPath,
                assetNode.category
            )
            id = this.encodeHashUUID(buildBaseString)
        }

        const generatedRoute: string | undefined =
            await this.options.pathGenerator.assets?.(assetNode, buildTools)

        const resultId: string = generatedRoute
            ? `${id}_${generatedRoute}`
            : `${id}_${FileReader.getFileName(assetNode.fileName)}`

        const buildPath: string = this.getSafeRoutePath(
            this.options.buildPath.assets,
            prefix,
            `${resultId}.${assetNode.fileExtension}`
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
