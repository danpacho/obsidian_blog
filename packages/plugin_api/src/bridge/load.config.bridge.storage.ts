import {
    Logger,
    type LoggerConstructor,
} from '@obsidian_blogger/helpers/logger'
import { type PluginLoadInformation, PluginManager, type PluginShape } from '..'
import type { PluginRunner } from '../plugin.runner'

export interface LoadConfigBridgeStorageConstructor {
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
    managers: Array<PluginManager<PluginShape, PluginRunner>>
    /**
     * Logger configuration
     */
    logger?: LoggerConstructor
}

/**
 * Represents a bridge store for loading configuration.
 */
export class LoadConfigBridgeStorage {
    private static $logger: Logger
    private readonly $managerMap: Map<
        string,
        PluginManager<PluginShape, PluginRunner>
    >
    private getManager(name: string): PluginManager<PluginShape, PluginRunner> {
        if (!this.$managerMap.has(name)) {
            throw new Error(`Manager ${name} not found`)
        }

        return this.$managerMap.get(name)!
    }

    private _initialized: boolean = false
    public bridgeStorePrefix: string

    /**
     * Creates an instance of LoadConfigBridgeStore.
     * @param options - The options for configuring the bridge store.
     */
    public constructor(
        public readonly options: LoadConfigBridgeStorageConstructor
    ) {
        if (options.bridgeRoot.endsWith('/')) {
            options.bridgeRoot = options.bridgeRoot.slice(0, -1)
        }
        if (options.storePrefix.endsWith('/')) {
            options.storePrefix = options.storePrefix.slice(0, -1)
        }
        LoadConfigBridgeStorage.$logger = new Logger({
            name: 'plugin-config-bridge',
            ...options.logger,
        })

        this.$managerMap = new Map<
            string,
            PluginManager<PluginShape, PluginRunner>
        >(options.managers.map((manager) => [manager.options.name, manager]))

        this.bridgeStorePrefix = `${options.bridgeRoot}/${options.storePrefix}`
    }

    private async updateConfigStoreRoot() {
        const managers = Array.from(this.$managerMap.values())
        for (const manager of managers) {
            await manager.$config.updateRoot(
                `${this.bridgeStorePrefix}/${manager.options.name}.json`
            )
        }
    }

    /**
     * Get the store root path.
     * @returns An array of objects containing the name and root path of each manager.
     */
    public get configStoreRoot(): Array<{ name: string; root: string }> {
        return [...this.$managerMap].map((manager) => ({
            name: manager[1].options.name,
            root: manager[1].$config.options.root,
        }))
    }

