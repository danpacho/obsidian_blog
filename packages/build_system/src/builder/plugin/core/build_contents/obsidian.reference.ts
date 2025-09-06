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
    curr: BuildInformation['build_path']
    prev: BuildInformation['build_path'] | null
}>

type RefInfo = {
    origin: string
    build: string
    buildReplaced: string
}

type ReferenceValue = Array<{
    curr: RefInfo
    prev: RefInfo | null
}>

interface ObsidianReferencePluginOptions {
    referenceMap: Map<string, ReferenceValue>
    textOriginPath: string
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

        const containsUUID = (input: string): boolean => {
            const uuidRegex =
                /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

            return uuidRegex.test(input)
        }

        const getPureFileName = (link: string) => {
            const FILE_NAME_DIVIDING_TOKEN = '_' as const
            const [firstToken, ...originalFileNames] = link.split(
                FILE_NAME_DIVIDING_TOKEN
            )

            const isFirstTokenContainsUUID = containsUUID(firstToken ?? '')

            const fileName = isFirstTokenContainsUUID
                ? originalFileNames.join(FILE_NAME_DIVIDING_TOKEN)
                : link

            const generated = this.$io.pathResolver
                .getFileNameWithExtension(fileName)
                .trim()
            if (generated === '') {
                return this.$io.pathResolver.getFileNameWithExtension(link)
            }
            return generated
        }

