import { resolve } from 'path'
import type { Image } from 'mdast'
import { toMarkdown } from 'mdast-util-to-markdown'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'
import remarkHtml from 'remark-html'
import type { Plugin } from 'unified'
import type { Literal, Node, Parent } from 'unist'
import { visit } from 'unist-util-visit'
import type { BuildReport } from '../builder/builder'
import type { IOManager } from '../io_manager'
import { AudioFileNode, ImageFileNode } from '../parser/node'

interface MdProcessorConstructor {
    ioManager: IOManager
}
export class MdProcessor {
    private readonly imageReference: Array<BuildReport['path']> = []
    public constructor(public readonly option: MdProcessorConstructor) {}

    private get $processor() {
        return remark()
            .use(this.transformEmbeddingReferenceList, {
                imageReference: this.imageReference,
            })
            .use(remarkFrontmatter)
    }

    /**
     * @link {https://unifiedjs.com/learn/guide/create-a-plugin/}
     * @link {https://github.com/johackim/remark-obsidian/blob/master/src/index.js#L28}
     */
    private transformEmbeddingReferenceList: Plugin<
        [
            {
                imageReference: Array<BuildReport['path']>
            },
        ]
    > = (options) => {
        return (tree) => {
            visit(
                tree,
                'paragraph',
                (node, index, parent: Parent | undefined) => {
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
                            if (link.includes(remove))
                                return link.split(remove)[0]!
                        }

                        return link
                    }
                    if (!link) return node
                    const pureLink = getPureLink(link)
                    const searched =
                        this.option.ioManager.finder.findFileSync(pureLink)

                    if (!searched.success) return node
                    const { data } = searched

                    const absPath = data[0]?.path
                    if (!absPath) return node

                    const extension = absPath.split('.').pop()
                    if (!extension) return node

                    if (ImageFileNode.is(extension)) {
                        const matchingReference = options.imageReference.find(
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
                }
            )
        }
    }

    private transformImageReferenceList: Plugin<
        [
            {
                imageReference: Array<BuildReport['path']>
            },
        ]
    > = (options) => {
        const isImageNode = (node: Node): node is Image => node.type === 'image'

        return (tree) => {
            visit(
                tree,
                'image',
                (node: Node, index, parent: Parent | undefined) => {
                    if (isImageNode(node)) {
                        const originalURL = node.url

                        const absPath = resolve(originalURL)
                        const matchingReference = options.imageReference.find(
                            (ref) => ref.origin === absPath
                        )
                        const matchedURL = matchingReference
                            ? matchingReference.build
                            : absPath

                        if (matchingReference) {
                            node.url = matchedURL
                        }

                        const imageHTMLNode: Literal = {
                            type: 'html',
                            value: `<img src="${matchedURL}" alt="${node.alt ?? ''}">`,
                        }

                        if (parent && typeof index === 'number') {
                            parent.children.splice(index, 1, imageHTMLNode)
                        }
                    }
                }
            )
        }
    }

    public updateImageReferenceList(references: Array<BuildReport['path']>) {
        this.imageReference.push(...references)
    }

    public async process(markdown: string): Promise<string> {
        const processed = await this.$processor.process(markdown)

        return processed.toString()
    }
}
