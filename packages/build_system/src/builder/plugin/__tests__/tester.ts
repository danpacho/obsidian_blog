import { IO } from '@obsidian_blogger/helpers/io'

import { BuildSystem } from '../../../index'
import { MetaEngine } from '../../../meta/engine'

import type { FileTreeNode } from '../../../parser/node'
import type { BuildSystemPluginAdapter } from '../../builder.plugin.interface'
import type { PathGenerator } from '../../core'

const PREFIX = `${process.cwd()}/packages/build_system/src/builder/plugin/__tests__/__fixtures__`

const createBuildSystem = (
    plugin: Partial<BuildSystemPluginAdapter>,
    distFolder: string
) => {
    const pathGen: PathGenerator = async (node, { vaultRoot }) => {
        const analyzeFileName = (
            folderName?: string
        ): {
            type: 'route' | 'group' | 'series' | 'root'
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
            node: FileTreeNode
            rootPath: string
        }): string => {
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

            return buildFolderPath
        }

        return getBuildRouteInfo({
            node,
            rootPath: vaultRoot,
        })
    }

    const system = new BuildSystem({
        vaultRoot: `${PREFIX}/$$root$$`,
        bridgeRoot: `${distFolder}/bridge`,
        buildPath: {
            contents: `${distFolder}/contents`,
            assets: `${distFolder}/assets`,
        },
        pathGenerator: {
            contents: pathGen,
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
    const io = new IO()

    const pluginName = Object.values(plugin)
        .map((e) => {
            if (Array.isArray(e)) {
                return e.map((e) => e.staticConfig.name).join('_')
            }
            return e.staticConfig.name
        })
        .join('_')

    const distFolder = `${PREFIX}/dist/${pluginName}`

    if (cleanupDist) {
        // Clean up the dist folder
        await io.writer.deleteDirectory(distFolder)
    }

    const system = createBuildSystem(plugin, distFolder)

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

        const contentsFilenames = contents.data
            .map((fileDirent) => fileDirent.name)
            .filter((fileName) => selector(targetFiles, fileName))

        for (const fileName of contentsFilenames) {
            const content = await io.reader.readFile(`${folder}/${fileName}`)

            if (!content.success) {
                const prefix = `${folder}/${fileName}`

                const innerContents = (
                    await extractContentsDir(targetFiles, prefix)
                ).map((innerFileName) => `${fileName}/${innerFileName}`)

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
        contents: await extractContentsDir(
            targetContents,
            `${distFolder}/contents`
        ),
        assets: await extractContentsDir(targetAssets, `${distFolder}/assets`),
    }

    const buildFiles: {
        contents: Array<FileResponse>
        assets: Array<FileResponse>
    } = {
        contents: (
            await Promise.all(
                buildFileNames.contents.map(async (fileName) => {
                    const contentsPath = `${distFolder}/contents/${fileName}`
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
                    const assetsPath = `${distFolder}/assets/${fileName}`
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
        contents: `${distFolder}/contents`,
        assets: `${distFolder}/assets`,
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

export const Tester = {
    pipe,
    meta,
}
