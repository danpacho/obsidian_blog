import { IO } from '@obsidian_blogger/helpers/io'

import { BuildSystem } from '../../../index'
import { MetaEngine } from '../../../meta/engine'

import type { FileTreeNode } from '../../../parser/node'
import type { BuildSystemPluginAdapter } from '../../builder.plugin.interface'
import type { PathGenerator } from '../../core'

const io = new IO()

const PREFIX = io.pathResolver.resolveToOsPath(
    `${process.cwd()}/packages/build_system/src/builder/plugin/__tests__/__fixtures__`
)
const VAULT_ROOT = io.pathResolver.resolveToOsPath(`${PREFIX}/$$root$$`)
const DIST_ROOT = io.pathResolver.resolveToOsPath(`${PREFIX}/dist`)

const getPluginPaths = (pluginName: string) => {
    const dist = io.pathResolver.resolveToOsPath(`${DIST_ROOT}/${pluginName}`)
    const vault = io.pathResolver.resolveToOsPath(`${dist}/vault`)
    const bridge = io.pathResolver.resolveToOsPath(`${dist}/bridge`)
    const build = io.pathResolver.resolveToOsPath(`${dist}/build`)
    const contents = io.pathResolver.resolveToOsPath(`${build}/contents`)
    const assets = io.pathResolver.resolveToOsPath(`${build}/assets`)

    return {
        dist,
        vault,
        build,
        contents,
        bridge,
        assets,
        vaultPath: (p: string) =>
            io.pathResolver.resolveToOsPath(`${vault}/${p}`),
        contentsPath: (p: string) =>
            io.pathResolver.resolveToOsPath(`${contents}/${p}`),
        assetsPath: (p: string) =>
            io.pathResolver.resolveToOsPath(`${assets}/${p}`),
    }
}

const createBuildSystem = (
    plugin: Partial<BuildSystemPluginAdapter>,
    paths: ReturnType<typeof getPluginPaths>
) => {
    const contentsPathGenerator: PathGenerator = async (node, buildTools) => {
        const analyzeFileName = (
            folderName?: string
        ): {
            type: 'route' | 'group' | 'series' | 'root'
            value: string
        } => {
            // empty -> root
            if (!folderName) {
                return {
                    type: 'root',
                    value: '',
                }
            }
            // [folderName] -> route
            if (folderName.match(/^\[(.*?)\]$/)) {
                const matchedValue = folderName.slice(1, -1)
                return {
                    type: 'route',
                    value: matchedValue,
                }
            }
            // @[folderName] -> series
            else if (folderName.startsWith('@')) {
                const matchedValue = folderName.substring(1)
                return {
                    type: 'series',
                    value: matchedValue,
                }
            }
            // folderName -> group
            else {
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
            node: FileTreeNode
            rootPath: string
        }): string => {
            const absPath = node.absolutePath
            const relativePath = absPath.replace(rootPath, '')

            const pathSegments = io.pathResolver
                .splitToPathSegments(relativePath)
                .slice(0, -1)

            const buildFolderPath = pathSegments
                .map((e) => analyzeFileName(e))
                .filter((e) => e.type === 'route' || e.type === 'group')
                .map((e) => e.value)
                .join('/')

            return buildFolderPath
        }

        return getBuildRouteInfo({
            node,
            rootPath: buildTools.vaultRoot,
        })
    }

    const system = new BuildSystem({
        vaultRoot: paths.vault,
        bridgeRoot: paths.bridge,
        buildPath: {
            contents: paths.contents,
            assets: paths.assets,
        },
        pathGenerator: {
            contents: contentsPathGenerator,
        },
    })

    system.use(plugin)

    return system
}

type TESTER_CONTENTS =
    | 'markdown.md'
    | 'img.md'
    | 'link.md'
    | 'nested.md'
    | (string & {})

type TESTER_ASSETS = 'img.png' | (string & {})

type ContentsSelector<T extends string> =
    | T
    | Array<T>
    | ((testingFileName: string) => boolean)

interface FileResponse {
    fileName: string
    path: string
    content: string | null
    meta: Record<string, unknown> | null
}

