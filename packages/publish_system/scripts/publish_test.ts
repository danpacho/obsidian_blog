/* eslint-disable no-console */
import { Config, IO, ShellExecutor } from '@obsidian_blogger/helpers'
import { CorePlugins, PublishSystem } from '../src'

const BLOG_ROOT = '/Users/june/Documents/project/blogger_astro_blog' as const

const injectDynamicConfigFromObsidian = async (publisher: PublishSystem) => {
    const bridgeForBuildScript = new Config.PluginConfigStore({
        name: 'bridge',
        root: publisher.bridgeRoot.buildScript,
    })
    const bridgeForRepository = new Config.PluginConfigStore({
        name: 'bridge',
        root: publisher.bridgeRoot.repository,
    })
    const bridgeForDeploy = new Config.PluginConfigStore({
        name: 'bridge',
        root: publisher.bridgeRoot.deploy,
    })

    console.log(publisher.bridgeRoot, null, 4)

    const shell = new ShellExecutor()

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
                commitMessage: `published by publisher, automatically generated @${new Date()
                    .toISOString()
                    .replace(/:/g, '_')}`,
                gitPath: (await shell.exec$('which git')).stdout,
            },
        },
        vercel: {
            dynamicConfig: {
                cwd: BLOG_ROOT,
                someConfig: 'someValue',
            },
        },
    }

    await bridgeForBuildScript.updateDynamicConfig(
        'blog-build-script-runner',
        dynamicConfigs['blog-build-script-runner'].dynamicConfig
    )

    await bridgeForRepository.updateDynamicConfig(
        'github',
        dynamicConfigs.github.dynamicConfig
    )

    await bridgeForDeploy.updateDynamicConfig(
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
    const io = new IO()
    const publisher = new PublishSystem({
        bridgeRoot: `${process.cwd()}/scripts`,
    })

    // 1. [Assume] User writes the config, inject at bridge storage
    await injectDynamicConfigFromObsidian(publisher)

    // 2. Scripts uses the plugins, <static>
    publisher.use({
        buildScript: [new CorePlugins.BlogBuilder()],
        repository: [new CorePlugins.GithubRepository()],
        deploy: [new CorePlugins.VercelDeploy()],
    })

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
    const publishResult = await publisher.publish()

    console.log(publishResult)

    await io.writer.write({
        data: JSON.stringify(publisher.history, null, 2),
        filePath: `${BLOG_ROOT}/ci_test/${uniqueID}_pub_result.json`,
    })
}

publish()
