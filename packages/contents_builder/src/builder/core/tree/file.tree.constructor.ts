import type { FTreeNode, NodeType } from '../../../parser/node'
import type { Promisify, Stateful } from '../../../utils/promisify'
import type { FileTreePlugin } from '../../plugin'
import type { BuildReport } from '../../reporter'

export const FileTreeConstructor: FileTreePlugin = async ({
    ast,
    ioManager,
    uuidEncoder,
    buildPath,
    logger,
}) => {
    const rootPath = ast.absolutePath

    const analyzeFileName = (
        folderName: string
    ): {
        type: Exclude<FTreeNode['buildInfo']['folderType'], undefined>
        value: string
    } => {
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
    ): Stateful<
        {
            buildPath: string
        } & ReturnType<typeof analyzeFileName>
    > => {
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
                }
            }, '')

        const folderName =
            node.category === 'FOLDER'
                ? originPath.split('/').filter(Boolean).pop()!
                : originPath
                      .replace(node.fileName, '')
                      .split('/')
                      .filter(Boolean)
                      .pop()!

        if (!folderName) {
            return {
                success: false,
                error: new Error('Folder name not found'),
            }
        }

        const folderType = analyzeFileName(folderName)

        return {
            success: true,
            data: { buildPath: buildFolderPath, ...folderType },
        }
    }

    const getPostBuildInfo = async (
        node: FTreeNode,
        buildRoute: ReturnType<typeof getBuildRouteInfo>,
        buildPath: string
    ): Promisify<
        Pick<BuildReport, 'buildID' | 'path'> & {
            category: NodeType
        }
    > => {
        if (!buildRoute.success) return buildRoute
        const FOLDER_PREFIX = {
            CONTENTS: 'contents',
            ASSETS: 'assets',
        } as const

        if (node.category === 'TEXT_FILE') {
            const textFile = await ioManager.reader.readFile(node.absolutePath)
            if (!textFile.success) {
                return {
                    success: false,
                    error: textFile.error,
                }
            }
            const buildID = uuidEncoder(`${textFile.data}${node.absolutePath}`)
            const postBuildPath: string = `${buildPath}/${FOLDER_PREFIX.CONTENTS}${buildRoute.data.buildPath}/${node.fileName}`
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

        const assetPrefix: string =
            node.category === 'IMAGE_FILE'
                ? 'images'
                : node.category === 'AUDIO_FILE'
                  ? 'audio'
                  : 'unknown'

        const buildID = uuidEncoder(node.absolutePath)
        const assetBuildPath: string = `${buildPath}/${FOLDER_PREFIX.ASSETS}/${assetPrefix}/${buildID}.${node.fileExtension}`

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

    return async (node) => {
        const buildRouteInfo = getBuildRouteInfo(node, rootPath)

        if (!buildRouteInfo.success) {
            logger.error(
                `File ${logger.c.underline(node.fileName)} is skipped, invalid file location.`
            )
            return
        }

        const postBuildInfo = await getPostBuildInfo(
            node,
            buildRouteInfo,
            buildPath
        )

        if (!postBuildInfo.success) {
            logger.error(
                `File ${logger.c.underline(node.fileName)} is rejected due to read error`
            )
            return
        }

        node.buildInfo.id = postBuildInfo.data.buildID
        node.buildInfo.path = postBuildInfo.data.path.build
        node.buildInfo.folderType = buildRouteInfo.data.type
    }
}
