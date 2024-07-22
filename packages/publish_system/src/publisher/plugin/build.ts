import type { Promisify } from '@obsidian_blogger/helpers/promisify'
import {
    type CommandResult,
    ShellExecutor,
} from '@obsidian_blogger/helpers/shell'
import { type PM, detect } from 'detect-package-manager'
import {
    PublishPlugin,
    type PublishPluginDynamicConfig,
    type PublishPluginStaticConfig,
} from './publish.plugin'

export interface BuildScriptStaticConfig extends PublishPluginStaticConfig {}
export type BuildScriptDynamicConfig = PublishPluginDynamicConfig & {
    /**
     * The build script command
     */
    command: Array<string>
}
/**
 * Abstract class representing a build script plugin
 * Extends the `PublishPlugin` class.
 */
export abstract class BuildScriptPlugin<
    Static extends BuildScriptStaticConfig = BuildScriptStaticConfig,
    Dynamic extends BuildScriptDynamicConfig = BuildScriptDynamicConfig,
> extends PublishPlugin<Static, Dynamic> {
    private packageManager: PM | null = null

    /**
     * Detects the package manager used in the project.
     * Sets the `packageManager` property accordingly.
     */
    public async detectPackageManager(cwd: string): Promise<void> {
        this.packageManager = await detect({
            cwd,
        })
    }

    /**
     * Detects the package manager runner.
     * @returns A promise that resolves to the command result of the runner source.
     */
    public async detectPackageManagerRunner(
        cwd: string
    ): Promise<CommandResult> {
        if (!this.packageManager) {
            await this.detectPackageManager(cwd)
        }

        const runnerSource = await this.$shell.exec$(
            `which ${this.packageManager}`
        )
        return runnerSource
    }

    /**
     * Executes package manager commands.
     * @param commands - An array of commands to execute.
     * @param options - Additional options for the command execution.
     * @returns A promise that resolves to the command result.
     */
    protected async pkg(
        options: Parameters<ShellExecutor['spawn$']>[2] = {}
    ): Promisify<CommandResult> {
        const runnerSource = await this.detectPackageManagerRunner(
            this.dynamicConfig.cwd
        )
        const source = runnerSource.stdout.split('\n')[0]

        if (!source) {
            this.$logger.error(
                `No package manager found for ${this.packageManager}`
            )
            return {
                success: false,
                error: new Error(
                    `No package manager found for ${this.packageManager}`,
                    {
                        cause: ['No package manager found'],
                    }
                ),
            }
        }
        this.$logger.info(`Using ${this.packageManager} as package manager`)
        const executed = await this.$shell.spawn$(
            source,
            this.dynamicConfig.command,
            {
                ...options,
                cwd: this.dynamicConfig.cwd,
            }
        )
        return {
            success: true,
            data: executed,
        }
    }
}
