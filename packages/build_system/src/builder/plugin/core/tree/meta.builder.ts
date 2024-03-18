import type { BuilderPlugin } from '../..'
import { ParamAnalyzer } from '../../../../routes'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'

export interface MetaBuilderConfig extends ContentMetaGeneratorOptions {}
export const MetaBuilder = (
    option: MetaBuilderConfig = defaultContentMetaBuilderOptions
): BuilderPlugin['build:origin:tree'] => {
    return async ({ meta, logger }) => {
        const { contentMeta } = option
        const paramAnalyzer = new ParamAnalyzer(option.paramAnalyzer)
        const engine = meta(contentMeta)

        const getSeriesInfo = async (
            originPath: string
        ): Promise<{
            series: string | undefined
            seriesOrder: number | undefined
        }> => {
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
            if (!seriesName)
                return {
                    series: undefined,
                    seriesOrder: undefined,
                }

            const seriesOrderMeta = await engine.extractFromFile(originPath)

            if (
                !seriesOrderMeta.success ||
                (seriesOrderMeta.success &&
                    'seriesOrder' in seriesOrderMeta.data.meta === false)
            ) {
                const newMeta = {
                    series: seriesName,
                    seriesOrder: 1,
                }
                await engine.update({
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

        return async (node) => {
            if (node.category !== 'TEXT_FILE') return
            if (node.fileName === 'description.md') return

            const injectPath = node.buildInfo?.build_path

            if (!injectPath) {
                logger.error(`build path not defined: ${node.absolutePath}`)
                return
            }

            const absSplit = injectPath.origin.split('/')

            const categoryInfo = absSplit.reduceRight<{
                find: boolean
                category: string | undefined
            }>(
                (p, curr) => {
                    if (p.find) return p

                    const res = paramAnalyzer.analyzeSingleParam(curr)
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

            const seriesInfo = await getSeriesInfo(injectPath.origin)

            const updateBuild = await engine.update({
                injectPath: injectPath.build,
                meta: {
                    category: categoryInfo.category,
                    ...seriesInfo,
                },
            })

            const updateOrigin = await engine.update({
                injectPath: injectPath.origin,
                meta: {
                    category: categoryInfo.category,
                    ...seriesInfo,
                },
            })

            if (updateBuild.success && updateOrigin.success) {
                logger.success(
                    `injected series meta: name ${seriesInfo.series}, at ${injectPath.build}`
                )
            }
            return
        }
    }
}
