import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { rehype } from 'rehype'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'
import remarkHtml from 'remark-html'
import { filter } from 'unist-util-filter'
import { find } from 'unist-util-find'
import { visit } from 'unist-util-visit'

export class MarkdownProcessor {
    public constructor() {}

    public remark() {
        const processor = remark().use([remarkHtml, remarkFrontmatter])
        return processor
    }
    public rehype() {
        const processor = rehype()
        return processor
    }

    public get findNode() {
        return find
    }
    public get visitTree() {
        return visit
    }
    public get filterTree() {
        return filter
    }

    public get fromMarkdown() {
        return fromMarkdown
    }
    public get toMarkdown() {
        return toMarkdown
    }
}
