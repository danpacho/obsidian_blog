import type { FTreeNode } from 'packages/build_system/src/parser/node'
import type { BuilderPlugin } from '../..'
import {
    type CategoryDescriptionGeneratorOptions,
    defaultCategoryDescriptionBuilderOptions,
} from './shared/meta'
import type {
    DefaultCategoryMeta,
    DefaultContentMeta,
} from './shared/meta/interface'

export interface CategoryDescriptionGeneratorConfig
    extends CategoryDescriptionGeneratorOptions {
    path?: string
}
export const CategoryDescriptionGenerator =
    (
        config: CategoryDescriptionGeneratorConfig = {
            ...defaultCategoryDescriptionBuilderOptions,
        }
    ): BuilderPlugin['walk:generated:tree'] =>
    async ({ meta, io, logger, buildPath }) => {
        const engine = meta(config.categoryMeta)

        const DESCRIPTION_FILENAME = 'description.md' as const

        const getPostCollection = async (
            children: Array<FTreeNode>
        ): Promise<Array<DefaultContentMeta>> => {
            const postCollection = children.reduce<
                Promise<Array<DefaultContentMeta>>
            >(
                async (acc, curr) => {
                    const awaited = await acc
                    if (!awaited) return acc

                    if (curr.fileName === DESCRIPTION_FILENAME) return acc

                    if (curr.category === 'FOLDER') {
                        if (!curr.children) return acc
                        const postCollection = await getPostCollection(
                            curr.children
                        )
                        awaited.push(...postCollection)
                        return awaited
                    }
                    if (curr.category !== 'TEXT_FILE') return acc

                    const postMeta = await engine.extractFromFile(
                        curr.absolutePath
                    )
                    if (!postMeta.success) return acc

                    const meta = postMeta.data
                        .meta as unknown as DefaultContentMeta
                    awaited.push(meta)
                    return awaited
                },
                Promise.resolve([]) as Promise<Array<DefaultContentMeta>>
            )

            return postCollection
        }

        const getPostCollectionContainer = async (
            children: Array<FTreeNode>
        ): Promise<DefaultCategoryMeta> => {
            const postCollectionContainer = children.reduce<
                Promise<DefaultCategoryMeta>
            >(
                async (acc, curr, _, tot) => {
                    const awaited = await acc
                    if (!awaited) return acc

                    if (curr.category !== 'TEXT_FILE') return acc
                    if (curr.fileName !== DESCRIPTION_FILENAME) return acc

                    const descriptionMeta = await engine.extractFromFile(
                        curr.absolutePath
                    )
                    if (!descriptionMeta.success) return acc

                    const categoryMeta = descriptionMeta.data
                        .meta as unknown as DefaultCategoryMeta

                    const postCollection = await getPostCollection(tot)

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

        return {
            name: 'CategoryDescriptionGenerator',
            skipFolderNode: true,
            walker: async (node, _, children) => {
                if (node.fileName !== DESCRIPTION_FILENAME) return
                if (!node.parentInfo) return

                const postCollectionContainer =
                    await getPostCollectionContainer(children)

                const writePath: string = config?.path
                    ? `${config.path}/${node.parentInfo.fileName}.json`
                    : `${buildPath.contents}/${node.parentInfo.fileName}.json`

                const collectionRecord = await io.writer.write({
                    data: JSON.stringify(postCollectionContainer, null, 4),
                    filePath: writePath,
                })
                const descriptionDelete = await io.writer.deleteFile(
                    node.absolutePath
                )
                if (collectionRecord.success && descriptionDelete.success) {
                    logger.success(
                        `Post collection for ${node.parentInfo.fileName} is generated`
                    )
                    return
                }
            },
        }
    }
