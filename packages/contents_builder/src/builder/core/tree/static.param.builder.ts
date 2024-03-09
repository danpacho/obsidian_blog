import { FileReader } from '../../../io_manager/file.reader'
import { ParamAnalyzer } from '../../../routes'
import type { BuilderPlugin } from '../../plugin'
import {
    type MetaGeneratorOptions,
    defaultMetaBuilderOptions,
} from './shared/meta'

interface StaticParamBuilderOptions extends MetaGeneratorOptions {
    paramShape: string
}

type RecordShape = Record<string, string>

export const StaticParamBuilder = (
    option: StaticParamBuilderOptions = {
        paramShape: '/[category]/[...post]',
        ...defaultMetaBuilderOptions,
    }
): BuilderPlugin['build:file:tree'] => {
    const splitToPurePath = (path: string): Array<string> =>
        path.split('/').filter(Boolean).map(FileReader.getPureFileName)

    const createRecord = (keys: string[], value: string): RecordShape =>
        keys.reduce<RecordShape>((acc, key) => ({ ...acc, [key]: value }), {})

    const paramAnalyzer = new ParamAnalyzer(option.paramAnalyzer)
    const analyzed = paramAnalyzer.analyzeParam(option.paramShape)

    return async ({ logger, ioManager, buildPath, metaEngine }) => {
        const engine = metaEngine(option.contentMeta)

        return async (node) => {
            if (node.category !== 'TEXT_FILE') return

            const finalBuildPath: string | undefined = node.buildInfo.path
            if (!finalBuildPath) return

            const paramBuildPath = finalBuildPath.replace(buildPath.content, '')
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

            const metaDataResult = await engine.extractFromFile(finalBuildPath)
            if (!metaDataResult.success) {
                const mdContent =
                    await ioManager.reader.readFile(finalBuildPath)
                if (!mdContent.success) return

                await engine.inject({
                    injectPath: finalBuildPath,
                    metaData: {
                        content: mdContent.data,
                        meta: staticParamsInfo.params,
                    },
                })
            } else {
                await engine.inject({
                    injectPath: finalBuildPath,
                    metaData: {
                        content: metaDataResult.data.content,
                        meta: {
                            ...metaDataResult.data.meta,
                            params: staticParamsInfo.params,
                        },
                    },
                })
            }

            logger.success(`injected static params to ${finalBuildPath}`)
        }
    }
}
