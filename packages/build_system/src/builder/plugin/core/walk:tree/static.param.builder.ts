import { FileReader } from '@obsidian_blogger/helpers'
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

type RecordShape = Record<string, string>

export interface StaticParamBuilderConfig extends ContentMetaGeneratorOptions {
    paramShape: string
}

export class StaticParamBuilderPlugin extends WalkTreePlugin {
    public constructor(
        public readonly config: StaticParamBuilderConfig = {
            paramShape: '/[category]/[...post]',
            ...defaultContentMetaBuilderOptions,
        }
    ) {
        super()
        this.paramAnalyzer = new ParamAnalyzer(config.paramAnalyzer)
        this.analyzed = this.paramAnalyzer.analyzeParam(config.paramShape)
    }

    private readonly paramAnalyzer: ParamAnalyzer
    private readonly analyzed: ReturnType<ParamAnalyzer['analyzeParam']>

    private get meta() {
        return this.$createMetaEngine(this.config.contentMeta)
    }

    public defineStaticConfig(): WalkTreePluginStaticConfig {
        return {
            name: 'StaticParamBuilder',
            description: 'Inject static params to the content',
        }
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
                    const fondedPath = buildList[acc.listPointer]
                    if (!fondedPath) return acc

                    const buildPath: string = [
                        ...acc.store.nonDynamic,
                        fondedPath,
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
            if (!curr.isDynamicParam) {
                return acc
            }

            const { paramName } = curr
            if (!curr.isMultiple) {
                acc += `/${staticParamsInfo.params[paramName]}`
                return acc
            }

            acc += `/${staticParamsInfo.params[paramName]}`
            return acc
        }, '')

        const staticParamUpdate = await this.meta.update({
            injectPath: finalBuildPath,
            meta: {
                href,
                params: staticParamsInfo.params,
            },
        })

        if (staticParamUpdate.success) {
            this.$logger.success(`injected static params to ${finalBuildPath}`)
        }
    }
}
