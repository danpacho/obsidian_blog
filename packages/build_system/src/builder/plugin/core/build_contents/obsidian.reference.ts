import { AudioFileNode, ImageFileNode } from 'packages/build_system/src/parser'
import { visit } from 'unist-util-visit'

import {
    BuildContentsPlugin,
    type BuildContentsPluginStaticConfig,
} from '../../build.contents.plugin'

import type { BuildInformation, BuildStoreList } from '../../../core'
import type { BuildContentsUpdateInformation } from '../../build.contents.plugin'
import type { Parent, RootContent } from 'mdast'
import type { Plugin } from 'unified'

type ImageReference = Array<{
    origin: string
    build: string
    oldBuild?: string
}>

type ReferenceValue = Array<{
    origin: string
    build: string
    buildReplaced: string
    oldBuild?: string
}>

interface ObsidianReferencePluginOptions {
    referenceMap: Map<string, ReferenceValue>
}

export class ObsidianReferencePlugin extends BuildContentsPlugin {
    protected defineStaticConfig(): BuildContentsPluginStaticConfig {
        return {
            name: 'obsidian-reference',
            description:
                'convert obsidian image/audio references, markdown image syntax, and inline HTML <img>/<audio> to updated asset paths',
        }
    }

    private RemarkObsidianReferencePlugin: Plugin<
        [ObsidianReferencePluginOptions]
    > = ({ referenceMap }) => {
        // Match ![[file.ext#anchor|opt1|opt2]]
        const EMBED_REGEX =
            /!\[\[([^|\]]+?)(?:\|([^|\]]+?))?(?:\|([^|\]]+?))?\]\]/g

        const resolveAssetPath = (link: string): string | null => {
            const fileNameWithExt =
                this.$io.pathResolver.getFileNameWithExtension(link)
            const fullFileName = this.$io.pathResolver.normalize(link)

            if (!fileNameWithExt) return null

            const getPureFileName = (link: string) => {
                const FILE_NAME_DIVIDING_TOKEN = '_' as const
                const [, ...originalFileNames] = link.split(
                    FILE_NAME_DIVIDING_TOKEN
                )
                const fileName = originalFileNames.join('')

                return this.$io.pathResolver.getFileNameWithExtension(fileName)
            }

            const candidates =
                referenceMap.get(fileNameWithExt) ??
                referenceMap.get(getPureFileName(link))

            if (!candidates?.length) return null
            if (candidates.length === 1) return candidates[0]!.buildReplaced

            // Prefer exact matches in origin path (current or old)
            const exactMatch = candidates.find(
                (r) =>
                    this.$io.pathResolver
                        .normalize(r.origin)
                        .includes(fullFileName) ||
                    (r.oldBuild &&
                        this.$io.pathResolver
                            .normalize(r.oldBuild)
                            .includes(fullFileName))
            )

            if (exactMatch) {
                return exactMatch.buildReplaced
            }

            // If no exact match, we should not guess.
            return null
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
                    const out: Array<{
                        text?: string
                        embed?: RegExpExecArray
                    }> = []

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
                    if (out.every((s) => s.text !== undefined)) return

                    // Build new children
                    const newChildren: RootContent[] = []
                    out.forEach((seg) => {
                        if (seg.text !== undefined) {
                            if (seg.text)
                                newChildren.push({
                                    type: 'text',
                                    value: seg.text,
                                })
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
                            newChildren.push({
                                type: 'text',
                                value: seg.embed![0],
                            })
                            return
                        }
                        // Resolve the final URL
                        const url = resolveAssetPath(pathWithAnchor)
                        if (!url) {
                            // leave as raw text
                            newChildren.push({
                                type: 'text',
                                value: seg.embed![0],
                            })
                            return
                        }

                        // Determine file type
                        const ext = this.$io.pathResolver
                            .getExtension(pathWithAnchor)
                            ?.toLowerCase()

                        if (!ext) {
                            // If no extension, leave as raw text
                            newChildren.push({
                                type: 'text',
                                value: seg.embed![0],
                            })
                            return
                        }

                        const cls = anchorClass(anchorTag)

                        if (ImageFileNode.is(ext)) {
                            // <img src=... alt=... width/height class=...>
                            const attrs = [
                                `src="${url}"`,
                                `alt="${alias ?? pathWithAnchor}"`,
                                dimsOpts.width && `width="${dimsOpts.width}"`,
                                dimsOpts.height &&
                                    `height="${dimsOpts.height}"`,
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
    ): Map<string, ReferenceValue> {
        const referenceMap: ObsidianReferencePluginOptions['referenceMap'] =
            new Map()

        for (const ref of imageReference) {
            const pureFilename = this.$io.pathResolver.getFileNameWithExtension(
                ref.origin
            )
            if (!pureFilename) continue

            const entry = referenceMap.get(pureFilename) || []

            const buildPath = ref.build
            const buildReplaced = buildPath.replace(buildAssetPath, '')

            entry.push(
                ref.oldBuild
                    ? {
                          origin: ref.origin,
                          build: buildPath,
                          buildReplaced: buildReplaced,
                          oldBuild: ref.oldBuild,
                      }
                    : {
                          origin: ref.origin,
                          build: buildPath,
                          buildReplaced: buildReplaced,
                      }
            )
            referenceMap.set(pureFilename, entry)
        }
        return referenceMap
    }
    private referenceMap:
        | ObsidianReferencePluginOptions['referenceMap']
        | undefined = undefined

    private hasUpdatedAssets = false
    private referenceUpdateTextFileList: BuildStoreList | undefined = undefined

    public override async prepare(): Promise<void> {
        const buildStoreCurrent =
            this.getRunTimeDependency('buildStore').getStoreList('current')
        const buildStorePrev =
            this.getRunTimeDependency('buildStore').getStoreList('prev')

        const assetReferences = buildStoreCurrent
            .filter(
                ({ file_type }) =>
                    file_type === 'IMAGE_FILE' || file_type === 'AUDIO_FILE'
            )
            .filter(({ build_state }) => build_state !== 'REMOVED')

        this.referenceUpdateTextFileList = buildStoreCurrent.filter(
            ({ file_type }) => file_type === 'TEXT_FILE'
        )

        this.hasUpdatedAssets = assetReferences.some(
            (report) =>
                // should re-check
                report.build_state === 'MOVED' ||
                report.build_state === 'UPDATED' ||
                report.build_state === 'REMOVED'
        )

        const assetReferencesUUIDList: ImageReference = assetReferences.map(
            (report) => {
                let oldBuild: string | undefined = undefined
                if (
                    // should re-check
                    report.build_state === 'MOVED' ||
                    report.build_state === 'UPDATED' ||
                    report.build_state === 'REMOVED'
                ) {
                    // MOVED | REMOVED -> inquired by content_id
                    const prevReportByContentId = buildStorePrev.find(
                        (prev) => prev.content_id === report.content_id
                    )
                    if (prevReportByContentId) {
                        oldBuild = prevReportByContentId.build_path.build
                    }

                    // UPDATED -> content_id is changed, but original build is same.
                    if (!prevReportByContentId) {
                        const prevReportByFullPath = buildStorePrev.find(
                            (prev) =>
                                prev.build_path.origin ===
                                report.build_path.origin
                        )
                        if (prevReportByFullPath) {
                            oldBuild = prevReportByFullPath.build_path.build
                        }
                    }
                }
                return oldBuild
                    ? {
                          build: report.build_path.build,
                          origin: report.build_path.origin,
                          oldBuild,
                      }
                    : {
                          build: report.build_path.build,
                          origin: report.build_path.origin,
                      }
            }
        )

        const buildAssetPath = this.$buildPath.assets

        this.referenceMap = this.buildReferenceMap(
            assetReferencesUUIDList,
            buildAssetPath
        )
        console.log(this.referenceMap)
    }

    public override cacheChecker = (
        buildState: BuildInformation['build_state']
    ): boolean => {
        // filtering => true === target
        if (this.hasUpdatedAssets) {
            // If assets were moved, we must re-process all text files
            // to ensure links are updated, regardless of their cache status.
            return true
        }

        // Default behavior: Only process new, updated, or moved text files.
        return (
            buildState === 'UPDATED' ||
            buildState === 'ADDED' ||
            buildState === 'MOVED'
        )
    }

    public async buildContents(): Promise<BuildContentsUpdateInformation> {
        if (!this.referenceMap) {
            this.$logger.error('referenceMap not prepared')
            return []
        }

        if (!this.referenceUpdateTextFileList) {
            return []
        }

        const filesToProcess = this.referenceUpdateTextFileList.filter(
            (textFile) => this.cacheChecker(textFile.build_state)
        )

        const buildAssetPath = this.$buildPath.assets

        const processingPromises = filesToProcess.map(async (textFile) => {
            const textFileContent = await this.$io.reader.readFile(
                textFile.build_path.build
            )
            if (textFileContent.success) {
                const updatedVFile = await this.$processor.remark
                    .use(this.RemarkObsidianReferencePlugin, {
                        referenceMap: this.referenceMap!,
                        buildAssetPath,
                    })
                    .process(textFileContent.data)

                return {
                    newContent: updatedVFile.toString(),
                    writePath: textFile.build_path.build,
                }
            }
            this.$logger.warn(
                `Could not read file: ${textFile.build_path.build}`
            )
            return null
        })

        const referenceUpdatedList = (
            await Promise.all(processingPromises)
        ).filter(
            (result): result is { newContent: string; writePath: string } =>
                result !== null
        )

        return referenceUpdatedList
    }
}
