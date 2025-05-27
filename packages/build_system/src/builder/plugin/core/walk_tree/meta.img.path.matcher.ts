import { PolymorphicMeta } from 'packages/build_system/src/meta/engine'
import type { FileTreeNode } from 'packages/build_system/src/parser'
import {
    WalkTreePlugin,
    type WalkTreePluginDynamicConfig,
    type WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'
import { FileReader } from '@obsidian_blogger/helpers/io'

import path from 'node:path'

export type MetaImgPathMatcherStaticConfig = WalkTreePluginStaticConfig
export type MetaImgPathMatcherDynamicConfig = WalkTreePluginDynamicConfig

type ImageReference = Array<{
    origin: string
    build: string
}>

type ReferenceMap = Map<
    string,
    Array<{ origin: string; build: string; buildReplaced: string }>
>

export class MetaImgPathMatcherPlugin extends WalkTreePlugin<
    MetaImgPathMatcherStaticConfig,
    MetaImgPathMatcherDynamicConfig
> {
    public defineStaticConfig(): MetaImgPathMatcherStaticConfig {
        return {
            name: 'meta-img-path-matcher',
            description:
                'Match obsidian image path(e.g., ![[img.png]], ...) in metadata',
        }
    }

    /**
     * Build a Map from the final filename to an array of references that share this filename.
     *
     * @example
     *

     * e.g.  "img.png" -> [
     *   { origin: "nested/img.png", build: "/images/abc_img.png" },
     *   { origin: "img.png",        build: "/images/xyz_img.png" }
     * ]
     * 
*/
    private buildReferenceMap(
        imageReference: ImageReference,
        buildAssetPath: string
    ): Map<
        string,
        Array<{ origin: string; build: string; buildReplaced: string }>
    > {
        const referenceMap: ReferenceMap = new Map()

        for (const ref of imageReference) {
            const pureFilename = FileReader.getFileNameWithExtension(ref.origin)
            if (!pureFilename) continue

            const entry = referenceMap.get(pureFilename) || []

            const posixBuildPath = FileReader.toPosix(ref.build)

            const buildReplaced = posixBuildPath.replace(buildAssetPath, '')

            entry.push({
                origin: ref.origin,
                build: posixBuildPath,
                buildReplaced: buildReplaced,
            })
            referenceMap.set(pureFilename, entry)
        }
        return referenceMap
    }
    private referenceMap: ReferenceMap | undefined = undefined

    public override async prepare(): Promise<void> {
        const buildStore =
            this.getRunTimeDependency('buildStore').getStoreList('current')

        const assetReferencesUUIDList = buildStore
            .filter(
                ({ file_type }) =>
                    file_type === 'IMAGE_FILE' || file_type === 'AUDIO_FILE'
            )
            .map((report) => ({
                build: report.build_path.build,
                origin: report.build_path.origin,
            }))

        const buildAssetPath = FileReader.toPosix(this.$buildPath.assets)

        this.referenceMap = this.buildReferenceMap(
            assetReferencesUUIDList,
            buildAssetPath
        )
    }

    private resolveAssetPath(link: string): string | null {
        const fileNameWithExt = FileReader.getFileNameWithExtension(link)
        const fullFileName = FileReader.toPosix(path.normalize(link))

        if (!fileNameWithExt) return null
        const candidates = this.referenceMap!.get(fileNameWithExt)
        if (!candidates?.length) return null
        if (candidates.length === 1) return candidates[0]!.buildReplaced
        // Prefer exact matches in origin path
        const found = candidates.filter((r) =>
            FileReader.toPosix(r.origin).includes(fileNameWithExt)
        )
        if (found.length === 0) {
            return null
        }
        if (found.length === 1) {
            return found[0]!.buildReplaced
        }

        const exactMatch = found.find((r) =>
            FileReader.toPosix(r.origin).includes(fullFileName)
        )

        if (exactMatch) {
            return exactMatch.buildReplaced
        }

        // If no exact match, return the first candidate
        return found[0]!.buildReplaced
    }

    private static readonly IMG_REGEX = /!\[\[([^[\]]+)\]\]/

    public async walk(node: FileTreeNode): Promise<void> {
        if (node.category !== 'TEXT_FILE') return
        if (!this.referenceMap) {
            this.$logger.error('referenceMap is not initialized')
            throw new Error('referenceMap is not initialized')
        }

        if (!node.buildInfo) {
            this.$logger.error(`build path not defined: ${node.absolutePath}`)
            throw new Error(`build path not defined: ${node.absolutePath}`, {
                cause: node,
            })
        }

        const meta = await this.$meta.extractFromFile(
            node.buildInfo.build_path.build
        )

        if (!meta.success) {
            this.$logger.error(`Meta invalid: ${meta.error}`)
            throw meta.error
        }

        const metaEntries = Object.entries(meta.data.meta)
        const metaHasImg = metaEntries.some(([, value]) => {
            if (typeof value === 'string') {
                return MetaImgPathMatcherPlugin.IMG_REGEX.test(value)
            }
            return false
        })

        if (!metaHasImg) {
            this.$logger.info(
                `Meta img path does not exist: ${node.buildInfo.build_path.build}`
            )
            return
        }

        const updatedMeta = metaEntries.reduce<PolymorphicMeta>(
            (acc, [key, value]) => {
                if (typeof value !== 'string') return acc

                if (MetaImgPathMatcherPlugin.IMG_REGEX.test(value)) {
                    const fileName = MetaImgPathMatcherPlugin.IMG_REGEX.exec(
                        String(value)
                    )
                    if (!fileName) return acc

                    const queryKey = fileName[1]!
                    const queried = this.resolveAssetPath(queryKey)
                    acc[key] = queried ?? value
                }

                return acc
            },
            meta.data.meta
        )

        const updateResponse = await this.$meta.update({
            injectPath: node.buildInfo.build_path.build,
            meta: updatedMeta,
        })

        if (!updateResponse.success) {
            this.$logger.error(`Meta invalid: ${updateResponse.error}`)
            throw updateResponse.error
        } else {
            this.$logger.info(
                `Meta img path founded: ${node.buildInfo.build_path.origin}`
            )
        }
    }
}
