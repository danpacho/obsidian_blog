import type { FTreeNode } from 'packages/build_system/src/parser/node'
import { WalkTreePlugin, WalkTreePluginConfig } from '../../walk.tree.plugin'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'
import type { DefaultContentMeta } from './shared/meta/interface'

export interface SeriesInfoGeneratorConfig
    extends ContentMetaGeneratorOptions {}

export class SeriesInfoGeneratorPlugin extends WalkTreePlugin {
    public constructor(
        public readonly config: SeriesInfoGeneratorConfig = {
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
            name: 'SeriesInfoGenerator',
            exclude: 'description.md',
            skipFolderNode: true,
        }
    }

    private async getPostCollectionStore({
        seriesName,
        children,
    }: {
        seriesName: string
        children: Array<FTreeNode>
    }): Promise<DefaultContentMeta['seriesInfo']> {
        const res = children.reduce<Promise<DefaultContentMeta['seriesInfo']>>(
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
        node: FTreeNode,
        i: number,
        children: Array<FTreeNode>
    ): Promise<void> {
        if (node.category === 'FOLDER') return
        const metaRes = await this.meta.extractFromFile(node.absolutePath)
        if (!metaRes.success) return

        const meta = metaRes.data.meta
        if ('series' in meta === false || typeof meta.series !== 'string')
            return

        const seriesInfo = await this.getPostCollectionStore({
            seriesName: meta.series,
            children,
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
