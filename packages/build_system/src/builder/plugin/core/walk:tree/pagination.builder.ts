import type { Promisify } from '@obsidian_blogger/helpers'
import type { FileTreeNode } from 'packages/build_system/src/parser'
import {
    WalkTreePlugin,
    WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'
import type {
    DefaultContentMeta,
    DefaultPaginationInfo,
} from './shared/meta/interface'

export interface PaginationBuilderConfig extends ContentMetaGeneratorOptions {}

export class PaginationBuilderPlugin extends WalkTreePlugin {
    public constructor(
        public readonly config: PaginationBuilderConfig = {
            ...defaultContentMetaBuilderOptions,
        }
    ) {
        super()
    }

    private get meta() {
        return this.$createMetaEngine(this.config.contentMeta)
    }

    public defineStaticConfig(): WalkTreePluginStaticConfig {
        return {
            name: 'pagination-builder',
            description: 'Generate pagination meta information for the content',
        }
    }

    private async buildPaginationMeta(
        node: FileTreeNode | undefined
    ): Promisify<DefaultPaginationInfo> {
        if (!node)
            return {
                success: false,
                error: new Error('node is undefined'),
            }

        if (node.category !== 'TEXT_FILE') {
            return {
                success: false,
                error: new Error('node is not TEXT_FILE'),
            }
        }

        const buildPath = node.absolutePath

        const metaResult = await this.meta.extractFromFile(buildPath)
        if (!metaResult.success) {
            return {
                success: false,
                error: new Error('meta is undefined'),
            }
        }

        const { data } = metaResult
        const typedMeta = data.meta as unknown as DefaultContentMeta

        const href = typedMeta.params
            ? `/${Object.values(typedMeta.params).join('/')}`
            : undefined
        const title = typedMeta.title
        const description = typedMeta.description

        return {
            success: true,
            data: {
                href,
                title,
                description,
            },
        }
    }

    private searchTextNodeBasedOnOriginIndex(
        siblingsIndex: number,
        siblings: Array<FileTreeNode>,
        type: 'before' | 'after'
    ): FileTreeNode | undefined {
        if (type === 'before') {
            while (siblingsIndex >= 0) {
                const node = siblings[siblingsIndex]
                if (node?.category === 'TEXT_FILE') return node
                if (node?.fileName === 'description.md') return node

                siblingsIndex--
                this.searchTextNodeBasedOnOriginIndex(
                    siblingsIndex,
                    siblings,
                    type
                )
            }
        } else {
            while (siblingsIndex < siblings.length) {
                const node = siblings[siblingsIndex]
                if (node?.category === 'TEXT_FILE') return node
                if (node?.fileName === 'description.md') return node

                siblingsIndex++
                this.searchTextNodeBasedOnOriginIndex(
                    siblingsIndex,
                    siblings,
                    type
                )
            }
        }

        return undefined
    }

    public async walk(
        node: Parameters<WalkTreePlugin['walk']>[0],
        { siblings, siblingsIndex }: Parameters<WalkTreePlugin['walk']>[1]
    ): Promise<void> {
        if (node.category !== 'TEXT_FILE') return

        const finalBuildPath = node.absolutePath
        if (!siblings || !siblingsIndex) return

        const prevTextNode = this.searchTextNodeBasedOnOriginIndex(
            siblingsIndex - 1,
            siblings,
            'before'
        )
        const nextTextNode = this.searchTextNodeBasedOnOriginIndex(
            siblingsIndex + 1,
            siblings,
            'after'
        )
        if (!prevTextNode && !nextTextNode) return

        const prevPaginationMeta = await this.buildPaginationMeta(prevTextNode)
        const nextPaginationMeta = await this.buildPaginationMeta(nextTextNode)

        const metaDataResult = await this.meta.extractFromFile(finalBuildPath)

        if (!metaDataResult.success) return

        const originalMeta = metaDataResult.data.meta
        const paginationMeta = {
            prev: prevPaginationMeta.success
                ? prevPaginationMeta.data
                : undefined,
            next: nextPaginationMeta.success
                ? nextPaginationMeta.data
                : undefined,
        }

        const injectResult = await this.meta.replace({
            injectPath: finalBuildPath,
            metaData: {
                content: metaDataResult.data.content,
                meta: {
                    ...originalMeta,
                    pagination: paginationMeta,
                },
            },
        })

        if (!injectResult.success) return
        this.$logger.success(`injected pagination meta to ${finalBuildPath}`)
    }
}
