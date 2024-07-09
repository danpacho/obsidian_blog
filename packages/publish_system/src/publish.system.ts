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
     * BuildScript command arguments, should exact match with builder plugins
     */
    buildScript: ReadonlyArray<Record<string, unknown>>
    /**
     * Repository command arguments, should exact match with repository plugins
     */
    repository: ReadonlyArray<Record<string, unknown>>
    /**
     * Deployer command arguments, should exact match with deployer plugins
     */
    deploy?: ReadonlyArray<Record<string, unknown>>
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
            buildScript: this.buildScriptPluginManager.$loader.plugins.map(
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
            deploy: this.deployPluginManager.$loader.plugins.map((d, i) => ({
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
        const pipelineEntries = Object.entries(pipelineInfo)

        this.$logger.info('Plugin pipeline info::')

        pipelineEntries.forEach(([key, value]) => {
            this.$logger.info(`${key}:`)

            this.$logger.box(
                value
                    ?.map((v, i) => {
                        const command =
                            pluginCommands?.[key as keyof PublishCommand]?.[i]

                        return `${this.$logger.c.bgBlue.black.bold(` PIPE_${v.order}:: ${v.name} `)}\n› command\n${this.$logger.c.cyanBright(
                            JSON.stringify(command, null, 4)
                        )}`
                    })
                    .join('\n'),
                {
                    borderStyle: 'round',
                    padding: 0.75,
                    borderColor: 'grey',
                }
            )
        })
    }

    /**
     * Run publish CI/CD pipeline
     * @param commands Publish command arguments
     */
    public async publish<Command extends PublishCommand = PublishCommand>(
        commands: Command
    ) {
        const localDate = new Date().toLocaleString()
        this.$logger.box(
            `${this.$logger.c.blueBright('Publish system')} - ${localDate}`,
            {
                borderStyle: 'round',
                padding: 0.75,
                borderColor: 'blueBright',
            }
        )
        this.logPluginPipelineInfo(commands)

        this.$jobManager.registerJobs([
            {
                id: 'build-script',
                before: async () => {
                    this.$logger.info('BuildScript initiated')
                },
                execute: async () => {
                    const buildResponse =
                        this.buildScriptPluginManager.$loader.plugins.reduce<
                            Promise<Array<unknown>>
                        >(
                            async (acc, builder, i) => {
                                const command = commands.buildScript[i]
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
                    this.$logger.info('BuildScript completed')
                },
            },
            {
                id: 'repository',
                before: async () => {
                    this.$logger.info('Repository initiated')
                },
                execute: async () => {
                    const saveResponse =
                        this.repositoryPluginManager.$loader.plugins.reduce<
                            Promise<Array<unknown>>
                        >(
                            async (acc, repository, i) => {
                                const command = commands.repository[i]
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
                    this.$logger.info('Repository completed')
                },
            },
            {
                id: 'deploy',
                before: async () => {
                    this.$logger.info('Deploy initiated')
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
                                const command = commands.deploy?.[i]
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
                    this.$logger.info('Deploy completed')
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

        return {
            history,
            commands: commands,
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
