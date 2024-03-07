import { toMarkdown } from 'mdast-util-to-markdown'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'
import remarkHtml from 'remark-html'
import type { Plugin } from 'unified'
import type { Literal, Parent } from 'unist'
import { visit } from 'unist-util-visit'
import { AudioFileNode, ImageFileNode } from '../../../parser/node'
import type { ContentsModifierPlugin } from '../../plugin'

const RemarkObsidianReferencePlugin: Plugin<
    [
        {
            imageReference: Array<{
                origin: string
                build: string
            }>
            ioManager: Parameters<ContentsModifierPlugin>[0]['ioManager']
        },
    ]
> = (options) => {
    const { ioManager, imageReference } = options

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
            const searched = ioManager.finder.findFileSync(pureLink)

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
                    value: `<img src="${matchedURL}" alt="${link}">`,
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

export const ObsidianReference: ContentsModifierPlugin = async ({
    buildReport,
    ioManager,
}) => {
    const { total, updated } = buildReport

    const assetReferencesUUIDList = total
        .filter(({ type }) => type === 'IMAGE_FILE' || type === 'AUDIO_FILE')
        .map((report) => ({
            build: `/assets/images/${report.buildID}`,
            origin: report.path.origin,
        }))

    const referenceUpdateTextFileList = updated.filter(
        ({ type }) => type === 'TEXT_FILE'
    )

    const referenceUpdatedList = referenceUpdateTextFileList.reduce<
        Promise<
            {
                modifiedContent: string
                writePath: string
            }[]
        >
    >(async (acc, textFile) => {
        const awaitedAcc = await acc
        const textFileContent = await ioManager.reader.readFile(
            textFile.path.build
        )
        if (textFileContent.success) {
            const updatedVFile = await remark()
                .use(RemarkObsidianReferencePlugin, {
                    imageReference: assetReferencesUUIDList,
                    ioManager,
                })
                .use(remarkFrontmatter)
                .process(textFileContent.data)

            awaitedAcc.push({
                modifiedContent: updatedVFile.toString(),
                writePath: textFile.path.build,
            })
        }
        return acc
    }, Promise.resolve([]))

    return referenceUpdatedList
}
