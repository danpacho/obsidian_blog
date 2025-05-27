/* eslint-disable no-console */
import { IO, ShellExecutor } from '@obsidian_blogger/helpers'
import { Bridge } from '@obsidian_blogger/plugin_api'
import { CorePlugins, PublishSystem } from '../src'
import { config } from 'dotenv'
import path from 'path'

const envPath = path.resolve(process.cwd(), '../../.env')
config({ path: envPath })

const BLOG_ROOT = process.env.PUBLISH_TEST_ROOT
if (!BLOG_ROOT) {
    console.error(`Missing BLOG_ROOT in .env at ${envPath}`)
    process.exit(1)
}

const injectDynamicConfigFromObsidian = async (publisher: PublishSystem) => {
    const roots = publisher.$configBridgeStorage.configStoreRoot
    const bridgeForBuildScript = new Bridge.PluginConfigStorage({
        name: 'bridge',
        root: roots[0]!.root as string,
    })
    const bridgeForRepository = new Bridge.PluginConfigStorage({
        name: 'bridge',
        root: roots[1]!.root as string,
    })
    const bridgeForDeploy = new Bridge.PluginConfigStorage({
        name: 'bridge',
        root: roots[2]!.root as string,
    })

    //@ts-ignore
    await bridgeForDeploy.init()
    //@ts-ignore
    await bridgeForBuildScript.init()
    //@ts-ignore
    await bridgeForRepository.init()

    const dynamicConfigs = {
        'blog-build-script-runner': {
            dynamicConfig: {
                cwd: BLOG_ROOT,
                command: ['build'],
            },
        },
        github: {
            dynamicConfig: {
                cwd: BLOG_ROOT,
                branch: 'main',
                commitPrefix: 'feat',
            },
        },
        vercel: {
            dynamicConfig: {
                cwd: BLOG_ROOT,
                someConfig: 'someValue',
            },
        },
    }

    await bridgeForBuildScript.updateDynamicConfigByUserConfig(
        'blog-build-script-runner',
        dynamicConfigs['blog-build-script-runner'].dynamicConfig
    )
    await bridgeForRepository.updateDynamicConfigByUserConfig(
        'github',
        dynamicConfigs.github.dynamicConfig
    )
    await bridgeForDeploy.updateDynamicConfigByUserConfig(
        'vercel',
        dynamicConfigs.vercel.dynamicConfig
    )
}

/**
 * - `Initial` case
 *
 * the static configs generated === will not executed
 *
 * - `Non-initial` case
 *   1. User writes the config in obsidian, inject at bridge storage
 *   2. Scripts uses the plugins, <static>
 *   3. Blog is updated
 *   4. Execute plugins
 */
const publish = async () => {
    try {
        const io = new IO()

        // 1. Initialize publisher system
        const publisher = new PublishSystem({
            bridgeRoot: `${process.cwd()}/scripts`,
        }).use({
            buildScript: [new CorePlugins.BlogBuilder()],
            repository: [new CorePlugins.GithubRepository()],
            deploy: [new CorePlugins.VercelDeploy()],
        })

        await publisher.init()

        // 2. [Assume] User writes the config, inject at bridge storage
        await injectDynamicConfigFromObsidian(publisher)

        // 3. [Assume] Blog is updated
        const uniqueID = new Date().toISOString().replace(/:/g, '_')
        // Assume that file is updated
        await io.writer.write({
            filePath: `${BLOG_ROOT}/ci_test/${new Date()
                .toISOString()
                .replace(/:/g, '_')}.txt`,
            data: `test generated @${uniqueID}`,
        })

        // 4. Execute plugins
        await publisher.publish()

        await io.writer.write({
            data: 'SUCCESS',
            filePath: `${BLOG_ROOT}/ci_test/${uniqueID}_pub_result.json`,
        })
    } catch (e) {
        console.error(e)
    }
}

publish()
