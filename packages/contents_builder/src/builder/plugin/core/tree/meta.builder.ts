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
    return async ({ meta: metaEngine, logger, io: ioManager }) => {
        const { contentMeta } = option
        const engine = metaEngine(contentMeta)
        const paramAnalyzer = new ParamAnalyzer(option.paramAnalyzer)

        return async (node) => {
            if (node.category !== 'TEXT_FILE') return

            const injectPath = node.buildInfo?.build_path

            if (!injectPath) {
                logger.error(`build path not defined: ${node.absolutePath}`)
                return
            }

            const metaExtractionResult = await engine.extractFromFile(
                node.absolutePath
            )

            const absSplit = node.absolutePath.split('/')

            const seriesInfo = absSplit.reduceRight<{
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
            )

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

            if (!metaExtractionResult.success) {
                if (metaExtractionResult.error instanceof Error) {
                    logger.warn(
                        `meta extraction error: ${metaExtractionResult.error.message} at ${node.absolutePath}\ninject default meta instead`
                    )
                }

                const pureMdContent = await ioManager.reader.readFile(
                    node.absolutePath
                )
                if (!pureMdContent.success) return

                await engine.inject({
                    injectPath: injectPath.build,
                    metaData: {
                        content: pureMdContent.data,
                        meta: categoryInfo.find
                            ? {
                                  category: categoryInfo.category,
                              }
                            : {},
                    },
                })
                return
            }

            if (!seriesInfo.find) {
                await engine.inject({
                    injectPath: injectPath.build,
                    metaData: {
                        content: metaExtractionResult.data.content,
                        meta: categoryInfo.find
                            ? {
                                  ...metaExtractionResult.data.meta,
                                  category: categoryInfo.category,
                              }
                            : {
                                  ...metaExtractionResult.data.meta,
                              },
                    },
                })
                return
            }

            await engine.inject({
                injectPath: injectPath.build,
                metaData: {
                    content: metaExtractionResult.data.content,
                    meta: categoryInfo.find
                        ? {
                              ...metaExtractionResult.data.meta,
                              series: seriesInfo.series,
                              category: categoryInfo.category,
                          }
                        : {
                              ...metaExtractionResult.data.meta,
                              series: seriesInfo.series,
                          },
                },
            })
            logger.success(
                `injected series meta: name ${seriesInfo.series}, at ${injectPath.build}`
            )
            return
        }
    }
}
