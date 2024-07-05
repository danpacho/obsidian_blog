import { Logger } from '@obsidian_blogger/helpers/logger'
import { Promisify } from '@obsidian_blogger/helpers/promisify'
import {
    CommandResult,
    ShellExecutor,
    ShellExecutorConstructor,
} from '@obsidian_blogger/helpers/shell'
import { PM, detect } from 'detect-package-manager'

export interface SiteBuilderPluginConstructor extends ShellExecutorConstructor {
    cwd: string
}
export abstract class SiteBuilderPlugin {
    protected $logger: Logger
    protected $shell: ShellExecutor
    public readonly cwd: string

    public packageManager: PM | null = null

    public constructor(options: SiteBuilderPluginConstructor) {
        this.$shell = new ShellExecutor(
            options.historyLimit
                ? {
                      historyLimit: options.historyLimit,
                  }
                : {}
        )
        this.cwd = options.cwd
        this.$logger = new Logger()
    }

    public updateLoggerName(name: string): void {
        this.$logger.updateName(name)
    }

    public async detectPackageManager(): Promise<void> {
        this.packageManager = await detect({
            cwd: this.cwd,
        })
    }

    private async detectPackageManagerRunner(): Promise<CommandResult> {
        if (!this.packageManager) {
            await this.detectPackageManager()
        }

        const runnerSource = await this.$shell.exec$(
            `which ${this.packageManager}`
        )
        return runnerSource
    }

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

    public abstract build(
        buildParameters: Record<string, unknown>
    ): Promise<void>
}
