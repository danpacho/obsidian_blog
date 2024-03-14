import type { BuilderPlugin } from '../..'
import type { Promisify } from '../../../../utils/promisify'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'
import {
    DefaultContentMeta,
    DefaultPaginationInfo,
} from './shared/meta/constant'

type FTreeNode = Parameters<
    Awaited<ReturnType<BuilderPlugin['walk:generated:tree']>>
>[0]

export interface PaginationBuilderConfig extends ContentMetaGeneratorOptions {}
export const PaginationBuilder = (
    option: PaginationBuilderConfig = {
        ...defaultContentMetaBuilderOptions,
    }
): BuilderPlugin['walk:generated:tree'] => {
    return async ({ meta: metaEngine, logger }) => {
        const metaExtractor = metaEngine(option.contentMeta)

        const buildPaginationMeta = async ({
            engine,
            node,
        }: {
            engine: typeof metaExtractor
            node: FTreeNode | undefined
        }): Promisify<DefaultPaginationInfo> => {
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

            const metaResult = await engine.extractFromFile(buildPath)
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

        const searchTextNodeBasedOnOriginIndex = (
            originIndex: number,
            children: FTreeNode[],
            type: 'before' | 'after'
        ): FTreeNode | undefined => {
            if (type === 'before') {
                while (originIndex >= 0) {
                    const node = children[originIndex]
                    if (node?.category === 'TEXT_FILE') return node
                    originIndex--
                    searchTextNodeBasedOnOriginIndex(
                        originIndex,
                        children,
                        type
                    )
                }
            } else {
                while (originIndex < children.length) {
                    const node = children[originIndex]
                    if (node?.category === 'TEXT_FILE') return node
                    originIndex++
                    searchTextNodeBasedOnOriginIndex(
                        originIndex,
                        children,
                        type
                    )
                }
            }

            return undefined
        }

        return async (node, _, children) => {
            if (node.category !== 'TEXT_FILE') return

            const finalBuildPath = node.absolutePath
            const currNodeIndex = children.findIndex(
                (child) => child.absolutePath === node.absolutePath
            )
            if (currNodeIndex === -1) return

            const prevTextNode = searchTextNodeBasedOnOriginIndex(
                currNodeIndex - 1,
                children,
                'before'
            )
            const nextTextNode = searchTextNodeBasedOnOriginIndex(
                currNodeIndex + 1,
                children,
                'after'
            )
            if (!prevTextNode && !nextTextNode) return

            const prevPaginationMeta = await buildPaginationMeta({
                engine: metaExtractor,
                node: prevTextNode,
            })
            const nextPaginationMeta = await buildPaginationMeta({
                engine: metaExtractor,
                node: nextTextNode,
            })

            const metaDataResult =
                await metaExtractor.extractFromFile(finalBuildPath)

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

            const injectResult = await metaExtractor.inject({
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
            logger.success(`injected pagination meta to ${finalBuildPath}`)
        }
    }
}
