import { IO } from '@obsidian_blogger/helpers/io'
import { PluginConfigStorage } from '@obsidian_blogger/plugin/bridge'
import { BuildSystem } from '../../../index'
import { MetaEngine } from '../../../meta/engine'
import type { FileTreeNode } from '../../../parser/node'
import type { BuildSystemPlugin } from '../../builder.plugin.interface'
import type { PathGenerator } from '../../core'

const PREFIX = `${process.cwd()}/packages/build_system/src/builder/plugin/__tests__/__fixtures__`

const createBuildSystem = (
    plugin: Partial<BuildSystemPlugin>,
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

const setupPluginConfigStorage = (distFolder: string) => {
    const walkTreeConfigStorage = new PluginConfigStorage({
        name: 'config_storage',
        root: `${distFolder}/bridge/.store/build/build_system::walk_tree.json`,
    })
    const buildTreeConfigStorage = new PluginConfigStorage({
        name: 'config_storage',
        root: `${distFolder}/bridge/.store/build/build_system::build_tree.json`,
    })
    const buildContentsConfigStorage = new PluginConfigStorage({
        name: 'config_storage',
        root: `${distFolder}/bridge/.store/build/build_system::build_contents.json`,
    })

    return {
        walkTree: walkTreeConfigStorage,
        buildTree: buildTreeConfigStorage,
        buildContents: buildContentsConfigStorage,
    }
}

const setupPluginConfig = async (
    plugin: Partial<BuildSystemPlugin>,
    distFolder: string
): Promise<void> => {
    const storage = setupPluginConfigStorage(distFolder)

    await storage.walkTree.init()
    await storage.buildTree.init()
    await storage.buildContents.init()

    const pluginEntries = Object.entries(plugin)

    for (const [pluginName, pluginConfig] of pluginEntries) {
        switch (pluginName) {
            case 'walk:tree': {
                await storage.walkTree.updateDynamicConfigByUserConfig(
                    pluginConfig.staticConfig.name,
                    {
                        $$load_status$$: 'include',
                    }
                )
                break
            }
            case 'build:tree': {
                await storage.buildTree.updateDynamicConfigByUserConfig(
                    pluginConfig.staticConfig.name,

                    {
                        $$load_status$$: 'include',
                    }
                )
                break
            }
            case 'build:contents': {
                await storage.buildContents.updateDynamicConfigByUserConfig(
                    pluginConfig.staticConfig.name,
                    {
                        $$load_status$$: 'include',
                    }
                )
                break
            }
        }
    }
}

type TESTER_CONTENTS =
    | 'markdown.md'
    | 'img.md'
    | 'link.md'
    | 'nested.md'
    // eslint-disable-next-line @typescript-eslint/ban-types
    | (string & {})

type TESTER_ASSETS =
    | 'img.png'
    // eslint-disable-next-line @typescript-eslint/ban-types
    | (string & {})

type ContentsSelector<T extends string> =
    | T
    | Array<T>
    | ((testingFileName: string) => boolean)

interface FileResponse {
    filename: string
    path: string
    content: string | null
    meta: Record<string, unknown> | null
}

const pipe = async ({
    plugin,
    targetContents,
    targetAssets,
}: {
    plugin: Partial<BuildSystemPlugin>
    targetContents?: ContentsSelector<TESTER_CONTENTS>
    targetAssets?: ContentsSelector<TESTER_ASSETS>
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
        .map((e) => e.staticConfig.name)
        .join('_')

    const distFolder = `${PREFIX}/dist/${pluginName}`

    // Clean up the dist folder
    await io.writer.deleteFolder__FORCE(distFolder)

    const system = createBuildSystem(plugin, distFolder)

    await system.init()
    await setupPluginConfig(plugin, distFolder)
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

        const contents = await io.reader.readDir(folder)

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

    const buildFileNames = {
        contents: await extractContentsDir(
            targetContents,
            `${distFolder}/contents`
        ),
        assets: await extractContentsDir(targetAssets, `${distFolder}/assets`),
    }

    const buildFiles = {
        contents: (
            await Promise.all(
                buildFileNames.contents.map(async (filename) => {
                    const contentsPath = `${distFolder}/contents/${filename}`
                    const content = await io.reader.readFile(contentsPath)

                    return {
                        filename: filename,
                        path: contentsPath,
                        content: content.success ? content.data : null,
                        meta: content.success ? meta(content.data).meta : null,
                    }
                })
            )
        ).flat(),

        assets: (
            await Promise.all(
                buildFileNames.assets.map(async (fileDirent) => {
                    const assetsPath = `${distFolder}/assets/${fileDirent}`
                    const asset = await io.reader.readFile(assetsPath)

                    return {
                        filename: fileDirent,
                        path: assetsPath,
                        content: asset.success ? asset.data : null,
                        meta: asset.success ? meta(asset.data).meta : null,
                    }
                })
            )
        ).flat(),
    }

    const buildPath = {
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
