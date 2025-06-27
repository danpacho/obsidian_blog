import { IO } from '@obsidian_blogger/helpers/io'
import {
    Logger,
    type LoggerConstructor,
} from '@obsidian_blogger/helpers/logger'
import {
    ShellExecutor,
    type ShellExecutorConstructor,
} from '@obsidian_blogger/helpers/shell'
import { Bridge } from '@obsidian_blogger/plugin_api'
import { Bridge as BridgeConstant } from '@obsidian_blogger/plugin_api/constants'

import { Publisher } from './publisher/publisher'

import type { PublishSystemPluginAdapter } from './publish.system.interface'
export interface PublishSystemConstructor {
    /**
     * The root path of the bridge system
     */
    bridgeRoot: string
    logger?: LoggerConstructor
    shell?: ShellExecutorConstructor
}
export class PublishSystem {
    private readonly $publisher: Publisher
    public readonly $configBridgeStorage: Bridge.LoadConfigBridgeStorage
    public readonly $historyBridgeStorage: Bridge.HistoryBridgeStorage

    private readonly $io: IO
    private readonly $logger: Logger
    private readonly $shell: ShellExecutor

    public static storagePrefix = BridgeConstant.STORE_PREFIX.publishSystem

    private _initialized: boolean = false

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
        this.$configBridgeStorage = new Bridge.LoadConfigBridgeStorage({
            bridgeRoot: options.bridgeRoot,
            storePrefix: PublishSystem.storagePrefix,
            managers: [
                this.$publisher.$buildScriptPluginManager,
                this.$publisher.$repositoryPluginManager,
                this.$publisher.$deployPluginManager,
            ],
        })
        this.$historyBridgeStorage = new Bridge.HistoryBridgeStorage({
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
     * Initialize
     */
    public async init(): Promise<void> {
        await this.$configBridgeStorage.load()
        await this.$historyBridgeStorage.init()
    }

    /**
     * Publish
     */
    public async publish(): Promise<void> {
        if (!this._initialized) {
            await this.init()
        }

        const [buildScript, deploy, repository] = await Promise.all([
            this.$configBridgeStorage.loadInformation(
                this.$publisher.$buildScriptPluginManager.options.name
            ),
            this.$configBridgeStorage.loadInformation(
                this.$publisher.$deployPluginManager.options.name
            ),
            this.$configBridgeStorage.loadInformation(
                this.$publisher.$repositoryPluginManager.options.name
            ),
        ])

        Bridge.LoadConfigBridgeStorage.logPluginPipelineInfo({
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
    public use(plugins: PublishSystemPluginAdapter): this {
        this.$publisher.use(plugins)
        return this
    }
}
