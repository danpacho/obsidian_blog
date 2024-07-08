import { PluginManager } from '@obsidian_blogger/helpers/plugin'
import type { BuildScriptConstructor } from './plugin'
import {
    PublishSystemPlugin,
    type PublishSystemPluginAdapter,
} from './plugin/interface'
import {
    PublishPlugin,
    type PublishPluginConstructor,
} from './plugin/publish.plugin'

/**
 * Publish command arguments
 * @property builder - Builder command arguments
 * @property repository - Repository command arguments
 * @property deployer - Deployer command arguments
 */
export interface PublishCommand {
    /**
     * Builder command arguments, should exact match with builder plugins
     */
    builder: ReadonlyArray<Record<string, unknown>>
    /**
     * Repository command arguments, should exact match with repository plugins
     */
    repository: ReadonlyArray<Record<string, unknown>>
    /**
     * Deployer command arguments, should exact match with deployer plugins
     */
    deployer: ReadonlyArray<Record<string, unknown>>
}

export interface PublishSystemConstructor extends PublishPluginConstructor {}
export class PublishSystem extends PublishPlugin {
    private readonly buildScriptPluginManager: PluginManager<
        PublishSystemPlugin['buildScript'],
        BuildScriptConstructor
    >
    private readonly repositoryPluginManager: PluginManager<
        PublishSystemPlugin['repository'],
        BuildScriptConstructor
    >
    private readonly deployPluginManager: PluginManager<
        PublishSystemPlugin['deploy'],
        BuildScriptConstructor
    >

    public constructor(public readonly options: PublishSystemConstructor) {
        super(options)

        this.buildScriptPluginManager = new PluginManager()
        this.repositoryPluginManager = new PluginManager()
        this.deployPluginManager = new PluginManager()

        this.updateLoggerName(options.name)
        this.buildScriptPluginManager.$loader.plugins.forEach((b, i) =>
            b.updateLoggerName(`${options.name}::builder_${i + 1}`)
        )
        this.repositoryPluginManager.$loader.plugins.forEach((r, i) =>
            r.updateLoggerName(`${options.name}::repository_${i + 1}`)
        )
        this.deployPluginManager.$loader.plugins.forEach((d, i) =>
            d?.updateLoggerName(`${options.name}::deployer_${i + 1}`)
        )
    }

    /**
     * Gets the plugin pipeline info.
     */
    public getPluginPipelineInfo() {
        return {
            builder: this.buildScriptPluginManager.$loader.plugins.map(
                (b, i) => ({
                    name: b.name,
                    order: i + 1,
                })
            ),
            repository: this.repositoryPluginManager.$loader.plugins.map(
                (r, i) => ({
                    name: r.name,
                    order: i + 1,
                })
            ),
            deployer: this.deployPluginManager.$loader.plugins.map((d, i) => ({
                name: d?.name,
                order: i + 1,
            })),
        }
    }

    /**
     * Logs the plugin pipeline info.
     */
    public logPluginPipelineInfo(pluginCommands?: PublishCommand) {
        const pipelineInfo = this.getPluginPipelineInfo()

        this.$logger.info('Plugin pipeline info:')

        const pipelineEntries = Object.entries(pipelineInfo)
        pipelineEntries.forEach(([key, value]) => {
            this.$logger.info(`${key.toLocaleUpperCase()}:`)
            value?.forEach((v, i) => {
                this.$logger.log(`#${v.order}, ${v.name}`)
                if (key) {
                    const pluginCommand =
                        pluginCommands?.[key as keyof PublishCommand]
                    this.$logger.log(
                        `command, ${JSON.stringify(
                            pluginCommand?.[i],
                            null,
                            4
                        )}`
                    )
                }
            })
        })

        this.$logger.log('\n')
    }

