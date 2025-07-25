import {
    WalkTreePlugin,
    type WalkTreePluginDynamicConfig,
    type WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'

import {
    type CategoryDescriptionGeneratorOptions,
    defaultCategoryDescriptionBuilderOptions,
} from './shared/meta'

import type {
    DefaultCategoryMeta,
    DefaultContentMeta,
} from './shared/meta/interface'
import type { FileTreeNode } from 'packages/build_system/src/parser/node'

export type CategoryDescriptionGeneratorStaticConfig =
    WalkTreePluginStaticConfig
export type CategoryDescriptionGeneratorDynamicConfig =
    WalkTreePluginDynamicConfig &
        Partial<CategoryDescriptionGeneratorOptions> & {
            path?: string
            descriptionFileName?: string
        }
export class CategoryDescriptionGeneratorPlugin extends WalkTreePlugin<
    CategoryDescriptionGeneratorStaticConfig,
    CategoryDescriptionGeneratorDynamicConfig
> {
    private get meta() {
        return this.$createMetaEngine(this.dynamicConfig.categoryMeta!)
    }

    protected override defineStaticConfig(): CategoryDescriptionGeneratorStaticConfig {
        return {
            name: 'category-description-generator',
            description:
                'Generate category description from {{descriptionFileName}}',
            dynamicConfigSchema: {
                categoryMeta: {
                    type: {
                        parser: {
                            type: 'Function',
                            description: 'Parser function for the meta',
                            typeDescription:
                                '(meta: unknown) => Record<string, unknown>',
                            defaultValue:
                                defaultCategoryDescriptionBuilderOptions
                                    .categoryMeta.parser,
                        },
                        generator: {
                            type: 'Function',
                            description: 'Generator function for the meta',
                            typeDescription:
                                '(meta: unknown) => Record<string, unknown>',
                            defaultValue:
                                defaultCategoryDescriptionBuilderOptions
                                    .categoryMeta.generator,
                        },
                    },
                    description: 'Category meta parser and generator',
                    optional: true,
                },
                path: {
                    type: 'string',
                    description: 'The path to write the generated file',
                    optional: true,
                },
                descriptionFileName: {
                    type: 'string',
                    description: 'The file name of the description file',
                    defaultValue: 'description.md',
                    optional: true,
                },
            },
        }
    }

    private async getPostCollection(
        children: Array<FileTreeNode>
    ): Promise<Array<DefaultContentMeta>> {
        const postCollection = children.reduce<
            Promise<Array<DefaultContentMeta>>
        >(
            async (acc, curr) => {
                const awaited = await acc
                if (!awaited) return acc

                if (curr.fileName === this.dynamicConfig.descriptionFileName)
                    return acc

                if (curr.category === 'FOLDER') {
                    if (!curr.children) return acc
                    const postCollection = await this.getPostCollection(
                        curr.children
                    )
                    awaited.push(...postCollection)
                    return awaited
                }
                if (curr.category !== 'TEXT_FILE') return acc

                const postMeta = await this.meta.extractFromFile(
                    curr.absolutePath
                )
                if (!postMeta.success) return acc

                const meta = postMeta.data.meta as unknown as DefaultContentMeta
                awaited.push(meta)
                return awaited
            },
            Promise.resolve([]) as Promise<Array<DefaultContentMeta>>
        )

        return postCollection
    }

    private async getPostCollectionContainer(
        children: Array<FileTreeNode>
    ): Promise<DefaultCategoryMeta> {
        const postCollectionContainer = children.reduce<
            Promise<DefaultCategoryMeta>
        >(
            async (acc, curr, _, tot) => {
                const awaited = await acc
                if (!awaited) return acc

                if (curr.category !== 'TEXT_FILE') return acc
                if (curr.fileName !== this.dynamicConfig.descriptionFileName)
                    return acc

                const descriptionMeta = await this.meta.extractFromFile(
                    curr.absolutePath
                )
                if (!descriptionMeta.success) return acc

                const categoryMeta = descriptionMeta.data
                    .meta as unknown as DefaultCategoryMeta

                const postCollection = await this.getPostCollection(tot)

                awaited.title = categoryMeta.title
                awaited.description = categoryMeta.description
                awaited.postCollection = postCollection

                return acc
            },
            Promise.resolve({
                title: '',
                description: '',
                postCollection: [],
            }) as Promise<DefaultCategoryMeta>
        )

        return postCollectionContainer
    }

    public async walk(
        node: Parameters<WalkTreePlugin['walk']>[0],
        { siblings }: Parameters<WalkTreePlugin['walk']>[1]
    ): Promise<void> {
        if (node.fileName !== this.dynamicConfig.descriptionFileName) return
        if (!node.parentInfo) return
        if (!siblings) return

        const postCollectionContainer =
            await this.getPostCollectionContainer(siblings)

        const writePath: string = this.dynamicConfig?.path
            ? `${this.dynamicConfig.path}/${node.parentInfo.fileName}.json`
            : `${this.$buildPath.contents}/${node.parentInfo.fileName}.json`

        const collectionRecord = await this.$io.writer.write({
            data: JSON.stringify(postCollectionContainer, null, 4),
            filePath: writePath,
        })

        const descriptionDelete = await this.$io.writer.deleteFile(
            node.absolutePath
        )

        if (collectionRecord.success && descriptionDelete.success) {
            this.$logger.success(
                `Post collection for ${node.parentInfo.fileName} is generated`
            )
            return
        }

        if (!collectionRecord.success) {
            throw collectionRecord.error
        }

        if (!descriptionDelete.success) {
            throw descriptionDelete.error
        }
    }
}