const pipe = async ({
    plugin,
    targetContents,
    targetAssets,
    cleanupDist = true,
}: {
    plugin: Partial<BuildSystemPluginAdapter>
    targetContents?: ContentsSelector<TESTER_CONTENTS>
    targetAssets?: ContentsSelector<TESTER_ASSETS>
    cleanupDist?: boolean
}): Promise<{
    buildFileNames: {
        contents: string[]
        assets: string[]
    }
    buildFiles: {
        contents: Array<FileResponse>
        assets: Array<FileResponse>
    }
    buildPath: {
        contents: string
        assets: string
    }
}> => {
    const pluginName = Object.values(plugin)
        .map((e) => {
            if (Array.isArray(e)) {
                return e.map((e) => e.staticConfig.name).join('_')
            }
            return e.staticConfig.name
        })
        .join('_')

    const paths = getPluginPaths(pluginName)

    if (cleanupDist) {
        // Clean up the dist folder
        await io.writer.deleteDirectory(paths.dist)
    }

    const isAlreadyCopied = await io.reader.checkExists(paths.vault)
    if (!isAlreadyCopied) {
        await io.cpDirectory({
            from: VAULT_ROOT,
            to: paths.vault,
        })
    }

    const system = createBuildSystem(plugin, paths)

    await system.init()
    await system.build()

    const selector = (
        selectorImpl: ContentsSelector<string> | undefined,
        fileName: string
    ) => {
        if (!selectorImpl) return true

        if (typeof selectorImpl === 'string') {
            return selectorImpl === fileName
        } else if (Array.isArray(selectorImpl)) {
            return selectorImpl.includes(fileName)
        } else {
            return selectorImpl(fileName)
        }
    }

    const extractContentsDir = async (
        targetFiles: ContentsSelector<string> | undefined,
        folder: string
    ) => {
        const extracted: Array<string> = []

        const contents = await io.reader.readDirectory(folder)

        if (!contents.success) return extracted

        const contentsDirentList = contents.data.filter((fileDirent) =>
            selector(targetFiles, fileDirent.name)
        )

        for (const dirent of contentsDirentList) {
            const fileName = dirent.name
            if (dirent.isDir) {
                const prefix = io.pathResolver.resolveToOsPath(
                    `${folder}/${fileName}`
                )

                const innerContents = (
                    await extractContentsDir(targetFiles, prefix)
                ).map((innerFileName) =>
                    io.pathResolver.resolveToOsPath(
                        `${fileName}/${innerFileName}`
                    )
                )

                extracted.push(...innerContents)
            } else {
                extracted.push(fileName)
            }
        }
        return extracted
    }

    const buildFileNames: {
        contents: Array<string>
        assets: Array<string>
    } = {
        contents: await extractContentsDir(targetContents, paths.contents),
        assets: await extractContentsDir(targetAssets, paths.assets),
    }

    const buildFiles: {
        contents: Array<FileResponse>
        assets: Array<FileResponse>
    } = {
        contents: (
            await Promise.all(
                buildFileNames.contents.map(async (fileName) => {
                    const contentsPath = paths.contentsPath(fileName)
                    const content = await io.reader.readFile(contentsPath)

                    return {
                        fileName: fileName,
                        path: contentsPath,
                        content: content.success ? content.data : null,
                        meta: content.success ? meta(content.data).meta : null,
                    }
                })
            )
        ).flat(),

        assets: (
            await Promise.all(
                buildFileNames.assets.map(async (fileName) => {
                    const assetsPath = paths.assetsPath(fileName)
                    const asset = await io.reader.readFile(assetsPath)

                    return {
                        fileName: fileName,
                        path: assetsPath,
                        content: asset.success ? asset.data : null,
                        meta: asset.success ? meta(asset.data).meta : null,
                    }
                })
            )
        ).flat(),
    }

    const buildPath: {
        contents: string
        assets: string
    } = {
        contents: paths.contents,
        assets: paths.assets,
    }

    return {
        buildFileNames,
        buildFiles,
        buildPath,
    }
}

const meta = (source: string) => {
    return MetaEngine.read(source)
}

const reset = async (pluginName: string) => {
    const { dist, build, bridge, vault } = getPluginPaths(pluginName)

    await Promise.all([
        io.writer.delete(dist),
        io.writer.delete(build),
        io.writer.delete(bridge),
        io.writer.delete(vault),
    ])
}

