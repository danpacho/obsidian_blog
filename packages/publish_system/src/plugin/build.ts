import { Promisify } from '@obsidian_blogger/helpers/promisify'
import {
    CommandResult,
    ShellExecutor,
    ShellExecutorConstructor,
} from '@obsidian_blogger/helpers/shell'
import { PM, detect } from 'detect-package-manager'
import { PublishPlugin, PublishPluginConstructor } from './publish.plugin'

export interface BuildScriptConstructor
    extends PublishPluginConstructor,
        ShellExecutorConstructor {}
/**
 * Abstract class representing a build script plugin
 * Extends the `PublishPlugin` class.
 */
export abstract class BuildScriptPlugin extends PublishPlugin {
    public packageManager: PM | null = null

    /**
     * Creates an instance of the `SiteBuilderPlugin` class.
     * @param options - The options for the plugin.
     */
    public constructor(options: BuildScriptConstructor) {
        super(options)
    }

    /**
     * Detects the package manager used in the project.
     * Sets the `packageManager` property accordingly.
     */
    public async detectPackageManager(): Promise<void> {
        this.packageManager = await detect({
            cwd: this.cwd,
        })
    }

    /**
     * Detects the package manager runner.
     * @returns A promise that resolves to the command result of the runner source.
     */
    private async detectPackageManagerRunner(): Promise<CommandResult> {
        if (!this.packageManager) {
            await this.detectPackageManager()
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
        commands: Array<string>,
        options: Parameters<ShellExecutor['spawn$']>[2] = {}
    ): Promisify<CommandResult> {
        const runnerSource = await this.detectPackageManagerRunner()
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

        const executed = await this.$shell.spawn$(source, commands, {
            ...options,
            cwd: this.cwd,
        })
        return {
            success: true,
            data: executed,
        }
    }

    /**
     * Building the site.
     * @param buildParameters - The parameters for the build.
     * @returns A promise that resolves to the result of the build.
     */
    public abstract build(
        buildParameters: Record<string, unknown>
    ): Promise<unknown>
}
