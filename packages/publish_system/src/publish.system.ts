import { IO } from '@obsidian_blogger/helpers/io'
import { type Job } from '@obsidian_blogger/helpers/job'
import {
    Logger,
    type LoggerConstructor,
} from '@obsidian_blogger/helpers/logger'
import {
    type PluginLoadInformation,
    PluginManager,
    type PluginShape,
    Runner,
} from '@obsidian_blogger/helpers/plugin'
import {
    ShellExecutor,
    type ShellExecutorConstructor,
} from '@obsidian_blogger/helpers/shell'
import { JsonStorage } from '@obsidian_blogger/helpers/storage'
import type {
    BuildScriptPlugin,
    DeployPlugin,
    RepositoryPlugin,
} from './plugin'
import { type PublishSystemPluginAdapter } from './plugin/interface'
import {
    PublishPlugin,
    PublishPluginDependencies,
} from './plugin/publish.plugin'

class PublishPluginRunner extends Runner.PluginRunner<
    PublishPlugin,
    PublishPluginDependencies
> {
    public async run(
        pluginPipes: PublishPlugin[],
        dependencies: PublishPluginDependencies
    ) {
        for (const plugin of pluginPipes) {
            this.$jobManager.registerJob({
                name: plugin.name,
                prepare: async () => {
                    dependencies.logger.updateName(plugin.name)
                    plugin.injectDependencies(dependencies)
                    return await plugin.prepare?.()
                },
                execute: async (controller, prepared) => {
                    return await plugin.execute(controller, prepared)
                },
                cleanup: async (job) => {
                    await plugin.cleanup?.(job)
                },
            })
        }

        await this.$jobManager.processJobs()

        return this.history
    }
}

export interface PublishSystemConstructor {
    /**
     * The root path of the bridge system
     */
    bridgeRoot: string
    logger?: LoggerConstructor
    shell?: ShellExecutorConstructor
}
export class PublishSystem {
    private readonly $logger: Logger
    private readonly $io: IO
    private readonly $shell: ShellExecutor

    private readonly $buildScriptPluginRunner: PublishPluginRunner
    private readonly $buildScriptPluginManager: PluginManager<
        BuildScriptPlugin,
        PublishPluginRunner
    >
    private readonly $repositoryPluginRunner: PublishPluginRunner
    private readonly $repositoryPluginManager: PluginManager<
        RepositoryPlugin,
        PublishPluginRunner
    >
    private readonly $deployPluginRunner: PublishPluginRunner
    private readonly $deployPluginManager: PluginManager<
        DeployPlugin,
        PublishPluginRunner
    >

    private readonly $historyStorage: JsonStorage<Array<Job>>

    public static storagePrefix = '.store/publish' as const

    public constructor(public readonly options: PublishSystemConstructor) {
        this.$logger = new Logger({
            name: 'publish_system',
            ...options?.logger,
        })
        this.$io = new IO()
        this.$shell = new ShellExecutor(options?.shell)

        this.$buildScriptPluginRunner = new PublishPluginRunner()
        this.$buildScriptPluginManager = new PluginManager({
            name: 'publish_system::build_script',
            root: `${options.bridgeRoot}/${PublishSystem.storagePrefix}/plugin__build_script.json`,
            runner: this.$buildScriptPluginRunner,
        })

        this.$repositoryPluginRunner = new PublishPluginRunner()
        this.$repositoryPluginManager = new PluginManager({
            name: 'publish_system::repository',
            root: `${options.bridgeRoot}/${PublishSystem.storagePrefix}/plugin__repository.json`,
            runner: this.$repositoryPluginRunner,
        })

        this.$deployPluginRunner = new PublishPluginRunner()
        this.$deployPluginManager = new PluginManager({
            name: 'publish_system::deploy',
            root: `${options.bridgeRoot}/${PublishSystem.storagePrefix}/plugin__deploy.json`,
            runner: this.$deployPluginRunner,
        })

        this.$historyStorage = new JsonStorage({
            name: 'publish_system::history',
            root: `${options.bridgeRoot}/${PublishSystem.storagePrefix}/history.json`,
        })

        this.pollingPublishHistory()
    }

