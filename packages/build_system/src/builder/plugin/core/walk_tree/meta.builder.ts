/******************************************************************************************
 *  Meta-Builder Plugin
 *
 *  • Generates `category`, `series:name`, `series:order` front-matter.
 *  • Uses the new `ParamAnalyzer` (`openTag` / `closeTag` supported).
 *  • Handles edge-cases:
 *      2️⃣  “outermost” dynamic segment chosen as category
 *      5️⃣  Windows ‘\’ paths normalized to POSIX
 *      6️⃣  Malformed segments no longer crash the walk – they’re skipped with a warning
 *
 *  Copy-paste straight into `meta-builder.plugin.ts`.
 ******************************************************************************************/

import path from 'node:path'
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
    ContentMetaGeneratorOptions & {
        paramAnalyzer?: ConstructorParameters<typeof ParamAnalyzer>[0]
        seriesOrderPropertyName?: string
    }

/* ------------------------------------------------------------------ */
/* 📦  MetaBuilderPlugin                                              */
/* ------------------------------------------------------------------ */

export class MetaBuilderPlugin extends WalkTreePlugin<
    MetaBuilderStaticConfig,
    MetaBuilderDynamicConfig
> {
    /* ---------------- static schema (unchanged) ------------------- */

    public defineStaticConfig(): WalkTreePluginStaticConfig {
        return {
            name: 'meta-builder',
            description:
                'Automatically injects `category`, `series.name`, and `series.order` ' +
                'into front-matter based on file location and naming conventions. `[seriesOrderPropertyName!]` should be specified for @{name}/{...list}',
            dynamicConfigSchema: {
                contentMeta: {
                    optional: true,
                    description:
                        'Customize how front-matter is parsed and generated. ' +
                        'Defaults are used when omitted.',
                    type: {
                        parser: {
                            type: 'Function',
                            description: 'Parse front-matter → object.',
                            typeDescription:
                                '(meta: unknown) => Record<string, unknown>',
                            defaultValue:
                                defaultContentMetaBuilderOptions.contentMeta
                                    .parser,
                        },
                        generator: {
                            type: 'Function',
                            description: 'Serialize object → front-matter.',
                            typeDescription:
                                '(meta: unknown) => Record<string, unknown>',
                            defaultValue:
                                defaultContentMetaBuilderOptions.contentMeta
                                    .generator,
                        },
                    },
                },
                paramAnalyzer: {
                    optional: true,
                    description:
                        'Configure how dynamic path segments are recognized. ' +
                        'Use `openTag` / `closeTag` for the new concise syntax, or ' +
                        'fallback to `paramShape` / `paramExtractor` for full control.',
                    type: {
                        openTag: {
                            type: 'string',
                            optional: true,
                            description:
                                'Opening delimiter (single char). Default "(".',
                            defaultValue: '(',
                        },
                        closeTag: {
                            type: 'string',
                            optional: true,
                            description:
                                'Closing delimiter (single char). Default ")".',
                            defaultValue: ')',
                        },
                        paramShape: {
                            optional: true,
                            description:
                                'Legacy regex overrides – supersede open/closeTag.',
                            type: {
                                single: {
                                    type: 'RegExp',
                                    optional: true,
                                    description:
                                        'Regex for single dynamic param (e.g. `(foo)`).',
                                },
                                multiple: {
                                    type: 'RegExp',
                                    optional: true,
                                    description:
                                        'Regex for spread dynamic param (e.g. `(...bar)`).',
                                },
                            },
                        },
                        paramExtractor: {
                            optional: true,
                            description:
                                'Legacy extractor overrides – supersede defaults.',
                            type: {
                                single: {
                                    type: 'Function',
                                    optional: true,
                                    description:
                                        '(paramString: string) => string – extract single.',
                                },
                                multiple: {
                                    type: 'Function',
                                    optional: true,
                                    description:
                                        '(paramString: string) => string – extract spread.',
                                },
                            },
                        },
                    },
                },
                seriesOrderPropertyName: {
                    type: 'string',
                    description:
                        '`[seriesOrderPropertyName]` should be specified for specifying series order, default to `order`',
                    defaultValue: 'order',
                    optional: true,
                },
            },
        }
    }

    /* ------------------------ helpers ----------------------------- */

    private _paramAnalyzer: ParamAnalyzer | null = null
    private get paramAnalyzer(): ParamAnalyzer {
        if (!this._paramAnalyzer) {
            this._paramAnalyzer = new ParamAnalyzer(
                this.dynamicConfig.paramAnalyzer
            )
        }
        return this._paramAnalyzer
    }

    private get meta() {
        if (!this.dynamicConfig.contentMeta) {
            throw new Error('contentMeta missing – set it in dynamic config.')
        }
        return this.$createMetaEngine(this.dynamicConfig.contentMeta)
    }

    private toPosix(p: string): string {
        return p.replaceAll(path.sep, '/')
    }

    private getCategoryFromPath(segments: string[]): string | undefined {
        for (const seg of segments) {
            try {
                const res = this.paramAnalyzer.analyzeSingleParam(seg)
                if (res.isDynamicParam) return res.paramName
            } catch (err) {
                this.$logger.warn(
                    `Ignoring malformed segment "${seg}" – ${
                        (err as Error).message
                    }`
                )
            }
        }
        return undefined
    }

    private omit<T extends Record<string, any>, K extends keyof T>(
        obj: T,
        keyToOmit: K
    ): Omit<T, K> {
        const { [keyToOmit]: _, ...rest } = obj
        return rest
    }

    /* -------------- series deduction ------------------ */

    private seriesCountMap: Map<string, number> = new Map()
    private inquire(seriesKey: string): number {
        if (this.seriesCountMap.has(seriesKey)) {
            const res = this.seriesCountMap.get(seriesKey)! + 1
            this.seriesCountMap.set(seriesKey, res)
            return res
        } else {
            this.seriesCountMap.set(seriesKey, 1)
            return 1
        }
    }
    private async getSeriesInfo(originPath: string): Promise<{
        series: {
            name: string | undefined
            order: number | undefined
        }
    } | null> {
        const parts = originPath.split('/')

        const series = parts.reduceRight<{
            found: boolean
            name?: string
        }>(
            (acc, curr) => {
                if (acc.found) return acc
                if (curr.startsWith('@')) {
                    return { found: true, name: curr.replaceAll('@', '') }
                }
                return acc
            },
            { found: false }
        ).name

        if (!series) return null

        const existing = await this.meta.extractFromFile(originPath)

        const seriesOrderForFallback = this.inquire(series)

        if (
            !existing.success ||
            !(this.dynamicConfig.seriesOrderPropertyName! in existing.data.meta)
        ) {
            const defaultSeriesMeta = {
                series: { name: series, order: seriesOrderForFallback },
            }

            const writeToOrigin = await this.meta.update({
                injectPath: originPath,
                meta: {
                    [this.dynamicConfig.seriesOrderPropertyName!]:
                        seriesOrderForFallback,
                },
            })
            if (writeToOrigin.success) {
                this.$logger.info(
                    `fallback writing : ${this.dynamicConfig.seriesOrderPropertyName} is set to ${seriesOrderForFallback}`
                )
            } else {
                this.$logger.error(
                    `error writing : ${this.dynamicConfig.seriesOrderPropertyName} should be written, but fail to write`
                )
            }
            return defaultSeriesMeta
        }

        return {
            series: {
                name: series,
                order: Number(
                    existing.data.meta[
                        this.dynamicConfig.seriesOrderPropertyName!
                    ]
                ),
            },
        }
    }

    /* ------------------ main walk() function ---------------------- */

    public async walk(node: FileTreeNode): Promise<void> {
        if (node.category !== 'TEXT_FILE') return

        const injectPath = node.buildInfo?.build_path
        if (!injectPath) {
            const msg = `build path not defined: ${node.absolutePath}`
            this.$logger.error(msg)
            throw new Error(msg, { cause: node })
        }

        /* Handle Windows paths + choose category (Edge 2 & 5) */
        const posixOrigin = this.toPosix(injectPath.origin)
        const segments = posixOrigin.split('/').filter(Boolean)
        const category = this.getCategoryFromPath(segments)

        /* series & seriesOrder */
        const seriesInfo = await this.getSeriesInfo(posixOrigin)

        /* Update meta */
        /* Omit [this.dynamicConfig.seriesOrderPropertyName] */
        const originMeta = await this.meta.extractFromFile(injectPath.build)
        if (!originMeta.success) {
            this.$logger.error(
                `fail to extract existing builded metadata from ${injectPath.build}`
            )
            throw originMeta.error
        }

        const updatedMetaBase = {
            ...this.omit(
                { ...originMeta.data.meta },
                this.dynamicConfig.seriesOrderPropertyName!
            ),
        }

        const update = await this.meta.replace({
            injectPath: injectPath.build,
            metaData: {
                content: originMeta.data.content,
                meta: seriesInfo
                    ? { ...updatedMetaBase, category, ...seriesInfo }
                    : { ...updatedMetaBase, category },
            },
        })

        if (update.success) {
            this.$logger.success(
                `meta injected → category="${category}" ` +
                    seriesInfo +
                    seriesInfo && seriesInfo?.series
                    ? `series="${seriesInfo?.series.name}" (${injectPath.build})`
                    : ''
            )
        } else {
            throw new Error(`Failed to inject meta for ${injectPath.build}`, {
                cause: update.error,
            })
        }
    }
}
