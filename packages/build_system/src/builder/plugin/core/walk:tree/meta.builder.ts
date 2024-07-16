import type { FileTreeNode } from 'packages/build_system/src/parser'
import { ParamAnalyzer } from '../../../../routes'
import {
    WalkTreePlugin,
    WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'

export type MetaBuilderConfig = ContentMetaGeneratorOptions

export class MetaBuilderPlugin extends WalkTreePlugin {
    public constructor(
        public readonly config: MetaBuilderConfig = defaultContentMetaBuilderOptions
    ) {
        super()
        this.paramAnalyzer = new ParamAnalyzer(config.paramAnalyzer)
    }

    private get meta() {
        return this.$createMetaEngine(this.config.contentMeta)
    }
    private readonly paramAnalyzer: ParamAnalyzer

    public defineStaticConfig(): WalkTreePluginStaticConfig {
        return {
            name: 'MetaBuilder',
            description: 'Generate meta information for the content',
        }
    }

    private async getSeriesInfo(originPath: string): Promise<{
        series: string | undefined
        seriesOrder: number | undefined
    }> {
        const absSplit = originPath.split('/')
        const seriesName = absSplit.reduceRight<{
            find: boolean
            series: string | undefined
        }>(
            (info, curr) => {
                if (info.find) return info

                if (curr.includes('@')) {
                    return {
                        find: true,
                        series: curr.replaceAll('@', ''),
                    }
                }
                return info
            },
            {
                find: false,
                series: undefined,
            }
        ).series

        if (!seriesName) {
            return {
                series: undefined,
                seriesOrder: undefined,
            }
        }

        const seriesOrderMeta = await this.meta.extractFromFile(originPath)

        if (
            !seriesOrderMeta.success ||
            (seriesOrderMeta.success &&
                'seriesOrder' in seriesOrderMeta.data.meta === false)
        ) {
            const newMeta = {
                series: seriesName,
                seriesOrder: 1,
            }
            await this.meta.update({
                injectPath: originPath,
                meta: {
                    seriesOrder: 1,
                },
            })
            return newMeta
        }

        return {
            series: seriesName,
            seriesOrder: Number(seriesOrderMeta.data.meta.seriesOrder),
        }
    }

    public async walk(node: FileTreeNode): Promise<void> {
        if (node.category !== 'TEXT_FILE') return

        const injectPath = node.buildInfo?.build_path

        if (!injectPath) {
            this.$logger.error(`build path not defined: ${node.absolutePath}`)
            return
        }

        const absSplit = injectPath.origin.split('/')

        const categoryInfo = absSplit.reduceRight<{
            find: boolean
            category: string | undefined
        }>(
            (p, curr) => {
                if (p.find) return p

                const res = this.paramAnalyzer.analyzeSingleParam(curr)
                if (res.isDynamicParam) {
                    return {
                        find: true,
                        category: res.paramName,
                    }
                }
                return p
            },
            {
                find: false,
                category: undefined,
            }
        )

        const seriesInfo = await this.getSeriesInfo(injectPath.origin)

        const updateBuild = await this.meta.update({
            injectPath: injectPath.build,
            meta: {
                category: categoryInfo.category,
                ...seriesInfo,
            },
        })

        const updateOrigin = await this.meta.update({
            injectPath: injectPath.origin,
            meta: {
                category: categoryInfo.category,
                ...seriesInfo,
            },
        })

        if (updateBuild.success && updateOrigin.success) {
            this.$logger.success(
                `injected series meta: name ${seriesInfo.series}, at ${injectPath.build}`
            )
        }
    }
}