    /**
     * Publish site
     * @param publishCommand Publish commands arguments
     */
    public async publish<Command extends PublishCommand = PublishCommand>(
        publishCommand: Command
    ) {
        const localDate = new Date().toLocaleString()
        this.$logger.box(
            `${this.$logger.c.blueBright(`Publish system started - ${localDate}`)}`,
            {
                prefix: false,
                borderStyle: 'round',
                padding: 0.75,
            }
        )
        this.logPluginPipelineInfo(publishCommand)

        this.$jobManager.registerJobs([
            {
                id: 'build',
                before: async () => {
                    this.$logger.info('1. Build initiated')
                },
                execute: async () => {
                    const buildResponse =
                        this.buildScriptPluginManager.$loader.plugins.reduce<
                            Promise<Array<unknown>>
                        >(
                            async (acc, builder, i) => {
                                const command = publishCommand.builder[i]
                                if (!command) {
                                    this.$logger.error(
                                        `No build command found for builder ${builder.name}`
                                    )
                                    return acc
                                }
                                const awaitedAcc = await acc
                                const buildResponse =
                                    await builder.build(command)
                                awaitedAcc.push(buildResponse)
                                return awaitedAcc
                            },
                            Promise.resolve([]) as Promise<Array<unknown>>
                        )
                    return buildResponse
                },
                after: async () => {
                    this.$logger.info('1. Build completed')
                },
            },
            {
                id: 'save',
                before: async () => {
                    this.$logger.info('2. Save initiated')
                },
                execute: async () => {
                    const saveResponse =
                        this.repositoryPluginManager.$loader.plugins.reduce<
                            Promise<Array<unknown>>
                        >(
                            async (acc, repository, i) => {
                                const command = publishCommand.repository[i]
                                if (!command) {
                                    this.$logger.error(
                                        `No save command found for repository ${repository.name}`
                                    )
                                    return acc
                                }
                                const awaitedAcc = await acc
                                const saveResponse =
                                    await repository.save(command)
                                awaitedAcc.push(saveResponse)
                                return awaitedAcc
                            },
                            Promise.resolve([]) as Promise<Array<unknown>>
                        )
                    return saveResponse
                },
                after: async () => {
                    this.$logger.info('2. Save completed')
                },
            },
            {
                id: 'deploy',
                before: async () => {
                    this.$logger.info('3. Deploy initiated')
                },
                execute: async () => {
                    if (this.deployPluginManager.$loader.plugins.length === 0) {
                        this.$logger.info('No deployer found')
                        return
                    }

                    const deployResponse =
                        this.deployPluginManager.$loader.plugins.reduce<
                            Promise<Array<unknown>>
                        >(
                            async (acc, deployer, i) => {
                                const command = publishCommand.deployer[i]
                                if (!command) {
                                    this.$logger.error(
                                        `No deploy command found for deployer ${deployer?.name}`
                                    )
                                    return acc
                                }
                                const awaitedAcc = await acc
                                const deployResponse =
                                    await deployer?.deploy(command)
                                awaitedAcc.push(deployResponse)
                                return awaitedAcc
                            },
                            Promise.resolve([]) as Promise<Array<unknown>>
                        )
                    return deployResponse
                },
                after: async () => {
                    this.$logger.info('3. Deploy completed')
                },
            },
        ])

        const success = await this.$jobManager.processJobs()

        if (success) {
            this.$logger.success('Publish succeeded 🚀')
        } else {
            this.$logger.error('Publish failed 🚨')
        }

        const history = this.$jobManager.history

        this.$jobManager.clearHistory()

        return {
            history,
            commands: publishCommand,
        }
    }

    /**
     * Register build system plugins
     * @param plugins {@link PublishSystemPluginAdapter}
     * @example
     * ```ts
     * const publisher = new PublishSystem(...)
     * publisher.use({
     *      buildScript: [plugin0, plugin1],
     *      repository: plugin2,
     *      deploy: [plugin3, plugin4],
     * })
     * ```
     */
    public use(plugin: PublishSystemPluginAdapter) {
        this.buildScriptPluginManager.$loader.use(plugin.buildScript)
        this.repositoryPluginManager.$loader.use(plugin.repository)
        this.deployPluginManager.$loader.use(plugin.deploy)
    }
}
