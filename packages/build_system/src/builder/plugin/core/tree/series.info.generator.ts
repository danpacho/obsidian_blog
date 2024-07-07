import type { FTreeNode } from 'packages/build_system/src/parser/node'
import type { BuilderPlugin } from '../..'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'
import { type DefaultContentMeta } from './shared/meta/interface'

export interface SeriesInfoGeneratorConfig
    extends ContentMetaGeneratorOptions {}
export const SeriesInfoGenerator =
    (
        config: SeriesInfoGeneratorConfig = {
            ...defaultContentMetaBuilderOptions,
        }
    ): BuilderPlugin['walk:tree'] =>
    async ({ meta, logger }) => {
        const engine = meta(config.contentMeta)
        const getPostCollectionStore = async ({
            seriesName,
            children,
        }: {
            seriesName: string
            children: Array<FTreeNode>
        }): Promise<DefaultContentMeta['seriesInfo']> => {
            const res = children.reduce<
                Promise<DefaultContentMeta['seriesInfo']>
            >(
                async (acc, curr) => {
                    const awaited = await acc
                    if (!awaited) return acc

                    const metaRes = await engine.extractFromFile(
                        curr.absolutePath
                    )
                    if (!metaRes.success) return acc
                    const meta = metaRes.data
                        .meta as unknown as DefaultContentMeta

                    if (meta.series !== seriesName) return acc

                    if (!meta.href) return acc
                    if (!meta.update) return acc
                    awaited.push({
                        title: meta.title,
                        description: meta.description,
                        href: meta.href,
                        update: meta.update,
                        seriesOrder: Number(meta.seriesOrder),
                    })
                    return awaited
                },
                Promise.resolve([]) as Promise<DefaultContentMeta['seriesInfo']>
            )
            return res
        }

        return {
            name: 'SeriesInfoGenerator',
            exclude: 'description.md',
            skipFolderNode: true,
            walker: async (node, i, children) => {
                if (node.category === 'FOLDER') return
                const metaRes = await engine.extractFromFile(node.absolutePath)
                if (!metaRes.success) return

                const meta = metaRes.data.meta
                if (
                    'series' in meta === false ||
                    typeof meta.series !== 'string'
                )
                    return

                const seriesInfo = await getPostCollectionStore({
                    seriesName: meta.series,
                    children,
                })

                await engine.replace({
                    injectPath: node.absolutePath,
                    metaData: {
                        content: metaRes.data.content,
                        meta: {
                            ...meta,
                            seriesInfo,
                        },
                    },
                })

                logger.success(`injected series info to ${node.absolutePath}`)
            },
        }
    }
