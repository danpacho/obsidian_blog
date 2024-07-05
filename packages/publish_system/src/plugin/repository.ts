import { Logger } from '@obsidian_blogger/helpers/logger'
import { GitShell, GitShellConstructor } from '../core/git'

export interface RepositoryConstructor extends GitShellConstructor {}

export abstract class RepositoryPlugin {
    protected readonly $git: GitShell
    protected readonly $logger: Logger
    public abstract readonly name: string

    public constructor(options: RepositoryConstructor) {
        this.$git = new GitShell(options)
        this.$logger = new Logger()
    }

    public updateLoggerName(name: string): void {
        this.$logger.updateName(name)
    }

    public abstract save(saveParameters: Record<string, unknown>): Promise<void>
}
