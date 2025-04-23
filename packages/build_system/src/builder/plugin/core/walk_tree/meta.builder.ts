import type { FileTreeNode } from 'packages/build_system/src/parser'
import { ParamAnalyzer } from '../../../../routes'
import {
    WalkTreePlugin,
    type WalkTreePluginDynamicConfig,
    type WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'

export type MetaBuilderStaticConfig = WalkTreePluginStaticConfig
export type MetaBuilderDynamicConfig = WalkTreePluginDynamicConfig &
    ContentMetaGeneratorOptions

export class MetaBuilderPlugin extends WalkTreePlugin<
    MetaBuilderStaticConfig,
    MetaBuilderDynamicConfig
> {
    public defineStaticConfig(): WalkTreePluginStaticConfig {
        return {
            name: 'meta-builder',
            description: 'Generate meta information for the content',
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
                paramAnalyzer: {
                    description: 'Define the param analyzer options',
                    optional: true,
                    type: {
                        paramShape: {
                            description: 'Define shape of dynamic param',
                            type: {
                                single: {
                                    type: 'RegExp',
                                    description:
                                        'Shape of single dynamic param',
                                    optional: true,
                                },

                                multiple: {
                                    type: 'RegExp',
                                    description:
                                        'Shape of multiple dynamic param',
                                    optional: true,
                                },
                            },
                            optional: true,
                        },
                        paramExtractor: {
                            type: {
                                single: {
                                    type: 'Function',
                                    description:
                                        'The function to extract single dynamic param',
                                    typeDescription:
                                        '(paramString: string) => string',
                                    optional: true,
                                },
                                multiple: {
                                    type: 'Function',
                                    description:
                                        'The function to extract multiple dynamic param',
                                    optional: true,
                                },
                            },
                            optional: true,
                            description: 'Define the function to extract param',
                        },
                    },
                },
            },
        }
    }

    private get paramAnalyzer() {
        if (!this._paramAnalyzer) {
            this._paramAnalyzer = new ParamAnalyzer(
                this.dynamicConfig.paramAnalyzer
            )
        }
        return this._paramAnalyzer
    }
    private _paramAnalyzer: ParamAnalyzer | null = null

    private get meta() {
        return this.$createMetaEngine(this.dynamicConfig.contentMeta)
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