    /**
     * Logs the plugin pipeline info.
     * @param pluginPipelines - The plugin pipelines to log.
     */
    public static logPluginPipelineInfo(
        pluginPipelines: Record<string, Array<PluginShape>>
    ): void {
        const pipelineEntries = Object.entries(pluginPipelines)

        LoadConfigBridgeStorage.$logger.info('plugin pipelines info :\n')

        const serialize = (obj: unknown): string => {
            const replacer = (_: string, value: unknown): unknown => {
                if (typeof value === 'function') return 'Function'
                if (value instanceof RegExp) return value.toString()
                return value
            }
            return JSON.stringify(obj, replacer, 4)
        }

        pipelineEntries.forEach(([key, plugins]) => {
            if (plugins.length === 0) return
            LoadConfigBridgeStorage.$logger.info(
                `: ${LoadConfigBridgeStorage.$logger.c.blue(key)}`
            )
            LoadConfigBridgeStorage.$logger.box(
                plugins
                    ?.map((plugin, i) => {
                        const command = plugin.dynamicConfig
                        const loggingCommand =
                            command === null ? 'NULL' : serialize(command)
                        const title =
                            LoadConfigBridgeStorage.$logger.c.bgBlue.bold.italic(
                                ` pipe ${i + 1} `
                            )
                        const pluginName =
                            LoadConfigBridgeStorage.$logger.c.blue.italic(
                                ` › ${plugin.name} `
                            )
                        const dynamicConfigTitle =
                            LoadConfigBridgeStorage.$logger.c.cyanBright(
                                `› dynamic configuration`
                            )
                        const dynamicConfig =
                            LoadConfigBridgeStorage.$logger.c.cyanBright(
                                loggingCommand
                            )

                        return `${title}${pluginName}\n${dynamicConfigTitle}\n${dynamicConfig}`
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

    private async registerAllPlugins(name: string) {
        const manager = this.getManager(name)
        try {
            await manager.$config.load()
        } catch (e) {
            LoadConfigBridgeStorage.$logger.error(
                'Failed to load plugin configurations'
            )
            LoadConfigBridgeStorage.$logger.error(JSON.stringify(e, null, 4))
        }

        const registerPlugins = async (
            pluginManager: PluginManager<PluginShape, PluginRunner>,
            pipes: Array<PluginShape>
        ) => {
            for (const pipe of pipes) {
                if (pluginManager.$config.hasConfig(pipe.name) === false) {
                    const mergedDynamicConfig = pipe.getMergedDynamicConfig(
                        pipe.dynamicConfig
                    )
                    await pluginManager.$config.addConfig(pipe.name, {
                        staticConfig: pipe.getMergedStaticConfig(
                            pipe.staticConfig
                        ),
                        dynamicConfig: mergedDynamicConfig,
                    })
                }
            }
        }

        await registerPlugins(manager, manager.$loader.pluginList)
    }

    /**
     * Fetch plugin pipes dynamic configuration from `obsidian` user.
     * @param name - The name of the manager.
     * @returns A promise that resolves to the plugin load information.
     */
    private async fetchPluginLoadInformation(
        name: string
    ): Promise<PluginLoadInformation> {
        const extractLoadInformation = (
            pluginManager: PluginManager<PluginShape, PluginRunner>
        ): PluginLoadInformation => {
            const loadingTargets = Object.entries(
                pluginManager.$config.storageRecord
            ).filter(([, config]) => {
                // $$load_status$$ is already recorded. so dynamicConfig is not null at this time
                if (!config?.dynamicConfig) return false

                if ('$$load_status$$' in config.dynamicConfig) {
                    const shouldLoad: boolean =
                        config.dynamicConfig['$$load_status$$'] === 'include'
                    return shouldLoad
                }

                // exceptional case
                return false
            })

            const loadInformation = loadingTargets.map(([key, value]) => ({
                name: key,
                dynamicConfig: value.dynamicConfig ?? null,
            }))
            return loadInformation
        }

        return extractLoadInformation(this.getManager(name))
    }

    private async loadPlugins(name: string): Promise<{
        loadInformation: PluginLoadInformation
        pluginPipes: Array<PluginShape>
    }> {
        await this.registerAllPlugins(name)

        const loadInformation = await this.fetchPluginLoadInformation(name)

        return {
            loadInformation: loadInformation,
            pluginPipes: this.getManager(name).$loader.load(loadInformation),
        }
    }

    /**
     * **Update dynamic config by UI(injected)**
     */
    private async saveUpdatedPluginConfigs({
        name,
        pluginPipes,
    }: {
        name: string
        pluginPipes: Array<PluginShape>
    }) {
        const saveConfigs = async (
            pluginManager: PluginManager<PluginShape, PluginRunner>,
            pipes: Array<PluginShape>
        ) => {
            await pluginManager.$config.load()

            /* ────────────────────────────────────────────────────────── 1) snapshot */
            const initialDbNames = new Set<string>(
                Object.keys(pluginManager.$config.storageRecord)
            )

            /* ────────────────────────────────────────────────────────── 2) upsert   */
            for (const pipe of pipes) {
                const { name, staticConfig, dynamicConfig } = pipe

                const databaseDynamicConfig =
                    pluginManager.$config.get(name)?.dynamicConfig

                const dynamicConfigToSave = databaseDynamicConfig ?? {
                    ...dynamicConfig,
                    $$load_status$$: 'include',
                }

                await pluginManager.$config.updateConfig(name, {
                    staticConfig,
                    dynamicConfig: dynamicConfigToSave,
                })
            }

            /* ────────────────────────────────────────────────────────── 3) prune    */
            const registered = new Set(pipes.map((p) => p.name))

            // From the original snapshot, keep only those rows that:
            //   – are still flagged "include"
            //   – are NOT in the current pipe list
            const toRemove = Array.from(initialDbNames).filter((name) => {
                if (registered.has(name)) return false // still wanted

                const row = pluginManager.$config.storageRecord[name]
                return row?.dynamicConfig?.['$$load_status$$'] === 'include'
            })

            for (const rm of toRemove) {
                await pluginManager.$config.remove(rm)
            }
        }

        await saveConfigs(this.getManager(name), pluginPipes)
    }

    private async init(): Promise<void> {
        await this.updateConfigStoreRoot()
    }
    /**
     * Initializes the bridge store.
     * @returns A promise that resolves when the initialization is complete.
     */
    public async load(): Promise<void> {
        if (!this._initialized) {
            await this.init()
        }

        for (const manager of this.$managerMap.values()) {
            await this.saveUpdatedPluginConfigs({
                name: manager.options.name,
                pluginPipes: manager.$loader.pluginList,
            })
        }
    }

    /**
     * Load plugin load information and update to store.
     * @param managerName - The name of the manager.
     * @returns A promise that resolves to the plugin load information.
     */
    public async loadInformation(managerName: string) {
        if (!this._initialized) {
            await this.load()
        }
        const { pluginPipes, loadInformation } =
            await this.loadPlugins(managerName)

        await this.saveUpdatedPluginConfigs({
            name: managerName,
            pluginPipes,
        })

        return loadInformation
    }
}