    private get dependencies(): PublishPluginDependencies {
        return {
            io: this.$io,
            logger: this.$logger,
            shell: this.$shell,
        }
    }

    /**
     * Get the bridge root path
     * @returns The bridge root path for `buildScript`, `repository`, `deploy`
     */
    public get bridgeRoot(): {
        buildScript: string
        repository: string
        deploy: string
        history: string
    } {
        return {
            buildScript: this.$buildScriptPluginManager.$config.options.root,
            repository: this.$repositoryPluginManager.$config.options.root,
            deploy: this.$deployPluginManager.$config.options.root,
            history: this.$historyStorage.options.root,
        }
    }

    /**
     * Logs the plugin pipeline info.
     */
    public logPluginPipelineInfo(pluginPipes: {
        buildScript: Array<BuildScriptPlugin>
        repository: Array<RepositoryPlugin>
        deploy: Array<DeployPlugin>
    }): void {
        const pipelineEntries = Object.entries(pluginPipes)

        this.$logger.info('Plugin pipeline info::')

        pipelineEntries.forEach(([key, plugins]) => {
            this.$logger.info(`${key}:`)
            this.$logger.box(
                plugins
                    ?.map((plugin, i) => {
                        const command = plugin.dynamicConfig

                        return `${this.$logger.c.bgBlue.black.bold(` PIPE_${i + 1}:: ${plugin.name} `)}\n› dynamic configuration\n${this.$logger.c.cyanBright(
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

    private async registerAllPlugins() {
        try {
            await this.$buildScriptPluginManager.$config.load()
            await this.$repositoryPluginManager.$config.load()
            await this.$deployPluginManager.$config.load()
        } catch (e) {
            this.$logger.error('Failed to load plugin configurations')
            this.$logger.error(JSON.stringify(e, null, 4))
        }

        const plugins = {
            buildScript: this.$buildScriptPluginManager.$loader.pluginList,
            repository: this.$repositoryPluginManager.$loader.pluginList,
            deploy: this.$deployPluginManager.$loader.pluginList,
        }

        const registerPlugins = async (
            pluginManager: PluginManager<PluginShape, PublishPluginRunner>,
            pipes: Array<PluginShape>
        ) => {
            for (const pipe of pipes) {
                if (pluginManager.$config.hasConfig(pipe.name) === false) {
                    await pluginManager.$config.addConfig(
                        pipe.name,
                        pipe.dynamicConfig
                            ? {
                                  staticConfig: pipe.staticConfig,
                                  dynamicConfig: pipe.dynamicConfig,
                              }
                            : {
                                  staticConfig: pipe.staticConfig,
                              }
                    )
                }
            }
        }

        await registerPlugins(
            this.$buildScriptPluginManager,
            plugins.buildScript
        )
        await registerPlugins(this.$repositoryPluginManager, plugins.repository)
        await registerPlugins(this.$deployPluginManager, plugins.deploy)
    }

    /**
     * Fetch plugin pipes dynamic configuration from `obsidian` user
     */
    private async fetchPluginPipesDynamicConfig(): Promise<{
        buildScript: PluginLoadInformation
        repository: PluginLoadInformation
        deploy: PluginLoadInformation
    }> {
        const extractConfigs = (
            pluginManager: PluginManager<PluginShape, PublishPluginRunner>
        ) =>
            Object.entries(pluginManager.$config.store).map(([key, value]) =>
                value.dynamicConfig
                    ? {
                          name: key,
                          dynamicConfig: value.dynamicConfig,
                      }
                    : {
                          name: key,
                      }
            )

        const extractedDynamicConfigs = {
            buildScript: extractConfigs(this.$buildScriptPluginManager),
            repository: extractConfigs(this.$repositoryPluginManager),
            deploy: extractConfigs(this.$deployPluginManager),
        }
        return extractedDynamicConfigs
    }

    private async loadPlugins(): Promise<{
        buildScript: Array<BuildScriptPlugin>
        repository: Array<RepositoryPlugin>
        deploy: Array<DeployPlugin>
    }> {
        const localDate = new Date().toLocaleString()
        this.$logger.box(
            `${this.$logger.c.blueBright('Publish system')} - ${localDate}`,
            {
                borderStyle: 'round',
                padding: 0.75,
                borderColor: 'blueBright',
            }
        )

        await this.registerAllPlugins()

        const pluginConfigs = await this.fetchPluginPipesDynamicConfig()

        const deployPipes = this.$deployPluginManager.$loader.load(
            pluginConfigs.deploy
        )
        const repositoryPipes = this.$repositoryPluginManager.$loader.load(
            pluginConfigs.repository
        )
        const buildScriptPipes = this.$buildScriptPluginManager.$loader.load(
            pluginConfigs.buildScript
        )

        const pipes = {
            buildScript: buildScriptPipes,
            repository: repositoryPipes,
            deploy: deployPipes,
        }

        this.logPluginPipelineInfo(pipes)
        return pipes
    }

    private async runPluginPipes(pluginPipes: {
        buildScript: Array<BuildScriptPlugin>
        repository: Array<RepositoryPlugin>
        deploy: Array<DeployPlugin>
    }) {
        const buildScriptResponse =
            await this.$buildScriptPluginManager.$runner.run(
                pluginPipes.buildScript,
                this.dependencies
            )

        const repositoryResponse =
            await this.$repositoryPluginManager.$runner.run(
                pluginPipes.repository,
                this.dependencies
            )

        const deployResponse = await this.$deployPluginManager.$runner.run(
            pluginPipes.deploy,
            this.dependencies
        )

        return {
            buildScript: buildScriptResponse,
            repository: repositoryResponse,
            deploy: deployResponse,
        }
    }

    private async saveUpdatedPluginConfigs(pluginPipes: {
        buildScript: Array<BuildScriptPlugin>
        repository: Array<RepositoryPlugin>
        deploy: Array<DeployPlugin>
    }) {
        const saveConfigs = async (
            pluginManager: PluginManager<PluginShape, PublishPluginRunner>,
            pipes: Array<PluginShape>
        ) => {
            for (const pipe of pipes) {
                const { name, staticConfig, dynamicConfig } = pipe
                await pluginManager.$config.updateConfig(
                    name,
                    dynamicConfig
                        ? {
                              staticConfig,
                              dynamicConfig,
                          }
                        : {
                              staticConfig,
                          }
                )
            }
        }

        await saveConfigs(
            this.$buildScriptPluginManager,
            pluginPipes.buildScript
        )
        await saveConfigs(this.$repositoryPluginManager, pluginPipes.repository)
        await saveConfigs(this.$deployPluginManager, pluginPipes.deploy)
    }

    private async initializeHistoryStore() {
        await this.$historyStorage.set(
            'publish_system',
            this.$buildScriptPluginRunner.history
        )
    }

    private pollingPublishHistory() {
        this.$buildScriptPluginRunner.subscribe(async (...params) => {
            const history = params[2]
            await this.$historyStorage.set('buildScript', history)
        })
        this.$repositoryPluginRunner.subscribe(async (...params) => {
            const history = params[2]
            await this.$historyStorage.set('repository', history)
        })
        this.$deployPluginRunner.subscribe(async (...params) => {
            const history = params[2]
            await this.$historyStorage.set('deploy', history)
        })
    }

    /**
     * Run publish CI/CD pipeline
     * @param commands Publish command arguments
     */
    public async publish() {
        const plugins = await this.loadPlugins()

        await this.initializeHistoryStore()

        const response = await this.runPluginPipes(plugins)

        await this.saveUpdatedPluginConfigs(plugins)

        return response
    }

    /**
     * Get the history of the plugin jobs
     * @returns The history of the plugin jobs
     */
    public get history() {
        return {
            buildScript: this.$buildScriptPluginRunner.history,
            repository: this.$repositoryPluginRunner.history,
            deploy: this.$deployPluginRunner.history,
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
    public use(plugin: PublishSystemPluginAdapter): void {
        this.$buildScriptPluginManager.$loader.use(plugin.buildScript)
        this.$repositoryPluginManager.$loader.use(plugin.repository)
        this.$deployPluginManager.$loader.use(plugin.deploy)
    }
}
