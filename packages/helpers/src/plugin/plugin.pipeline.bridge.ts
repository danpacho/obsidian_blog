import { type Job } from '../job'
import { Logger, type LoggerConstructor } from '../logger'
import { JsonStorage } from '../storage'
import type { PluginRunner } from './plugin.runner'
import { type PluginLoadInformation, PluginManager, type PluginShape } from '.'

export interface PluginPipelineBridgeConstructor<
    Pipelines extends readonly PluginManager<PluginShape, PluginRunner>[],
> {
    /**
     * The name of the plugin pipe manager
     */
    name: string
    /**
     * The root path of the bridge system
     */
    bridgeRoot: string
    /**
     * The prefix for the store
     */
    storePrefix: string
    /**
     * The plugin managers to use in the pipeline
     */
    managerPipeline: Pipelines
    /**
     * Logger configuration
     */
    logger?: LoggerConstructor
}

export class PluginPipelineBridge<
    Pipelines extends readonly PluginManager<
        PluginShape,
        PluginRunner
    >[] = readonly PluginManager<PluginShape, PluginRunner>[],
> {
    private readonly $logger: Logger
    private get $pluginManagerPipelines(): Pipelines {
        return this.options.managerPipeline
    }
    private readonly $historyStore: JsonStorage<Array<Job>>
    private initialized: boolean = false

    public constructor(
        public readonly options: PluginPipelineBridgeConstructor<Pipelines>
    ) {
        if (this.options.bridgeRoot.endsWith('/')) {
            this.options.bridgeRoot = this.options.bridgeRoot.slice(0, -1)
        }
        if (this.options.storePrefix.endsWith('/')) {
            this.options.storePrefix = this.options.storePrefix.slice(0, -1)
        }

        this.$logger = new Logger({
            name: options.name,
            ...options.logger,
        })

        this.$pluginManagerPipelines.forEach((pluginManager) => {
            pluginManager.$config.updateRoot(
                `${this.storeRoot}/${pluginManager.options.name}.json`
            )
        })

        this.$historyStore = new JsonStorage({
            name: options.name,
            root: `${this.storeRoot}/history.json`,
        })

        this.pollingPublishHistory()
    }

    /**
     * Initialize plugin bridge pipeline
     */
    public async init(): Promise<void> {
        if (this.initialized) {
            this.$logger.warn('Plugin pipeline bridge already initialized')
            return
        }
        await this.$historyStore.init()
        this.$logger.info('Plugin pipeline bridge initialized')
        this.initialized = true
    }

    /**
     * Get the store root path
     */
    public get storeRoot(): string {
        return `${this.options.bridgeRoot}/${this.options.storePrefix}`
    }

    private pollingPublishHistory() {
        this.$pluginManagerPipelines.forEach((pluginManager) => {
            pluginManager.$runner.subscribe(async (...params) => {
                const history = params[2]
                await this.$historyStore.set(
                    pluginManager.options.name,
                    history
                )
            })
        })
    }

    /**
     * Get the store root path list
     */
    public get storeRoots(): Array<{ name: string; root: string }> {
        return this.$pluginManagerPipelines.map((pluginManager) => ({
            name: pluginManager.options.name,
            root: pluginManager.$config.options.root,
        }))
    }

    /**
     * Get the plugin pipelines
     */
    public get pluginPipelines(): Record<string, Array<PluginShape>> {
        return this.$pluginManagerPipelines.reduce<
            Record<string, Array<PluginShape>>
        >((acc, pluginManager) => {
            acc[pluginManager.options.name] = pluginManager.$loader.pluginList
            return acc
        }, {})
    }

    /**
     * Logs the plugin pipeline info.
     */
    public logPluginPipelineInfo(
        pluginPipelines: Record<string, Array<PluginShape>>
    ): void {
        const pipelineEntries = Object.entries(pluginPipelines)

        this.$logger.info('plugin pipelines info:\n')

        pipelineEntries.forEach(([key, plugins]) => {
            this.$logger.info(`:: ${this.$logger.c.blue(key)}`)
            this.$logger.box(
                plugins
                    ?.map((plugin, i) => {
                        const command = plugin.dynamicConfig
                        const loggingCommand =
                            command === null
                                ? 'empty'
                                : JSON.stringify(command, null, 4)
                        return `${this.$logger.c.bgBlue.black.bold.italic(` pipe ${i + 1} › ${plugin.name} `)}\n› dynamic configuration\n${this.$logger.c.cyanBright(
                            loggingCommand
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
            for (const pluginManager of this.$pluginManagerPipelines) {
                await pluginManager.$config.load()
            }
        } catch (e) {
            this.$logger.error('Failed to load plugin configurations')
            this.$logger.error(JSON.stringify(e, null, 4))
        }

        const registerPlugins = async (
            pluginManager: PluginManager<PluginShape, PluginRunner>,
            pipes: Array<PluginShape>
        ) => {
            for (const pipe of pipes) {
                if (pluginManager.$config.hasConfig(pipe.name) === false) {
                    await pluginManager.$config.addConfig(pipe.name, {
                        staticConfig: pipe.staticConfig,
                        dynamicConfig: pipe.dynamicConfig,
                    })
                }
            }
        }

        for (const pluginManager of this.$pluginManagerPipelines) {
            await registerPlugins(
                pluginManager,
                pluginManager.$loader.pluginList
            )
        }
    }

    /**
     * Fetch plugin pipes dynamic configuration from `obsidian` user
     */
    private async fetchPluginPipesDynamicConfig(): Promise<
        Array<PluginLoadInformation>
    > {
        const extractConfigs = (
            pluginManager: PluginManager<PluginShape, PluginRunner>
        ): PluginLoadInformation => {
            const res = Object.entries(pluginManager.$config.store).map(
                ([key, value]) => ({
                    name: key,
                    dynamicConfig: value.dynamicConfig ?? null,
                })
            )
            return res
        }

        const extractedDynamicConfigs: Array<PluginLoadInformation> =
            this.$pluginManagerPipelines.map((pluginManager) =>
                extractConfigs(pluginManager)
            )

        return extractedDynamicConfigs
    }

    private async loadPlugins(): Promise<Array<Array<PluginShape>>> {
        const localDate = new Date().toLocaleString()
        this.$logger.box(
            `${this.$logger.c.blueBright(this.options.name)} - ${localDate}`,
            {
                borderStyle: 'round',
                padding: 0.75,
                borderColor: 'blueBright',
            }
        )

        await this.registerAllPlugins()

        const pluginConfigs = await this.fetchPluginPipesDynamicConfig()

        const pluginPipes = this.$pluginManagerPipelines.reduce<
            Record<string, Array<PluginShape>>
        >((acc, pluginManager, i) => {
            const pluginConfig = pluginConfigs[i]
            if (!pluginConfig) {
                this.$logger.error(
                    `Failed to load plugin pipes for ${pluginManager.options.name}`
                )
                return acc
            }
            const pipes = pluginManager.$loader.load(pluginConfig)
            acc[pluginManager.options.name] = pipes
            return acc
        }, {})

        this.logPluginPipelineInfo(pluginPipes)

        return Object.values(pluginPipes)
    }

    private async runPluginPipes(pluginPipes: Array<Array<PluginShape>>) {
        const pluginResponses = await this.$pluginManagerPipelines.reduce<
            Promise<Record<string, Job<Job[]>[]>>
        >(async (acc, pluginManager, i) => {
            const awaitedAcc = await acc

            const pipes = pluginPipes[i]
            if (!pipes) {
                this.$logger.error(
                    `Failed to load plugin pipes for ${pluginManager.options.name}`
                )
                return awaitedAcc
            }

            const response = await pluginManager.$runner.run(pipes)
            awaitedAcc[pluginManager.options.name] = response
            return awaitedAcc
        }, Promise.resolve({}))

        return pluginResponses
    }

    private async saveUpdatedPluginConfigs(
        pluginPipes: Array<Array<PluginShape>>
    ) {
        const saveConfigs = async (
            pluginManager: PluginManager<PluginShape, PluginRunner>,
            pipes: Array<PluginShape>
        ) => {
            for (const pipe of pipes) {
                const { name, staticConfig, dynamicConfig } = pipe
                await pluginManager.$config.updateConfig(name, {
                    staticConfig,
                    dynamicConfig,
                })
            }
        }

        for (let i = 0; i < pluginPipes.length; i++) {
            const pluginManager = this.$pluginManagerPipelines[i]
            const pipes = pluginPipes[i]
            await saveConfigs(pluginManager!, pipes!)
        }
    }

    private async initializeHistoryStore() {
        for (const pluginManager of this.$pluginManagerPipelines) {
            await this.$historyStore.set(
                pluginManager.options.name,
                pluginManager.$runner.history
            )
        }
    }

    /**
     * Run plugin pipelines
     */
    public async run() {
        if (!this.initialized) {
            await this.init()
        }
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
    public get history(): Record<string, Array<Job>> {
        return this.$pluginManagerPipelines.reduce<Record<string, Array<Job>>>(
            (acc, pluginManager) => {
                acc[pluginManager.options.name] = pluginManager.$runner.history
                return acc
            },
            {}
        )
    }
}
