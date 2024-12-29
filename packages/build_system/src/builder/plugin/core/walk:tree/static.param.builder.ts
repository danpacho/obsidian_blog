import { FileReader } from '@obsidian_blogger/helpers'
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

type RecordShape = Record<string, string>

export interface StaticParamBuilderConfig
    extends Partial<ContentMetaGeneratorOptions> {
    /**
     * Define the shape of dynamic param
     *
     * @default '/[category]/[...post]'
     * @example '/$page/[...posts]'
     *
     * @description
     * 1. `[name]` - single dynamic param
     * 2. `[...name]` - multiple dynamic param
     * 3. `$page` - special dynamic param for pagination
     */
    paramShape: string
    /**
     * Define the maximum page number for pagination
     *
     * @default 7
     * @description
     * if there is an $page param, this value will be used to determine the maximum page number
     */
    maxPage?: number
}

export type StaticParamBuilderStaticConfig = WalkTreePluginStaticConfig
export type StaticParamBuilderDynamicConfig = WalkTreePluginDynamicConfig &
    StaticParamBuilderConfig

export class StaticParamBuilderPlugin extends WalkTreePlugin<
    StaticParamBuilderStaticConfig,
    StaticParamBuilderDynamicConfig
> {
    public defineStaticConfig(): WalkTreePluginStaticConfig {
        return {
            name: 'static-param-builder',
            description: 'Inject static params to the content',
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
                paramShape: {
                    type: 'string',
                    description: 'Define the shape of dynamic param',
                    defaultValue: '/[...post]',
                },
                maxPage: {
                    type: 'number',
                    description:
                        'Define the maximum page number for pagination',
                    defaultValue: 7,
                    optional: true,
                },
            },
        }
    }

    private _paramAnalyzer: ParamAnalyzer | undefined
    private get paramAnalyzer() {
        if (!this._paramAnalyzer) {
            this._paramAnalyzer = new ParamAnalyzer(
                this.dynamicConfig.paramAnalyzer
            )
        }
        return this._paramAnalyzer
    }
    private _analyzed: ReturnType<ParamAnalyzer['analyzeParam']> | undefined
    private get analyzed() {
        if (!this._analyzed) {
            this._analyzed = this.paramAnalyzer.analyzeParam(
                this.dynamicConfig.paramShape
            )
        }
        return this._analyzed
    }

    private get meta() {
        return this.$createMetaEngine(
            this.dynamicConfig?.contentMeta ??
                this.defaultDynamicConfig!.contentMeta!
        )
    }

    private splitToPurePath(path: string): Array<string> {
        return path.split('/').filter(Boolean).map(FileReader.getPureFileName)
    }

    private createRecord(keys: string[], value: string): RecordShape {
        return keys.reduce<RecordShape>(
            (acc, key) => ({ ...acc, [key]: value }),
            {}
        )
    }

    private _paramBuildStore: Record<string, Array<string>> = {}
    private get paramBuildStore(): Record<string, Array<string>> {
        return this._paramBuildStore
    }
    private addParams(paramEntry: Array<[string, string]>): void {
        paramEntry.forEach(([key, value]) => {
            if (!this.paramBuildStore[key]) {
                this.paramBuildStore[key] = []
            }
            this.paramBuildStore[key].push(value)
        })
    }
    private getParamBuildStore(key: string): Array<string> {
        return this.paramBuildStore[key] ?? []
    }

    public async walk(node: FileTreeNode): Promise<void> {
        if (node.category !== 'TEXT_FILE') return

        const finalBuildPath: string | undefined =
            node.buildInfo?.build_path.build
        if (!finalBuildPath) return

        const paramBuildPath = finalBuildPath.replace(
            this.$buildPath.contents,
            ''
        )
        const buildList: Array<string> = this.splitToPurePath(paramBuildPath)
        const staticParamsContainer: RecordShape = this.createRecord(
            this.analyzed.dynamicParams,
            ''
        )

        const staticParamsInfo = this.analyzed.result.reduce<{
            params: RecordShape
            store: {
                nonDynamic: Array<string>
            }
            listPointer: number
        }>(
            (acc, curr) => {
                if (!curr.isDynamicParam) {
                    acc.store.nonDynamic.push(curr.dividerName)
                    return acc
                }

                const { paramName } = curr

                if (!curr.isMultiple) {
                    const foundedPath = buildList[acc.listPointer]
                    if (!foundedPath) return acc

                    const buildPath: string = [
                        ...acc.store.nonDynamic,
                        foundedPath,
                    ].join('/')

                    acc.listPointer += 1
                    acc.params[paramName] = buildPath
                    acc.store.nonDynamic = []
                    return acc
                }

                const restPath: Array<string> = buildList.slice(acc.listPointer)
                const buildPathList: Array<string> = [
                    ...acc.store.nonDynamic,
                    ...restPath,
                ]
                acc.listPointer += buildPathList.length
                acc.params[paramName] = buildPathList.join('/')
                acc.store.nonDynamic = []
                return acc
            },
            {
                params: staticParamsContainer,
                store: {
                    nonDynamic: [],
                },
                listPointer: 0,
            }
        )

        const href = this.analyzed.result.reduce<string>((acc, curr) => {
            if (!curr.isDynamicParam) return acc

            const { paramName } = curr

            if (!curr.isMultiple) {
                acc += `/${staticParamsInfo.params[paramName]}`
                return acc
            }

            acc += `/${staticParamsInfo.params[paramName]}`
            return acc
        }, '')

        this.addParams(Object.entries(staticParamsInfo.params))

        const getPaginatedParams = () => {
            const PAGE_SYMBOL = '$page'
            return this.analyzed.result.reduce<RecordShape>(
                (acc, curr, i, tot) => {
                    if (!curr.isDynamicParam) return acc
                    if (i === 0) return acc
                    // dynamic param & prev is not dynamic & name is $page
                    const prev = tot[i - 1]
                    if (
                        !prev?.isDynamicParam &&
                        prev?.dividerName === PAGE_SYMBOL
                    ) {
                        const targetPageParam = acc[curr.paramName]

                        if (!targetPageParam) return acc

                        const targetPageNum = Math.ceil(
                            this.getParamBuildStore(curr.paramName).length /
                                this.dynamicConfig.maxPage!
                        )

                        const paginatedParam = targetPageParam.replace(
                            PAGE_SYMBOL,
                            targetPageNum.toString()
                        )
                        acc[curr.paramName] = paginatedParam
                    }
                    return acc
                },
                staticParamsInfo.params
            )
        }
        const paginatedParams = getPaginatedParams()

        const staticParamUpdate = await this.meta.update({
            injectPath: finalBuildPath,
            meta: {
                href,
                params: paginatedParams,
            },
        })

        if (staticParamUpdate.success) {
            this.$logger.success(`injected static params to ${finalBuildPath}`)
        }
    }
}