        const resolveAssetPath = (link: string): string | null => {
            // link
            // first-pass -> pure file path
            // second-pass -> build file path

            // reference id should be pure filename
            const prevResolvedLinkPath = this.$io.pathResolver.normalize(link)
            const prevLinkFileName =
                this.$io.pathResolver.getFileNameWithExtension(
                    prevResolvedLinkPath
                )

            // extract pure filename by prev link filename
            const referenceId = getPureFileName(prevLinkFileName)

            if (!referenceId) return null

            const candidates = referenceMap.get(referenceId)

            if (!candidates?.length) return null
            if (candidates.length === 1)
                return candidates[0]!.curr.buildReplaced

            // search by prev, cause current uniqueFileId is build path after second pass
            let exactFounded: boolean = false
            const possibilities = candidates.reduce<
                Array<
                    {
                        buildReplaced: string
                        type: 'exact' | 'ambiguous'
                    } & ReferenceValue[number]
                >
            >((acc, { curr, prev }) => {
                if (prev) {
                    // prev is always first
                    const prevBuildedId =
                        this.$io.pathResolver.getFileNameWithExtension(
                            prev.buildReplaced
                        )

                    const exactCondition = prevBuildedId === prevLinkFileName

                    if (exactFounded === false && exactCondition) {
                        exactFounded = true
                        acc.push({
                            buildReplaced: curr.buildReplaced,
                            type: 'exact',
                            curr,
                            prev,
                        })
                        return acc
                    }

                    // Edge condition can be error cause
                    const ambiguousCondition =
                        getPureFileName(prevBuildedId) ===
                        getPureFileName(prevLinkFileName)

                    if (ambiguousCondition) {
                        acc.push({
                            buildReplaced: curr.buildReplaced,
                            type: 'ambiguous',
                            curr,
                            prev,
                        })
                    }

                    return acc
                }

                // this is first added situation
                const isFirstAdded = curr.origin.endsWith(prevResolvedLinkPath)
                if (isFirstAdded) {
                    acc.push({
                        buildReplaced: curr.buildReplaced,
                        type: 'ambiguous',
                        curr,
                        prev,
                    })
                }

                return acc
            }, [])

            if (exactFounded) {
                const exactBuildPath = possibilities.find(
                    (e) => e.type === 'exact'
                )!.buildReplaced

                return exactBuildPath
            }

            const determineByPrev = possibilities.filter((p) => {
                if (!p.prev) return false

                const matchedByFilePath =
                    p.prev.origin.endsWith(prevResolvedLinkPath)

                const filePrevPathMatched =
                    this.$io.pathResolver
                        .splitToPathSegments(
                            p.prev.origin.replace(
                                this.dependencies?.vaultRoot ?? '',
                                ''
                            )
                        )
                        .join('') ===
                    this.$io.pathResolver
                        .splitToPathSegments(prevResolvedLinkPath)
                        .join('')

                const prevBuildReplacedMatched =
                    prevResolvedLinkPath === p.prev.buildReplaced

                return (
                    (matchedByFilePath && filePrevPathMatched) ||
                    prevBuildReplacedMatched
                )
            })

            if (determineByPrev.length === 0) {
                // should search by name
                const determineByCurrent = possibilities.filter((p) => {
                    const matchedByFilePathCurrent =
                        p.curr.origin.endsWith(prevResolvedLinkPath)

                    const fileCurrentPathMatched =
                        this.$io.pathResolver
                            .splitToPathSegments(
                                p.curr.origin.replace(
                                    this.dependencies?.vaultRoot ?? '',
                                    ''
                                )
                            )
                            .join('') ===
                        this.$io.pathResolver
                            .splitToPathSegments(prevResolvedLinkPath)
                            .join('')

                    return matchedByFilePathCurrent && fileCurrentPathMatched
                })

                if (determineByCurrent.length === 1) {
                    return determineByCurrent[0]!.buildReplaced
                } else {
                    return null
                }
            }

            if (determineByPrev.length === 1) {
                return determineByPrev[0]!.buildReplaced
            }

            return null

            // ambiguous situation -> same filename
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
     */
    private buildReferenceMap(
        imageReference: ImageReference,
        buildAssetPath: string
    ): ObsidianReferencePluginOptions['referenceMap'] {
        const referenceMap: ObsidianReferencePluginOptions['referenceMap'] =
            new Map()

        const collectRef = (
            ref: BuildInformation['build_path']
        ): RefInfo | null => {
            const currPureFilename =
                this.$io.pathResolver.getFileNameWithExtension(ref.origin)

            if (!currPureFilename) {
                return null
            }

            const buildPath = ref.build
            const buildReplaced = buildPath.replace(buildAssetPath, '')

            return {
                origin: ref.origin,
                build: buildPath,
                buildReplaced,
            }
        }

        for (const ref of imageReference) {
            const currPureFilename =
                this.$io.pathResolver.getFileNameWithExtension(ref.curr.origin)

            if (!currPureFilename) continue

            const entry = referenceMap.get(currPureFilename) || []

            const collectedCurr = collectRef(ref.curr)
            const collectedPrev = ref.prev ? collectRef(ref.prev) : null
            if (collectedCurr) {
                entry.push({ curr: collectedCurr, prev: collectedPrev ?? null })
            }

            referenceMap.set(currPureFilename, entry)
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

        const assetCurrentReferences = buildStoreCurrent
            .filter(
                ({ file_type }) =>
                    file_type === 'IMAGE_FILE' || file_type === 'AUDIO_FILE'
            )
            .filter(({ build_state }) => build_state !== 'REMOVED')

        this.referenceUpdateTextFileList = buildStoreCurrent.filter(
            ({ file_type }) => file_type === 'TEXT_FILE'
        )

        this.hasUpdatedAssets = assetCurrentReferences.some(
            (report) =>
                // should re-check
                report.build_state !== 'CACHED'
        )

        const assetReferencesUUIDList: ImageReference =
            assetCurrentReferences.map((report) => {
                const curr = report.build_path
                const getPrev = () => {
                    if (report.build_state === 'MOVED') {
                        return buildStorePrev.find(
                            (e) => report.content_id === e.content_id
                        )
                    } else {
                        return buildStorePrev.find(
                            (e) =>
                                report.build_path.origin === e.build_path.origin
                        )
                    }
                }
                const prev = getPrev()?.build_path ?? null
                return {
                    curr,
                    prev: prev,
                }
            })

        const buildAssetPath = this.$buildPath.assets

        this.referenceMap = this.buildReferenceMap(
            assetReferencesUUIDList,
            buildAssetPath
        )
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
        return buildState !== 'CACHED'
    }

    public async buildContents(): Promise<BuildContentsUpdateInformation> {
        if (!this.referenceMap) {
            this.$logger.error('referenceMap not prepared')
            return []
        }

        if (!this.referenceUpdateTextFileList) {
            return []
        }

        const filesToProcess = this.referenceUpdateTextFileList

        const processingPromises = filesToProcess.map(async (textFile) => {
            const textFileContent = await this.$io.reader.readFile(
                textFile.build_path.build
            )
            if (textFileContent.success) {
                const updatedVFile = await this.$processor.remark
                    .use(this.RemarkObsidianReferencePlugin, {
                        referenceMap: this.referenceMap!,
                        textOriginPath: textFile.build_path.origin,
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
