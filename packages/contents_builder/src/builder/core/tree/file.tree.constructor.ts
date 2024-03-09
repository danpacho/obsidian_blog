// import { t } from '@metal-box/type'
import type { BuildFolderType, FTreeNode, NodeType } from '../../../parser/node'
import type { Promisify } from '../../../utils/promisify'
import type { BuilderPlugin } from '../../plugin'
import type { BuildReport } from '../../reporter'

type TreeConstructorOptions = Readonly<{
    skipFolderTypes?: Array<BuildFolderType>
}>
interface FileTreeConstructorOptions {
    contents?: TreeConstructorOptions
    assets?: TreeConstructorOptions
}
export const FileTreeConstructor = (
    options: FileTreeConstructorOptions = {
        assets: {
            skipFolderTypes: [],
        },
        contents: {
            skipFolderTypes: ['root'],
        },
    }
): BuilderPlugin['build:file:tree'] => {
    return async ({
        ast,
        ioManager,
        uuidEncoder,
        buildPath,
        logger,
        // metaEngine,
    }) => {
        // const engine = metaEngine({
        //     generator(meta) {
        //         return {
        //             title: 'DEFAULT_TITLE',
        //             date: new Date(),
        //             description: 'DEFAULT_DESCRIPTION',
        //             tags: [],
        //             ...meta,
        //         }
        //     },
        //     parser: t.object({
        //         title: t.string,
        //         description: t.string,
        //         date: t.date,
        //         tags: t.array(t.string),
        //     }).parse,
        // })

        const rootPath = ast.absolutePath

        const analyzeFileName = (
            folderName?: string
        ): {
            type: Exclude<FTreeNode['buildInfo']['folderType'], undefined>
            value: string
        } => {
            if (!folderName) {
                return {
                    type: 'root',
                    value: '',
                }
            }
            if (folderName.match(/^\[(.*?)\]$/)) {
                const matchedValue = folderName.slice(1, -1)
                return {
                    type: 'route',
                    value: matchedValue,
                }
            } else if (folderName.startsWith('@')) {
                const matchedValue = folderName.substring(1)
                return {
                    type: 'series',
                    value: matchedValue,
                }
            } else {
                return {
                    type: 'group',
                    value: folderName,
                }
            }
        }

        const getBuildRouteInfo = (
            node: FTreeNode,
            rootPath: string
        ): {
            buildPath: string
        } & ReturnType<typeof analyzeFileName> => {
            const absPath = node.absolutePath
            const originPath = absPath.replace(rootPath, '')

            const buildFolderPath = originPath
                .split('/')
                .filter(Boolean)
                .slice(0, -1)
                .reduce<string>((buildPath, e) => {
                    const { type, value } = analyzeFileName(e)
                    switch (type) {
                        case 'route': {
                            return `${buildPath}/${value}`
                        }
                        case 'group': {
                            return `${buildPath}/${value}`
                        }
                        case 'series': {
                            return buildPath
                        }
                        case 'root': {
                            return buildPath
                        }
                    }
                }, '')

            const folderName =
                node.category === 'FOLDER'
                    ? originPath.split('/').filter(Boolean).pop()!
                    : originPath
                          .replace(node.fileName, '')
                          .split('/')
                          .filter(Boolean)
                          .pop()

            const folderType = analyzeFileName(folderName)

            return { buildPath: buildFolderPath, ...folderType }
        }

        const getAssetBuildInfo = async (
            node: FTreeNode,
            buildPath: string
        ): Promisify<
            Pick<BuildReport, 'buildID' | 'path'> & {
                category: NodeType
            }
        > => {
            const assetPrefix: string =
                node.category === 'IMAGE_FILE'
                    ? 'images'
                    : node.category === 'AUDIO_FILE'
                      ? 'audio'
                      : 'unknown'

            const buildID = uuidEncoder(node.absolutePath)
            const assetBuildPath: string = `${buildPath}/${assetPrefix}/${buildID}.${node.fileExtension}`

            return {
                success: true,
                data: {
                    buildID,
                    path: {
                        build: assetBuildPath,
                        origin: node.absolutePath,
                    },
                    category: node.category,
                },
            }
        }

        const getContentsBuildInfo = async (
            node: FTreeNode,
            buildRoute: ReturnType<typeof getBuildRouteInfo>,
            buildPath: string
        ): Promisify<
            Pick<BuildReport, 'buildID' | 'path'> & {
                category: NodeType
            }
        > => {
            const textFile = await ioManager.reader.readFile(node.absolutePath)
            if (!textFile.success) {
                return {
                    success: false,
                    error: textFile.error,
                }
            }
            const buildID = uuidEncoder(`${textFile.data}${node.absolutePath}`)
            const postBuildPath: string = `${buildPath}${buildRoute.buildPath}/${node.fileName}`
            return {
                success: true,
                data: {
                    buildID,
                    path: {
                        build: postBuildPath,
                        origin: node.absolutePath,
                    },
                    category: node.category,
                },
            }
        }

        return async (node) => {
            const buildRouteInfo = getBuildRouteInfo(node, rootPath)
            if (node.category === 'TEXT_FILE') {
                if (
                    options.contents?.skipFolderTypes?.includes(
                        buildRouteInfo.type
                    )
                ) {
                    logger.info(
                        `File ${logger.c.underline(node.fileName)} is skipped, invalid file location. Located at root folder`
                    )
                    return
                }

                const postBuildInfo = await getContentsBuildInfo(
                    node,
                    buildRouteInfo,
                    buildPath.content
                )

                if (!postBuildInfo.success) {
                    logger.error(
                        `File ${logger.c.underline(node.fileName)} is rejected due to read error`
                    )
                    return
                }

                node.updateBuildInfo({
                    id: postBuildInfo.data.buildID,
                    path: postBuildInfo.data.path.build,
                    folderType: buildRouteInfo.type,
                })
            } else {
                if (
                    options.assets?.skipFolderTypes?.includes(
                        buildRouteInfo.type
                    )
                ) {
                    logger.info(
                        `File ${logger.c.underline(node.fileName)} is skipped, invalid file location. Located at root folder`
                    )
                    return
                }

                const assetBuildInfo = await getAssetBuildInfo(
                    node,
                    buildPath.assets
                )
                if (!assetBuildInfo.success) {
                    logger.error(
                        `File ${logger.c.underline(node.fileName)} is rejected due to read error`
                    )
                    return
                }

                node.updateBuildInfo({
                    id: assetBuildInfo.data.buildID,
                    path: assetBuildInfo.data.path.build,
                    folderType: buildRouteInfo.type,
                })
            }
        }
    }
}
