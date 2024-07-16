import { IO } from '@obsidian_blogger/helpers/io'
import {
    Logger,
    type LoggerConstructor,
} from '@obsidian_blogger/helpers/logger'
import {
    PluginInterface,
    PluginInterfaceStaticConfig,
} from '@obsidian_blogger/helpers/plugin'
import {
    ShellExecutor,
    type ShellExecutorConstructor,
} from '@obsidian_blogger/helpers/shell'

export type PublishPluginDynamicConfig = {
    /**
     * The current working directory of the plugin
     */
    cwd: string
}
export interface PublishPluginStaticConfig extends PluginInterfaceStaticConfig {
    /**
     * Shell executor options
     */
    shell?: ShellExecutorConstructor
    /**
     * Logger options
     */
    logger?: LoggerConstructor
}

/**
 * Represents an abstract class for a publish plugin.
 */
export abstract class PublishPlugin<
    Static extends PublishPluginStaticConfig,
    Dynamic extends PublishPluginDynamicConfig = PublishPluginDynamicConfig,
> extends PluginInterface<Static, Dynamic> {
    protected readonly $logger: Logger
    protected readonly $shell: ShellExecutor
    protected readonly $io: IO

    public constructor() {
        super()
        this.$io = new IO()
        this.$logger = new Logger(this.staticConfig.logger)
        this.$shell = new ShellExecutor(this.staticConfig.shell)
    }

    /**
     * Gets the history of job executions.
     * @returns An array of job history.
     */
    public history() {
        return this.$jobManager.history
    }
}