const transactions = {
    /**
     * Simulates adding a file to the vault.
     * @param filePath - The path of the file relative to the vault root.
     * @param content - The content of the new file.
     * @returns A cleanup function to remove the added file.
     */
    add: async (
        pluginName: string,
        { filePath, content }: { filePath: string; content: string }
    ) => {
        const absolutePath = getPluginPaths(pluginName).vaultPath(filePath)
        const write = await io.writer.write({
            filePath: absolutePath,
            data: content,
        })
        if (!write.success) {
            throw new Error(`[transaction:add] add ${filePath} failed.`)
        }

        return async () => {
            await io.writer.deleteFile(absolutePath)
        }
    },

    /**
     * Simulates removing a file from the vault.
     * @param filePath - The path of the file to remove, relative to the vault root.
     * @returns A cleanup function to restore the removed file.
     */
    remove: async (pluginName: string, { filePath }: { filePath: string }) => {
        const absolutePath = getPluginPaths(pluginName).vaultPath(filePath)
        const originalContent = await io.reader.readFile(absolutePath)

        if (!originalContent.success) {
            // File doesn't exist, so no-op for removal and cleanup
            return async () => {}
        }

        const deleteResult = await io.writer.deleteFile(absolutePath)
        if (!deleteResult.success) {
            throw new Error(
                `[transaction:remove] remove ${absolutePath} failed.`
            )
        }

        return async () => {
            await io.writer.write({
                filePath: absolutePath,
                data: originalContent.data,
            })
        }
    },

    /**
     * Simulates updating a file in the vault.
     * @param filePath - The path of the file to update, relative to the vault root.
     * @param newContent - The new content for the file.
     * @returns A cleanup function to restore the original file content.
     */
    update: async (
        pluginName: string,
        {
            filePath,
            newContent,
        }: { filePath: string; newContent: string | ((prev: string) => string) }
    ) => {
        const absolutePath = getPluginPaths(pluginName).vaultPath(filePath)
        const originalContent = await io.reader.readFile(absolutePath)

        if (!originalContent.success) {
            throw new Error(
                `[transaction:update] Cannot update file that does not exist: ${absolutePath}`
            )
        }

        if (typeof newContent === 'string') {
            await io.writer.write({ filePath: absolutePath, data: newContent })
        } else {
            await io.writer.write({
                filePath: absolutePath,
                data: newContent(originalContent.data),
            })
        }

        return async () => {
            await io.writer.write({
                filePath: absolutePath,
                data: originalContent.data,
            })
        }
    },

    /**
     * Simulates moving or renaming a file in the vault.
     * @param oldFilePath - The original path of the file, relative to the vault root.
     * @param newFilePath - The new path for the file, relative to the vault root.
     * @returns A cleanup function to move the file back to its original location.
     */
    move: async (
        pluginName: string,
        {
            oldFilePath,
            newFilePath,
        }: { oldFilePath: string; newFilePath: string }
    ) => {
        const paths = getPluginPaths(pluginName)
        const oldAbsolutePath = paths.vaultPath(oldFilePath)
        const newAbsolutePath = paths.vaultPath(newFilePath)

        const content = await io.reader.readFile(oldAbsolutePath)
        if (!content.success) {
            throw new Error(
                `[transaction:move] Cannot move file that does not exist: ${oldAbsolutePath}`
            )
        }

        const newFileExists = await io.reader.readFile(newAbsolutePath)
        if (newFileExists.success) {
            throw new Error(
                `[transaction:move] Cannot move to destination, it already exists: ${newAbsolutePath}`
            )
        }

        const moved = await io.moveFile({
            from: oldAbsolutePath,
            to: newAbsolutePath,
        })

        if (!moved.success) {
            throw new Error(
                `[transaction:move] Can not move from : ${oldAbsolutePath} to : ${newAbsolutePath}`
            )
        }

        return async () => {
            // Move it back
            await io.moveFile({
                from: newAbsolutePath,
                to: oldAbsolutePath,
            })
        }
    },

    /**
     * Simulates updating an file's size in the vault.
     * @param filePath - The path of the asset file to update, relative to the vault root.
     * @param options - The options for updating the asset size.
     * @returns A cleanup function to restore the original file content.
     */
    updateSize: async (
        pluginName: string,
        {
            filePath,
            newSize,
            reduceByBytes,
            reduceByPercent,
        }: {
            filePath: string
            newSize?: number
            reduceByPercent?: number
            reduceByBytes?: number
        }
    ) => {
        const absolutePath = getPluginPaths(pluginName).vaultPath(filePath)
        const originalContent = await io.reader.readMedia(absolutePath)

        if (!originalContent.success) {
            throw new Error(
                `[transaction:updateSize] Cannot update asset file that does not exist: ${absolutePath}`
            )
        }

        const originalSize = originalContent.data.length
        let newSizeCalc: number

        if (newSize !== undefined) {
            if (newSize < 0) {
                throw new Error(
                    '[transaction:updateSize] newSize cannot be negative.'
                )
            }
            newSizeCalc = newSize
        } else if (reduceByPercent !== undefined) {
            if (reduceByPercent < 0 || reduceByPercent > 100) {
                throw new Error(
                    '[transaction:updateSize] reduceByPercent must be between 0 and 100.'
                )
            }
            newSizeCalc = Math.floor(originalSize * (1 - reduceByPercent / 100))
        } else if (reduceByBytes !== undefined) {
            if (reduceByBytes < 0) {
                throw new Error(
                    '[transaction:updateSize] reduceByBytes cannot be negative.'
                )
            }
            newSizeCalc = originalSize - reduceByBytes
        } else {
            throw new Error(
                '[transaction:updateSize] One of newSize, reduceByPercent, or reduceByBytes must be provided.'
            )
        }

        if (newSizeCalc < 0) {
            newSizeCalc = 0
        }

        const truncatedContent = originalContent.data.slice(0, newSizeCalc)

        await io.writer.write({
            filePath: absolutePath,
            data: truncatedContent,
        })

        return async () => {
            await io.writer.write({
                filePath: absolutePath,
                data: originalContent.data,
            })
        }
    },
}

export const Tester = {
    pipe,
    meta,
    transactions,
    reset,
}
