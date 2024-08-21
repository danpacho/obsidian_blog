import type { FileTreeNode } from 'packages/build_system/src/parser/node'
import {
    WalkTreePlugin,
    type WalkTreePluginDynamicConfig,
    type WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'
import type { DefaultContentMeta } from './shared/meta/interface'

export type SeriesInfoGeneratorStaticConfig = WalkTreePluginStaticConfig
export type SeriesInfoGeneratorDynamicConfig = WalkTreePluginDynamicConfig &
    ContentMetaGeneratorOptions
export class SeriesInfoGeneratorPlugin extends WalkTreePlugin<
    SeriesInfoGeneratorStaticConfig,
    SeriesInfoGeneratorDynamicConfig
> {
    public defineStaticConfig(): SeriesInfoGeneratorStaticConfig {
        return {
            name: 'series-info-generator',
            description: 'Generate series info for the content',
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

    private get meta() {
        return this.$createMetaEngine(this.dynamicConfig.contentMeta)
    }

    private async getPostCollectionStore({
        seriesName,
        siblings,
    }: {
        seriesName: string
        siblings: Array<FileTreeNode>
    }): Promise<DefaultContentMeta['seriesInfo']> {
        const res = siblings.reduce<Promise<DefaultContentMeta['seriesInfo']>>(
            async (acc, curr) => {
                const awaited = await acc
                if (!awaited) return acc

                const metaRes = await this.meta.extractFromFile(
                    curr.absolutePath
                )
                if (!metaRes.success) return acc
                const meta = metaRes.data.meta as unknown as DefaultContentMeta

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

    public async walk(
        node: Parameters<WalkTreePlugin['walk']>[0],
        { siblings }: Parameters<WalkTreePlugin['walk']>[1]
    ): Promise<void> {
        if (node.category === 'FOLDER') return
        if (!siblings) return
        const metaRes = await this.meta.extractFromFile(node.absolutePath)
        if (!metaRes.success) return

        const meta = metaRes.data.meta
        if ('series' in meta === false || typeof meta.series !== 'string')
            return

        const seriesInfo = await this.getPostCollectionStore({
            seriesName: meta.series,
            siblings,
        })

        await this.meta.replace({
            injectPath: node.absolutePath,
            metaData: {
                content: metaRes.data.content,
                meta: {
                    ...meta,
                    seriesInfo,
                },
            },
        })

        this.$logger.success(`injected series info to ${node.absolutePath}`)
    }
}
