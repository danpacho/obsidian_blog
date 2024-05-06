import { FileReader } from '@blogger/helpers'
import type { BuilderPlugin } from '../..'
import { ParamAnalyzer } from '../../../../routes'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'

type RecordShape = Record<string, string>

export interface StaticParamBuilderConfig extends ContentMetaGeneratorOptions {
    paramShape: string
}

export const StaticParamBuilder = (
    option: StaticParamBuilderConfig = {
        paramShape: '/[category]/[...post]',
        ...defaultContentMetaBuilderOptions,
    }
): BuilderPlugin['build:origin:tree'] => {
    const splitToPurePath = (path: string): Array<string> =>
        path.split('/').filter(Boolean).map(FileReader.getPureFileName)

    const createRecord = (keys: string[], value: string): RecordShape =>
        keys.reduce<RecordShape>((acc, key) => ({ ...acc, [key]: value }), {})

    const paramAnalyzer = new ParamAnalyzer(option.paramAnalyzer)
    const analyzed = paramAnalyzer.analyzeParam(option.paramShape)

    return async ({ logger, buildPath, meta }) => {
        const engine = meta(option.contentMeta)

        return {
            name: 'StaticParamBuilder',
            exclude: 'description.md',
            skipFolderNode: true,
            walker: async (node) => {
                if (node.category !== 'TEXT_FILE') return

                const finalBuildPath: string | undefined =
                    node.buildInfo?.build_path.build
                if (!finalBuildPath) return

                const paramBuildPath = finalBuildPath.replace(
                    buildPath.contents,
                    ''
                )
                const buildList: Array<string> = splitToPurePath(paramBuildPath)
                const staticParamsContainer: RecordShape = createRecord(
                    analyzed.dynamicParams,
                    ''
                )

                const staticParamsInfo = analyzed.result.reduce<{
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

                        const restPath: Array<string> = buildList.slice(
                            acc.listPointer
                        )
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
                const href = analyzed.result.reduce<string>((acc, curr) => {
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

                const staticParamUpdate = await engine.update({
                    injectPath: finalBuildPath,
                    meta: {
                        href,
                        params: staticParamsInfo.params,
                    },
                })

                if (staticParamUpdate.success) {
                    logger.success(
                        `injected static params to ${finalBuildPath}`
                    )
                }
            },
        }
    }
}
