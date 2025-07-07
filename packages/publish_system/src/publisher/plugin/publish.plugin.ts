import {
    type LogHistory,
    type LoggerConstructor,
} from '@obsidian_blogger/helpers/logger'
import {
    type CommandResult,
    type ShellExecutorConstructor,
} from '@obsidian_blogger/helpers/shell'
import {
    type PluginExecutionResponse,
    PluginInterface,
    type PluginInterfaceStaticConfig,
} from '@obsidian_blogger/plugin_api'

import type { IO } from '@obsidian_blogger/helpers/io'
import type { Logger } from '@obsidian_blogger/helpers/logger'
import type { ShellExecutor } from '@obsidian_blogger/helpers/shell'

export type PublishPluginDynamicConfig = {
    /**
     * The current working directory of the plugin
     */
    cwd: string
}

export interface PublishPluginResponse {
    /**
     * Error stacks
     */
    error: Array<{ error: Error; command?: CommandResult }>
    /**
     * History of log messages
     */
    history: Array<LogHistory>
    /**
     * Standard output
     */
    stdout?: string
}
export type PublishCommandResult = CommandResult

export type PublishPluginExecutionResponse =
    PluginExecutionResponse<PublishPluginResponse>

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
> extends PluginInterface<
    Static,
    Dynamic,
    Dependencies,
    {
        prepare: unknown
        response: PublishPluginResponse
    }
> {
    protected get $logger() {
        return this.getRunTimeDependency('logger')
    }
    protected get $shell() {
        return this.getRunTimeDependency('shell')
    }
    protected get $io() {
        return this.getRunTimeDependency('io')
    }

    protected invokeError(
        errorStack: PublishPluginResponse['error'],
        invoker: {
            e: unknown
            message: string
            commandResult?: PublishPluginResponse['error'][number]['command']
        }
    ): void {
        const { e, message, commandResult } = invoker
        this.$logger.error(message)
        if (e instanceof Error) {
            errorStack.push(
                commandResult
                    ? {
                          error: e,
                          command: commandResult,
                      }
                    : {
                          error: e,
                      }
            )
        } else {
            errorStack.push(
                commandResult
                    ? {
                          error: new Error(message, {
                              cause: e,
                          }),
                          command: commandResult,
                      }
                    : {
                          error: new Error(message, {
                              cause: e,
                          }),
                      }
            )
        }
    }
}
