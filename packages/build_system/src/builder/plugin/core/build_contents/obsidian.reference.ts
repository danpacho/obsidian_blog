import type { Parent, RootContent } from 'mdast'
import { AudioFileNode, ImageFileNode } from 'packages/build_system/src/parser'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import type { BuildStoreList } from '../../../core'
import {
    BuildContentsPlugin,
    type BuildContentsPluginStaticConfig,
} from '../../build.contents.plugin'
import { FileReader } from '@obsidian_blogger/helpers/io'

import path from 'node:path'

type ImageReference = Array<{
    origin: string
    build: string
}>

type ObsidianReferencePluginOptions = {
    referenceMap: Map<
        string,
        Array<{
            origin: string
            build: string
            buildReplaced: string
        }>
    >
}

// Matches e.g. ![[img.png]] inside text nodes
const EMBED_LINK_REGEX = /!\[\[([^[\]]+)\]\]/g

/* ───────────────────────────────────────────────────────────────────────────
 *  1.  Normalise any path-like string to POSIX form so “\” never appears.
 * ─────────────────────────────────────────────────────────────────────────── */
const toPosix = (p: string): string =>
    path
        .normalize(p) // collapses “.”, “..”, duplicate seps
        .split(path.sep)
        .join('/') // force forward slashes everywhere

/* ───────────────────────────────────────────────────────────────────────────
 *  3.  Resolve markdown/HTML asset path → build path, regardless of OS.
 * ─────────────────────────────────────────────────────────────────────────── */
const resolveAssetPath = (
    link: string,
    referenceMap: ObsidianReferencePluginOptions['referenceMap']
): string | null => {
    const pureFilename = FileReader.getFileName(link)
    if (!pureFilename) return null

    const possibleRefs = referenceMap.get(pureFilename)
    if (!possibleRefs?.length) return null

    /* Fast exit when only one match exists */
    if (possibleRefs.length === 1) return possibleRefs[0]!.buildReplaced

    /* Multiple refs → compare normalised origins */
    const queried = toPosix(link.replace(/^\.\//, '')) // strip leading “./”
    const found = possibleRefs.find((ref) =>
        toPosix(ref.origin).includes(queried)
    )

    return found ? found.buildReplaced : null
}

export const RemarkObsidianReferencePlugin: Plugin<
    [ObsidianReferencePluginOptions]
> = (options) => {
    const { referenceMap } = options

    return (tree) => {
        /**
         * 1) Handle Obsidian references:  ![[filename.png]]
         */
        visit(tree, 'paragraph', (node: Parent) => {
            if (!node.children) return

            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i]
                if (child?.type !== 'text') continue

                const originalText = child.value
                let match: RegExpExecArray | null
                let lastIndex = 0

                // segments (plain text or embed link)
                const segments: Array<{ text?: string; link?: string }> = []

                // find every ![[...]] in the text
                while ((match = EMBED_LINK_REGEX.exec(originalText)) !== null) {
                    // Add plain text before the match
                    if (match.index > lastIndex) {
                        segments.push({
                            text: originalText.slice(lastIndex, match.index),
                        })
                    }
                    // Add the link portion
                    segments.push({ link: match[1]! })
                    // Move the lastIndex
                    lastIndex = match.index + match[0].length
                }

                // Add any trailing text after the last match
                if (lastIndex < originalText.length) {
                    segments.push({ text: originalText.slice(lastIndex) })
                }

                // If there are no embeds, continue
                if (segments.length === 1 && segments[0]?.text !== undefined) {
                    continue
                }

                // Build the final array of mdast children
                const newChildren = segments.flatMap<RootContent>((seg) => {
                    // Plain text
                    if (seg.text !== undefined) {
                        if (!seg.text) return []
                        return [{ type: 'text', value: seg.text }]
                    }

                    // Otherwise it's an embed link
                    const link = seg.link!
                    const targetLink = resolveAssetPath(link, referenceMap)

                    if (!targetLink) {
                        // Fallback: just keep the link text if not found
                        return [{ type: 'text', value: `![[${link}]]` }]
                    }

                    // Determine extension and produce appropriate HTML
                    const extension = FileReader.getExtension(link)

                    if (ImageFileNode.is(extension)) {
                        return [
                            {
                                type: 'html',
                                value: `<img src="${targetLink}" alt="${link}" />`,
                            },
                        ]
                    } else if (AudioFileNode.is(extension)) {
                        return [
                            {
                                type: 'html',
                                value: `<audio controls><source src="${targetLink}" type="audio/${extension}"></audio>`,
                            },
                        ]
                    } else {
                        // fallback link
                        return [
                            {
                                type: 'html',
                                value: `<a href="${targetLink}">${link}</a>`,
                            },
                        ]
                    }
                })

                // Replace the old single text child with possibly multiple children
                node.children.splice(i, 1, ...newChildren)
                i += newChildren.length - 1
            }
        })

        /**
         * 2) Handle Markdown images:  ![alt text](./img.png)
         */
        visit(tree, 'image', (node: { url: string }) => {
            const targetLink = resolveAssetPath(node.url, referenceMap)
            if (!targetLink) return
            node.url = targetLink
        })

        /**
         * 3) Handle inline HTML <img src="..."> or <audio> references:
         */
        visit(tree, 'html', (node: { value: string }) => {
            const value: string = node.value
            if (!/<(img|audio)\s/i.test(value)) return

            const srcRegex = /src\s*=\s*"([^"]+)"/gi
            let replacedValue = value

            let match: RegExpExecArray | null
            while ((match = srcRegex.exec(value)) !== null) {
                const oldSrc = match[1]
                if (!oldSrc) continue

                const targetLink = resolveAssetPath(oldSrc, referenceMap)
                if (!targetLink) continue
                replacedValue = replacedValue.replace(
                    match[0],
                    `src="${targetLink}"`
                )
            }

            node.value = replacedValue
        })
    }
}

