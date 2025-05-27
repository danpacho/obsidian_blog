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

interface ObsidianReferencePluginOptions {
    referenceMap: Map<
        string,
        Array<{
            origin: string
            build: string
            buildReplaced: string
        }>
    >
}

export const RemarkObsidianReferencePlugin: Plugin<
    [ObsidianReferencePluginOptions]
> = ({ referenceMap }) => {
    // Match ![[file.ext#anchor|opt1|opt2]]
    const EMBED_REGEX = /!\[\[([^|\]]+?)(?:\|([^|\]]+?))?(?:\|([^|\]]+?))?\]\]/g

    const resolveAssetPath = (link: string): string | null => {
        const fileNameWithExt = FileReader.getFileNameWithExtension(link)
        const fullFileName = FileReader.toPosix(path.normalize(link))

        if (!fileNameWithExt) return null
        const candidates = referenceMap.get(fileNameWithExt)
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

    // Parse dimension strings like "300x200" or "150"
    const parseDims = (opt?: string) => {
        if (!opt) return {}
        const m = /^(\d+)(?:x(\d+))?$/.exec(opt)
        if (!m) return {}
        const [_, w, h] = m
        return {
            width: `${w}px`,
            ...(h ? { height: `${h}px` } : {}),
        }
    }

    // Recognized image anchors → CSS classes
    const anchorClass = (tag?: string) => {
        if (!tag) return ''
        const map: Record<string, string> = {
            icon: 'obsidian-icon-anchor',
            interface: 'obsidian-interface-anchor',
            outline: 'obsidian-outline-anchor',
        }
        return map[tag] ?? ''
    }

    return (tree) => {
        // 1) Handle wiki‐style embeds
        visit(tree, 'paragraph', (node: Parent) => {
            if (!node.children) return

            node.children.forEach((child, idx) => {
                if (child.type !== 'text') return

                const txt = child.value as string
                let match: RegExpExecArray | null
                let last = 0
                const out: Array<{ text?: string; embed?: RegExpExecArray }> =
                    []

                while ((match = EMBED_REGEX.exec(txt)) !== null) {
                    if (match.index > last) {
                        out.push({ text: txt.slice(last, match.index) })
                    }
                    out.push({ embed: match })
                    last = match.index + match[0].length
                }
                if (last < txt.length) {
                    out.push({ text: txt.slice(last) })
                }

                // No embeds? skip
                if (out.every((s) => s.text != null)) return

                // Build new children
                const newChildren: RootContent[] = []
                out.forEach((seg) => {
                    if (seg.text != null) {
                        if (seg.text)
                            newChildren.push({ type: 'text', value: seg.text })
                        return
                    }
                    const [, raw, opt1, opt2] = seg.embed!

                    if (!raw) {
                        // If no raw text, skip
                        newChildren.push({ type: 'text', value: '' })
                        return
                    }
                    // Extract path and optional anchor
                    const [pathWithAnchor, ..._rest] = raw.split('#')
                    const anchorTag = raw.includes('#')
                        ? raw.split('#')[1]!.split('|')[0]
                        : undefined
                    // Options may be alias or dims
                    const opts = [opt1, opt2]
                    let alias: string | undefined
                    let dimsOpts: Record<string, string> = {}
                    opts.forEach((o) => {
                        if (!o) return
                        if (/^\d+(?:x\d+)?$/.test(o)) {
                            dimsOpts = parseDims(o)
                        } else {
                            alias = o
                        }
                    })

                    if (!pathWithAnchor) {
                        // If no path, leave as raw text
                        newChildren.push({ type: 'text', value: seg.embed![0] })
                        return
                    }
                    // Resolve the final URL
                    const url = resolveAssetPath(pathWithAnchor)
                    if (!url) {
                        // leave as raw text
                        newChildren.push({ type: 'text', value: seg.embed![0] })
                        return
                    }

                    // Determine file type
                    const ext =
                        FileReader.getExtension(pathWithAnchor)?.toLowerCase()

                    if (!ext) {
                        // If no extension, leave as raw text
                        newChildren.push({ type: 'text', value: seg.embed![0] })
                        return
                    }

                    const cls = anchorClass(anchorTag)

                    if (ImageFileNode.is(ext)) {
                        // <img src=... alt=... width/height class=...>
                        const attrs = [
                            `src="${url}"`,
                            `alt="${alias ?? pathWithAnchor}"`,
                            dimsOpts.width && `width="${dimsOpts.width}"`,
                            dimsOpts.height && `height="${dimsOpts.height}"`,
                            cls && `class="${cls}"`,
                        ]
                            .filter(Boolean)
                            .join(' ')
                        newChildren.push({
                            type: 'html',
                            value: `<img ${attrs} />`,
                        })
                    } else if (AudioFileNode.is(ext)) {
                        const attrs = [
                            `src="${url}"`,
                            `type="audio/${ext}"`,
                            cls && `class="${cls}"`,
                        ]
                            .filter(Boolean)
                            .join(' ')
                        newChildren.push({
                            type: 'html',
                            value: `<audio controls ${cls && `class="${cls}"`}><source ${attrs}></audio>`,
                        })
                    } else if (ext === 'base') {
                        // Embed .base files by reference (no dims or alias)
                        newChildren.push({
                            type: 'html',
                            value: `<div data-embed="base" data-src="${url}"${alias ? ` data-alias="${alias}"` : ''}></div>`,
                        })
                    } else {
                        // Fallback to a link
                        newChildren.push({
                            type: 'html',
                            value: `<a href="${url}">${alias ?? pathWithAnchor}</a>`,
                        })
                    }
                })

                // Replace children
                node.children.splice(idx, 1, ...newChildren)
            })
        })

        // 2) Handle markdown image nodes
        visit(tree, 'image', (node: any) => {
            const replaced = resolveAssetPath(node.url)
            if (replaced) node.url = replaced
        })

        // 3) Handle raw HTML <img>, <audio>, <iframe>…
        visit(tree, 'html', (node: any) => {
            const html = node.value as string
            // Replace all src="…" occurrences
            node.value = html.replace(/src\s*=\s*"([^"]+)"/g, (_, src) => {
                const resolved = resolveAssetPath(src)
                return resolved ? `src="${resolved}"` : `src="${src}"`
            })
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

        const buildAssetPath = FileReader.toPosix(this.$buildPath.assets)

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
