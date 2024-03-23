/* eslint-disable @typescript-eslint/ban-types */
import { ProcessOutput } from 'zx'
import { ShellScript, ShellScriptConstructor } from './shell.script'

interface GitShellConstructor extends ShellScriptConstructor {}
export class GitShell extends ShellScript {
    public constructor(options: GitShellConstructor) {
        super(options)
    }

    public async clone(
        repository: string,
        destination: string
    ): Promise<ProcessOutput> {
        const command = `git clone ${repository} ${destination}`
        return await this.$(command)
    }

    public async pull(branch: string): Promise<ProcessOutput> {
        const command = `git pull origin ${branch}`
        return await this.$(command)
    }

    public async commit(message: string): Promise<ProcessOutput> {
        const command = `git commit -m "${message}"`
        return await this.$(command)
    }

    public async push(branch: string): Promise<ProcessOutput> {
        const command = `git push origin ${branch}`
        return await this.$(command)
    }

    public async add(file: string): Promise<ProcessOutput> {
        const command = `git add ${file}`
        return await this.$(command)
    }

    public async addAll(): Promise<ProcessOutput> {
        const command = `git add .`
        return await this.$(command)
    }

    public status(): Promise<ProcessOutput> {
        const command = `git status`
        return this.$(command)
    }
}
