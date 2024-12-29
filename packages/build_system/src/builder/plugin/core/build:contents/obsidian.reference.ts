import type { Parent, RootContent } from 'mdast'
import { AudioFileNode, ImageFileNode } from 'packages/build_system/src/parser'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import type { BuildStoreList } from '../../../core'
import {
    BuildContentsPlugin,
    type BuildContentsPluginStaticConfig,
} from '../../build.contents.plugin'

type ObsidianReferencePluginOptions = {
    imageReference: Array<{
        origin: string
        build: string
    }>
    buildAssetPath: string
}

const EMBED_LINK_REGEX = /!\[\[([^[\]]+)\]\]/g

/**
 * Utility to strip trailing Obsidian query-parameters after the file name
 * e.g. "someFile.png#xyz" => "someFile.png"
 */
const getPureLink = (link: string): string => {
    for (const remove of ['?', '#', '|'] as const) {
        if (link.includes(remove)) return link.split(remove)[0]!
    }
    return link
}

export const RemarkObsidianReferencePlugin: Plugin<
    [ObsidianReferencePluginOptions]
> = (options) => {
    const { imageReference, buildAssetPath } = options

    return (tree) => {
        visit(tree, 'paragraph', (node: Parent | undefined) => {
            if (!node || !node.children) return

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
                if (segments.length === 1 && segments[0]!.text !== undefined) {
                    continue
                }

                // Build the final array of mdast children
                const newChildren = segments.flatMap<RootContent>((seg) => {
                    // Plain text
                    if (seg.text !== undefined) {
                        // Don’t create an empty text node if there's no text
                        if (!seg.text) return []
                        return [{ type: 'text', value: seg.text }]
                    }

                    // Otherwise it's an embed link
                    const link = seg.link!
                    const pureLink = getPureLink(link)

                    const targetLink = imageReference
                        .find((e) => e.origin.includes(pureLink))
                        ?.build.replace(buildAssetPath, '')

                    if (!targetLink) {
                        return [{ type: 'text', value: link }]
                    }

                    const extension = pureLink.split('.').pop() || ''
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
                // Advance i by however many children we just inserted minus one
                i += newChildren.length - 1
            }
        })
    }
}

export class ObsidianReferencePlugin extends BuildContentsPlugin {
    protected defineStaticConfig(): BuildContentsPluginStaticConfig {
        return {
            name: 'obsidian-reference',
            description:
                'convert obsidian image and audio reference to html tag and update link tag',
        }
    }

    public async buildContents(context: {
        buildStore: BuildStoreList
    }): Promise<
        Array<{
            newContent: string
            writePath: string
        }>
    > {
        const buildAssetPath = this.$buildPath.assets

        const assetReferencesUUIDList = context.buildStore
            .filter(
                ({ file_type }) =>
                    file_type === 'IMAGE_FILE' || file_type === 'AUDIO_FILE'
            )
            .map((report) => ({
                build: report.build_path.build,
                origin: report.build_path.origin,
            }))

        const referenceUpdateTextFileList = context.buildStore.filter(
            ({ file_type, build_state }) =>
                file_type === 'TEXT_FILE' && build_state !== 'CACHED'
        )

        const referenceUpdatedList = await referenceUpdateTextFileList.reduce<
            Promise<
                {
                    newContent: string
                    writePath: string
                }[]
            >
        >(
            async (acc, textFile) => {
                const awaitedAcc = await acc
                const textFileContent = await this.$io.reader.readFile(
                    textFile.build_path.build
                )
                if (textFileContent.success) {
                    const updatedVFile = await this.$processor.remark
                        .use(RemarkObsidianReferencePlugin, {
                            imageReference: assetReferencesUUIDList,
                            buildAssetPath,
                        })
                        .process(textFileContent.data)

                    awaitedAcc.push({
                        newContent: updatedVFile.toString(),
                        writePath: textFile.build_path.build,
                    })
                }
                return awaitedAcc
            },
            Promise.resolve([]) as Promise<
                { newContent: string; writePath: string }[]
            >
        )

        return referenceUpdatedList
    }
}
