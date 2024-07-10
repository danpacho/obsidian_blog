/**
 * Plugin base configuration interface
 */
export interface PluginInterfaceConfig {
    /**
     * Unique name of the plugin.
     */
    name: string
    /**
     * Description of the plugin.
     */
    description: string
}

class PluginInterfaceError extends SyntaxError {
    public constructor(message: string, config: unknown) {
        super(`› ${message}\n› config: ${JSON.stringify(config)}`)
        this.name = 'PluginInterfaceError'
    }
}
/**
 * Represents an abstract class for a plugin interface.
 * @template InjectedPluginConfig - The type of the plugin configuration {@link PluginInterfaceConfig}.
 */
export abstract class PluginInterface<
    InjectedPluginConfig extends PluginInterfaceConfig = PluginInterfaceConfig,
> {
    /**
     * Gets the configuration of the plugin.
     */
    public get config(): InjectedPluginConfig {
        return this._config
    }

    protected _config!: InjectedPluginConfig

    /**
     * Defines the configuration for the plugin.
     * This method should be implemented by the derived classes.
     */
    protected abstract defineConfig(): InjectedPluginConfig

    private validateConfig(
        config: unknown
    ): asserts config is PluginInterfaceConfig {
        const isRecord = (value: unknown): value is Record<string, unknown> =>
            typeof value === 'object' && value !== null && !Array.isArray(value)

        if (!isRecord(config)) {
            throw new PluginInterfaceError(
                'defineConfig method must return an Record<string, unknown>.',
                config
            )
        }

        Object.keys(config).forEach((key) => {
            if (typeof key !== 'string') {
                throw new PluginInterfaceError(
                    'Configuration keys must be strings.',
                    config
                )
            }
        })
        try {
            Object.values(config)
        } catch (e) {
            throw new PluginInterfaceError(
                e instanceof Error ? e.message : JSON.stringify(e),
                config
            )
        }

        const requiredKeys = ['name', 'description']
        requiredKeys.forEach((key) => {
            if (!Object.keys(config).includes(key)) {
                throw new PluginInterfaceError(
                    `Configuration must have a \`${key}\` key.`,
                    config
                )
            }
        })
    }

    /**
     * Creates a new instance of the PluginInterface class.
     * - `defineConfig` method to define the configuration.
     */
    public constructor() {
        try {
            const config = this.defineConfig()
            this.validateConfig(config)
            this._config = config
        } catch (e) {
            throw new SyntaxError(
                e instanceof Error ? e.message : JSON.stringify(e)
            )
        }
    }
}
