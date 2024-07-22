import { IO } from '@obsidian_blogger/helpers/io'
import {
    Logger,
    type LoggerConstructor,
} from '@obsidian_blogger/helpers/logger'
import { Bridge } from '@obsidian_blogger/helpers/plugin'
import {
    ShellExecutor,
    type ShellExecutorConstructor,
} from '@obsidian_blogger/helpers/shell'
import type { PublishSystemPluginAdapter } from './publish.system.interface'
import { Publisher } from './publisher/publisher'
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

    private readonly $publisher: Publisher
    public readonly $configBridgeStore: Bridge.LoadConfigBridgeStore
    private readonly $historyBridgeStore: Bridge.HistoryBridgeStorage

    public static storagePrefix = '.store/publish' as const

    public constructor(public readonly options: PublishSystemConstructor) {
        this.$logger = new Logger({
            name: 'publish_system',
            ...options?.logger,
        })
        this.$io = new IO()
        this.$shell = new ShellExecutor(options?.shell)
        this.$publisher = new Publisher({
            io: this.$io,
            shell: this.$shell,
            logger: this.$logger,
            bridgeRoot: options.bridgeRoot,
        })
        this.$configBridgeStore = new Bridge.LoadConfigBridgeStore({
            bridgeRoot: options.bridgeRoot,
            storePrefix: PublishSystem.storagePrefix,
            managers: [
                this.$publisher.$buildScriptPluginManager,
                this.$publisher.$repositoryPluginManager,
                this.$publisher.$deployPluginManager,
            ],
        })
        this.$historyBridgeStore = new Bridge.HistoryBridgeStorage({
            bridgeRoot: options.bridgeRoot,
            storePrefix: PublishSystem.storagePrefix,
            managers: [
                this.$publisher.$buildScriptPluginManager,
                this.$publisher.$repositoryPluginManager,
                this.$publisher.$deployPluginManager,
            ],
        })
    }

    /**
     * Publish
     */
    public async publish(): Promise<void> {
        await this.$configBridgeStore.init()
        await this.$historyBridgeStore.init()

        const [buildScript, deploy, repository] = await Promise.all([
            this.$configBridgeStore.loadInformation(
                this.$publisher.$buildScriptPluginManager.options.name
            ),
            this.$configBridgeStore.loadInformation(
                this.$publisher.$deployPluginManager.options.name
            ),
            this.$configBridgeStore.loadInformation(
                this.$publisher.$repositoryPluginManager.options.name
            ),
        ])

        Bridge.LoadConfigBridgeStore.logPluginPipelineInfo({
            [this.$publisher.$buildScriptPluginManager.options.name]:
                this.$publisher.$buildScriptPluginManager.$loader.pluginList,
            [this.$publisher.$repositoryPluginManager.options.name]:
                this.$publisher.$repositoryPluginManager.$loader.pluginList,
            [this.$publisher.$deployPluginManager.options.name]:
                this.$publisher.$deployPluginManager.$loader.pluginList,
        })

        await this.$publisher.publish({
            buildScript,
            repository,
            deploy,
        })
    }

    /**
     * Register publish system plugins
     * @param plugins {@link PublishSystemPluginAdapter}
     * @example
     * ```typescript
     * const publishSystem = new PublishSystem(...)
     * publishSystem.use({
     *      buildScript: [plugin0, plugin1],
     *      deploy: plugin2,
     *      repository: plugin3,
     * })
     * ```
     */
    public use(plugins: PublishSystemPluginAdapter) {
        this.$publisher.use(plugins)
    }
}