export class ObsidianReferencePlugin extends BuildContentsPlugin {
    protected defineStaticConfig(): BuildContentsPluginStaticConfig {
        return {
            name: 'obsidian-reference',
            description:
                'convert obsidian image/audio references, markdown image syntax, and inline HTML <img>/<audio> to updated asset paths',
        }
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
        const referenceMap: ObsidianReferencePluginOptions['referenceMap'] =
            new Map()

        for (const ref of imageReference) {
            const pureFilename = FileReader.getFileName(ref.origin)
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
    private referenceMap:
        | ObsidianReferencePluginOptions['referenceMap']
        | undefined = undefined

    private referenceUpdateTextFileList: BuildStoreList | undefined = undefined

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

        this.referenceUpdateTextFileList = buildStore.filter(
            ({ file_type }) => file_type === 'TEXT_FILE'
        )

        const buildAssetPath = this.$buildPath.assets

        this.referenceMap = this.buildReferenceMap(
            assetReferencesUUIDList,
            buildAssetPath
        )
    }

    public async buildContents(): Promise<
        Array<{
            newContent: string
            writePath: string
        }>
    > {
        if (!this.referenceMap || !this.referenceUpdateTextFileList) {
            this.$logger.error(
                'referenceMap or referenceUpdateTextFileList not prepared'
            )
            return []
        }

        const buildAssetPath = this.$buildPath.assets

        const referenceUpdatedList =
            await this.referenceUpdateTextFileList.reduce<
                Promise<{ newContent: string; writePath: string }[]>
            >(async (acc, textFile) => {
                const awaitedAcc = await acc
                const textFileContent = await this.$io.reader.readFile(
                    textFile.build_path.build
                )
                if (textFileContent.success) {
                    const updatedVFile = await this.$processor.remark
                        .use(RemarkObsidianReferencePlugin, {
                            referenceMap: this.referenceMap!,
                            buildAssetPath,
                        })
                        .process(textFileContent.data)

                    awaitedAcc.push({
                        newContent: updatedVFile.toString(),
                        writePath: textFile.build_path.build,
                    })
                }
                return awaitedAcc
            }, Promise.resolve([]))

        return referenceUpdatedList
    }
}
