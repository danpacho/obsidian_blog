import type { Promisify } from '@obsidian_blogger/helpers'
import { FTreeNode } from 'packages/build_system/src/parser'
import { WalkTreePlugin, WalkTreePluginConfig } from '../../walk.tree.plugin'
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

    public getConfig(): WalkTreePluginConfig {
        return {
            name: 'PaginationBuilder',
            exclude: 'description.md',
            skipFolderNode: true,
            disableCache: true,
        }
    }

    private async buildPaginationMeta({
        node,
    }: {
        node: FTreeNode | undefined
    }): Promisify<DefaultPaginationInfo> {
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
        originIndex: number,
        children: Array<FTreeNode>,
        type: 'before' | 'after'
    ): FTreeNode | undefined {
        if (type === 'before') {
            while (originIndex >= 0) {
                const node = children[originIndex]
                if (node?.category === 'TEXT_FILE') return node
                if (node?.fileName === 'description.md') return node

                originIndex--
                this.searchTextNodeBasedOnOriginIndex(
                    originIndex,
                    children,
                    type
                )
            }
        } else {
            while (originIndex < children.length) {
                const node = children[originIndex]
                if (node?.category === 'TEXT_FILE') return node
                if (node?.fileName === 'description.md') return node

                originIndex++
                this.searchTextNodeBasedOnOriginIndex(
                    originIndex,
                    children,
                    type
                )
            }
        }

        return undefined
    }

    public async walk(
        node: FTreeNode,
        _: number,
        children: Array<FTreeNode>
    ): Promise<void> {
        if (node.category !== 'TEXT_FILE') return

        const finalBuildPath = node.absolutePath
        const currNodeIndex = children.findIndex(
            (child) => child.absolutePath === node.absolutePath
        )
        if (currNodeIndex === -1) return

        const prevTextNode = this.searchTextNodeBasedOnOriginIndex(
            currNodeIndex - 1,
            children,
            'before'
        )
        const nextTextNode = this.searchTextNodeBasedOnOriginIndex(
            currNodeIndex + 1,
            children,
            'after'
        )
        if (!prevTextNode && !nextTextNode) return

        const prevPaginationMeta = await this.buildPaginationMeta({
            node: prevTextNode,
        })
        const nextPaginationMeta = await this.buildPaginationMeta({
            node: nextTextNode,
        })

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
