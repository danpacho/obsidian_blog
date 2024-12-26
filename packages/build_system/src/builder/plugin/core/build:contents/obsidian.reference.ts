import { type IO } from '@obsidian_blogger/helpers/io'
import { toMarkdown } from 'mdast-util-to-markdown'
import { remark } from 'remark'
import remarkHtml from 'remark-html'
import type { Plugin } from 'unified'
import type { Literal, Parent } from 'unist'
import { visit } from 'unist-util-visit'
import { AudioFileNode, ImageFileNode } from '../../../../parser/node'
import type { BuildStoreList } from '../../../core'
import {
    BuildContentsPlugin,
    type BuildContentsPluginStaticConfig,
} from '../../build.contents.plugin'

const RemarkObsidianReferencePlugin: Plugin<
    Array<{
        imageReference: Array<{
            origin: string
            build: string
        }>
        io: IO
    }>
> = (options) => {
    const { io, imageReference } = options

    return (tree) => {
        visit(tree, 'paragraph', (node, index, parent: Parent | undefined) => {
            const markdown: string = toMarkdown(node)
            const paragraph: string = String(
                remark().use(remarkHtml).processSync(markdown)
            )
            const EMBED_LINK_REGEX = /!\[\[([^[\]]+)\]\]/g
            if (!paragraph.match(EMBED_LINK_REGEX)) return node

            const match = EMBED_LINK_REGEX.exec(paragraph)
            const link = match ? match[1] : undefined
            const getPureLink = (link: string): string => {
                const remover = ['?', '#', '|'] as const
                for (const remove of remover) {
                    if (link.includes(remove)) return link.split(remove)[0]!
                }

                return link
            }
            if (!link) return node
            const pureLink = getPureLink(link)
            const searched = io.finder.findFileSync(pureLink)

            if (!searched.success) return node
            const { data } = searched

            const absPath = data[0]?.path
            if (!absPath) return node

            const extension = absPath.split('.').pop()
            if (!extension) return node

            if (ImageFileNode.is(extension)) {
                const matchingReference = imageReference.find(
                    (ref) => ref.origin === absPath
                )
                const matchedURL = matchingReference
                    ? matchingReference.build
                    : absPath

                const imageHTMLNode: Literal = {
                    type: 'html',
                    value: `<img src="${matchedURL}" alt="${link}" />`,
                }

                if (parent && typeof index === 'number') {
                    parent.children.splice(index, 1, imageHTMLNode)
                }
                return node
            } else if (AudioFileNode.is(extension)) {
                const audioHTMLNode: Literal = {
                    type: 'html',
                    value: `<audio controls><source src="${absPath}" type="audio/${extension}"></audio>`,
                }
                if (parent && typeof index === 'number') {
                    parent.children.splice(index, 1, audioHTMLNode)
                }
                return node
            } else {
                const linkNode: Literal = {
                    type: 'html',
                    value: `<a href="${absPath}">${link}</a>`,
                }
                if (parent && typeof index === 'number') {
                    parent.children.splice(index, 1, linkNode)
                }
                return node
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
                            io: this.$io,
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
