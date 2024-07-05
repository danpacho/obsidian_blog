import {
    type CommandResult,
    ShellExecutor,
    type ShellExecutorConstructor,
} from '@obsidian_blogger/helpers/shell'
import glob from 'fast-glob'

export interface GitShellConstructor extends ShellExecutorConstructor {
    gitPath: string
    cwd: string
}
export class GitShell extends ShellExecutor {
    private gitPath: string
    private cwd: string

    public constructor(options: GitShellConstructor) {
        super(options)
        this.gitPath = options.gitPath
        this.cwd = options.cwd
    }

    private async git(command: Array<string>): Promise<CommandResult> {
        return await this.spawn$(this.gitPath, command, {
            cwd: this.cwd,
        })
    }

    public async clone(
        repository: string,
        destination: string
    ): Promise<CommandResult> {
        return await this.git(['clone', repository, destination])
    }

    public async branch(branch: string): Promise<CommandResult> {
        return await this.git(['checkout', '-b', branch])
    }

    public async showBranch(): Promise<CommandResult> {
        return await this.git(['branch'])
    }

    public async pull(branch: string): Promise<CommandResult> {
        return await this.git(['pull', 'origin', branch])
    }

    public async commit(message: string): Promise<CommandResult> {
        return await this.git(['commit', '-m', `"${message}"`])
    }

    public async push(branch: string): Promise<CommandResult> {
        return await this.git(['push', 'origin', branch])
    }

    public async addSingle(file: string): Promise<CommandResult> {
        return await this.git(['add', file])
    }

    public async addByPattern(pattern: string): Promise<CommandResult> {
        const files = await glob(pattern)
        return await this.git(['add', ...files])
    }

    public async addAll(): Promise<CommandResult> {
        return await this.git(['add', '.'])
    }

    public async resetHEAD(): Promise<CommandResult> {
        return await this.git(['reset', 'HEAD'])
    }

    public async status(): Promise<CommandResult> {
        return await this.git(['status'])
    }

    public async remote(): Promise<CommandResult> {
        return await this.git(['remote', '-v'])
    }
}
