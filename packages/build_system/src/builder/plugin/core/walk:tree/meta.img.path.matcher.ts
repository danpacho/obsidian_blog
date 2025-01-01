import { PolymorphicMeta } from 'packages/build_system/src/meta/engine'
import type { FileTreeNode } from 'packages/build_system/src/parser'
import {
    WalkTreePlugin,
    type WalkTreePluginDynamicConfig,
    type WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'

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

export class MetaImgPathMatcher extends WalkTreePlugin<
    MetaImgPathMatcherStaticConfig,
    MetaImgPathMatcherDynamicConfig
> {
    public defineStaticConfig(): MetaImgPathMatcherStaticConfig {
        return {
            name: 'meta-img-path-matcher',
            description: 'Match obsidian image path in metadata',
        }
    }

    private getFileName(path: string): string | null {
        const pathSplit = path.split('/')
        return pathSplit[pathSplit.length - 1] ?? null
    }
    /**
     * Build a Map from the final filename to an array of references that share this filename.
     *
     * @example
     * ```
     * e.g.  "img.png" -> [
     *   { origin: "nested/img.png", build: "/images/abc_img.png" },
     *   { origin: "img.png",        build: "/images/xyz_img.png" }
     * ]
     * ```
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
            const pureFilename = this.getFileName(ref.origin)
            if (!pureFilename) continue

            const entry = referenceMap.get(pureFilename) || []

            entry.push({
                origin: ref.origin,
                build: ref.build,
                buildReplaced: ref.build.replace(buildAssetPath, ''),
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

        const buildAssetPath = this.$buildPath.assets

        this.referenceMap = this.buildReferenceMap(
            assetReferencesUUIDList,
            buildAssetPath
        )
    }

    private resolveAssetPath(link: string): string | null {
        const pureFilename = this.getFileName(link)
        if (!pureFilename) return null

        const possibleRefs = this.referenceMap?.get(pureFilename)
        if (!possibleRefs || possibleRefs.length === 0) return null

        if (possibleRefs.length === 1) {
            return possibleRefs[0]!.buildReplaced
        }

        const queriedLink = link.startsWith('./') ? link.slice(2) : link
        const found = possibleRefs.find((ref) =>
            ref.origin.includes(queriedLink)
        )
        if (found) {
            return found.buildReplaced
        }

        return null
    }

    private static readonly IMG_REGEX = /!\[\[([^[\]]+)\]\]/

    public async walk(node: FileTreeNode): Promise<void> {
        if (node.category !== 'TEXT_FILE') return
        if (!this.referenceMap) {
            this.$logger.error('referenceMap is not initialized')
            return
        }

        if (!node.buildInfo) {
            this.$logger.error(`build path not defined: ${node.absolutePath}`)
            return
        }

        const meta = await this.$meta.extractFromFile(
            node.buildInfo.build_path.build
        )

        if (!meta.success) {
            this.$logger.error(`Meta invalid: ${meta.error}`)
            return
        }

        const metaEntries = Object.entries(meta.data.meta)
        const metaHasImg = metaEntries.some(([, value]) => {
            if (typeof value === 'string') {
                return MetaImgPathMatcher.IMG_REGEX.test(value)
            }
            return false
        })

        if (!metaHasImg) {
            this.$logger.info(
                `Meta Img Path does not exist: ${node.buildInfo.build_path.build}`
            )
            return
        }

        const updatedMeta = metaEntries.reduce<PolymorphicMeta>(
            (acc, [key, value]) => {
                if (typeof value !== 'string') return acc

                if (MetaImgPathMatcher.IMG_REGEX.test(value)) {
                    const fileName = MetaImgPathMatcher.IMG_REGEX.exec(
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
        } else {
            this.$logger.info(
                `Meta Img Path Matched: ${node.buildInfo.build_path.build}`
            )
        }
    }
}
