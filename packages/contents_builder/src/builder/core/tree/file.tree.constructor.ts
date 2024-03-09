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
    return async ({ ast, ioManager, uuidEncoder, buildPath, logger }) => {
        const rootPath = ast.absolutePath
        const getSafeRoutePath = (path: string): string =>
            `/${path.split('/').filter(Boolean).join('/')}`

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

        const getBuildRouteInfo = ({
            node,
            rootPath,
        }: {
            node: FTreeNode
            rootPath: string
        }): {
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
        const buildPathStore: Map<string, string> = new Map()

        const getAssetBuildInfo = async ({
            node,
            buildBasePath,
        }: {
            node: FTreeNode
            buildBasePath: string
        }): Promisify<
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
            const assetBuildPath: string = getSafeRoutePath(
                `${buildBasePath}/${assetPrefix}/${buildID}.${node.fileExtension}`
            )

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

        const getContentsBuildInfo = async ({
            node,
            buildRouteInfo,
            buildBasePath,
            buildPathStore,
        }: {
            node: FTreeNode
            buildRouteInfo: ReturnType<typeof getBuildRouteInfo>
            buildBasePath: string
            buildPathStore: Map<string, string>
        }): Promisify<
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
            const contentBuildPath: string = getSafeRoutePath(
                `${buildBasePath}${buildRouteInfo.buildPath}/${node.fileName}`
            )

            const isUniqueBuildPath = !buildPathStore.has(contentBuildPath)
            if (isUniqueBuildPath) {
                buildPathStore.set(contentBuildPath, node.absolutePath)
            }

            const uniqueContentBuildPath = isUniqueBuildPath
                ? contentBuildPath
                : getSafeRoutePath(
                      `${buildBasePath}${buildRouteInfo.buildPath}/${uuidEncoder(
                          node.absolutePath
                      ).slice(0, 5)}_${node.fileName}`
                  )

            const buildID = uuidEncoder(`${textFile.data}${node.absolutePath}`)

            return {
                success: true,
                data: {
                    buildID,
                    path: {
                        build: uniqueContentBuildPath,
                        origin: node.absolutePath,
                    },
                    category: node.category,
                },
            }
        }

        return async (node) => {
            const buildRouteInfo = getBuildRouteInfo({
                node,
                rootPath,
            })

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

                const postBuildInfo = await getContentsBuildInfo({
                    node,
                    buildRouteInfo,
                    buildBasePath: buildPath.content,
                    buildPathStore,
                })

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

                const assetBuildInfo = await getAssetBuildInfo({
                    node,
                    buildBasePath: buildPath.assets,
                })
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
