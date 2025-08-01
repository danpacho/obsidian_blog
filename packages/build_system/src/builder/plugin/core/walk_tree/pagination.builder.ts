import { WalkTreePlugin } from '../../walk.tree.plugin'

import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'

import type {
    WalkTreePluginDynamicConfig,
    WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'
import type {
    DefaultContentMeta,
    DefaultPaginationInfo,
} from './shared/meta/interface'
import type { Promisify } from '@obsidian_blogger/helpers'
import type { FileTreeNode, FolderNode } from 'packages/build_system/src/parser'

export type PaginationBuilderStaticConfig = WalkTreePluginStaticConfig
export type PaginationBuilderDynamicConfig = WalkTreePluginDynamicConfig &
    ContentMetaGeneratorOptions

export class PaginationBuilderPlugin extends WalkTreePlugin<
    PaginationBuilderStaticConfig,
    PaginationBuilderDynamicConfig
> {
    public defineStaticConfig(): PaginationBuilderStaticConfig {
        return {
            name: 'pagination-builder',
            description:
                'Generate pagination meta information for the content. It should be called after StaticParamBuilderPlugin.',
            dynamicConfigSchema: {
                contentMeta: {
                    type: {
                        parser: {
                            type: 'Function',
                            description: 'Parser function for the meta',
                            typeDescription:
                                '(meta: unknown) => Record<string, unknown>',
                            defaultValue:
                                defaultContentMetaBuilderOptions.contentMeta
                                    .parser,
                        },
                        generator: {
                            type: 'Function',
                            description: 'Generator function for the meta',
                            typeDescription:
                                '(meta: unknown) => Record<string, unknown>',
                            defaultValue:
                                defaultContentMetaBuilderOptions.contentMeta
                                    .generator,
                        },
                    },
                    description: 'Content meta parser and generator',
                    optional: true,
                },
            },
        }
    }

    private allTextFiles: Array<FileTreeNode> = []

    public override async prepare(): Promise<void> {
        const rootNode = this.dependencies!.parser.ast!
        this.allTextFiles = this.flattenTree([rootNode])
    }

    private get meta() {
        if (!this.dynamicConfig.contentMeta) {
            throw new Error('contentMeta missing – set it in dynamic config.')
        }
        return this.$createMetaEngine(this.dynamicConfig.contentMeta)
    }

    private omit(obj: Record<string, unknown>, keyToOmit: string) {
        // “[keyToOmit]: _” means “grab obj[keyToOmit] into a variable called _”
        // “...rest” then collects *all other* own-enumerable props into ‘rest’
        const { [keyToOmit]: _, ...rest } = obj
        return rest
    }

    /**
     * Extract the metadata from a text-file node, returning href/title/description
     * for pagination usage.
     */
    private async buildPaginationMeta(
        node: FileTreeNode | undefined
    ): Promisify<DefaultPaginationInfo> {
        if (!node) {
            return {
                success: false,
                error: new Error('node is undefined'),
            }
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

        const href = typedMeta.href ?? undefined
        const title = typedMeta.title
        const description = typedMeta.description

        return {
            success: true,
            data: {
                ...data.meta,
                href,
                title,
                description,
            },
        }
    }

    private flattenTree(
        tree: Array<FileTreeNode>,
        result: Array<FileTreeNode> = []
    ): Array<FileTreeNode> {
        for (const node of tree) {
            if (node.category === 'TEXT_FILE') {
                result.push(node)
            }
            if (node.category === 'FOLDER') {
                this.flattenTree((node as FolderNode).children, result)
            }
        }

        return result
    }

    public async walk(
        node: Parameters<WalkTreePlugin['walk']>[0]
    ): Promise<void> {
        if (node.category !== 'TEXT_FILE') return

        // Locate the current node in our flattened array
        const index = this.allTextFiles.findIndex(
            (n) => n.absolutePath === node.absolutePath
        )
        if (index === -1) return

        // Identify the previous and next items in the array (if any)
        const prevNode = index > 0 ? this.allTextFiles[index - 1] : undefined
        const nextNode =
            index < this.allTextFiles.length - 1
                ? this.allTextFiles[index + 1]
                : undefined

        // Build pagination metadata for prev/next
        const prevPaginationMeta = await this.buildPaginationMeta(prevNode)
        const nextPaginationMeta = await this.buildPaginationMeta(nextNode)

        // Extract the current file’s meta
        const metaDataResult = await this.meta.extractFromFile(
            node.absolutePath
        )
        if (!metaDataResult.success) {
            this.$logger.warn(`No meta data found for ${node.absolutePath}`)
            throw new Error(`No meta data found for ${node.absolutePath}`, {
                cause: node,
            })
        }

        const originalMeta = metaDataResult.data.meta
        const paginationMeta = {
            prev: prevPaginationMeta.success
                ? this.omit(
                      prevPaginationMeta.data as unknown as Record<
                          string,
                          unknown
                      >,
                      'pagination'
                  )
                : undefined,
            next: nextPaginationMeta.success
                ? this.omit(
                      nextPaginationMeta.data as unknown as Record<
                          string,
                          unknown
                      >,
                      'pagination'
                  )
                : undefined,
        }

        // Inject the pagination meta back into the file
        const injectResult = await this.meta.replace({
            injectPath: node.absolutePath,
            metaData: {
                content: metaDataResult.data.content,
                meta: {
                    ...originalMeta,
                    pagination: paginationMeta,
                },
            },
        })

        if (!injectResult.success) {
            this.$logger.warn(
                `Failed to inject pagination meta: ${node.absolutePath}`
            )
            throw injectResult.error
        }

        this.$logger.success(
            `Injected pagination meta into ${node.absolutePath}`
        )
    }
}
