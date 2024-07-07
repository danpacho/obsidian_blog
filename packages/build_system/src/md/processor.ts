import { fromMarkdown } from 'mdast-util-from-markdown'
import { toMarkdown } from 'mdast-util-to-markdown'
import { rehype } from 'rehype'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'
import { filter } from 'unist-util-filter'
import { find } from 'unist-util-find'
import { visit } from 'unist-util-visit'

/**
 * Represents a Markdown processor that provides various methods for processing Markdown content.
 */
export class MarkdownProcessor {
    /**
     * Initializes a new instance of the MarkdownProcessor class.
     */
    public constructor() {}

    /**
     * Gets the remark processor with frontmatter plugin.
     * @returns The remark processor.
     */
    public get remark() {
        const processor = remark().use(remarkFrontmatter)
        return processor
    }

    /**
     * Gets the rehype processor.
     * @returns The rehype processor.
     */
    public get rehype() {
        const processor = rehype()
        return processor
    }

    /**
     * Gets the find function for searching nodes in a tree.
     * @returns The find function.
     */
    public get findNode() {
        return find
    }

    /**
     * Gets the visit function for traversing a tree.
     * @returns The visit function.
     */
    public get visitTree() {
        return visit
    }

    /**
     * Gets the filter function for filtering nodes in a tree.
     * @returns The filter function.
     */
    public get filterTree() {
        return filter
    }

    /**
     * Gets the fromMarkdown function for converting Markdown to an MDAST tree.
     * @returns The fromMarkdown function.
     */
    public get fromMarkdown() {
        return fromMarkdown
    }

    /**
     * Gets the toMarkdown function for converting an MDAST tree to Markdown.
     * @returns The toMarkdown function.
     */
    public get toMarkdown() {
        return toMarkdown
    }
}
