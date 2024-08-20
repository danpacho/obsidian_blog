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

export interface PublishPluginDependencies {
    io: IO
    shell: ShellExecutor
    logger: Logger
}
/**
 * Represents an abstract class for a publish plugin.
 */
export abstract class PublishPlugin<
    Static extends PublishPluginStaticConfig = PublishPluginStaticConfig,
    Dynamic extends PublishPluginDynamicConfig = PublishPluginDynamicConfig,
    Dependencies extends PublishPluginDependencies = PublishPluginDependencies,
> extends PluginInterface<Static, Dynamic, Dependencies> {
    protected get $logger() {
        return this.getRunTimeDependency('logger')
    }
    protected get $shell() {
        return this.getRunTimeDependency('shell')
    }
    protected get $io() {
        return this.getRunTimeDependency('io')
    }
}
