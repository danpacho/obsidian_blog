import { Queue } from '@obsidian_blogger/helpers'
import { type Logger } from '@obsidian_blogger/helpers'
import { ProcessOutput, cd, $ as zx$ } from 'zx'
// import { ShellError } from './shell.error'

type Command = string

interface ShellTraceStorageConstructor {
    logger: Logger
    maxTraceCount: number
}
export class ShellTraceStorage {
    public constructor(private readonly options: ShellTraceStorageConstructor) {
        this.storage = new Queue<{
            command: Command
            output: ProcessOutput
        }>({
            maxSize: this.options.maxTraceCount,
        })
    }

    private storage: Queue<{
        command: Command
        output: ProcessOutput
    }>

    public add(command: Command, output: ProcessOutput) {
        this.storage.enqueue({ command, output })
    }

    public get length() {
        return this.storage.size
    }

    public getLatest() {
        return this.storage.front
    }

    public search(command: Command): ProcessOutput | undefined {
        for (const trace of this.storage.store) {
            if (trace.command === command) return trace.output
        }
        return undefined
    }

    public getCommandTrace(): Array<string> {
        return Array.from(this.storage.store).map((trace) => trace.command)
    }

    public getOutputTrace(): Array<ProcessOutput> {
        return Array.from(this.storage.store).map((trace) => trace.output)
    }
}

export interface ShellScriptConstructor extends ShellTraceStorageConstructor {}
export class ShellScript {
    constructor(public readonly options: ShellScriptConstructor) {
        this.traceStorage = new ShellTraceStorage({
            ...options,
        })
    }

    private get $m() {
        return this.options.logger
    }
    public readonly traceStorage: ShellTraceStorage

    public async $(command: string): Promise<ProcessOutput> {
        try {
            const output: ProcessOutput = await zx$([
                command,
            ] as unknown as TemplateStringsArray)
            this.traceStorage.add(command, output)
            return output
        } catch (e) {
            //TODO: process shell error based on traceStorage
            if (e instanceof Error) {
                throw e
            } else {
                throw new Error('Unknown Error')
            }
        }
    }

    public logCommandHistory(): void {
        this.$m.info('Command History:')
        this.traceStorage.getCommandTrace().forEach((command) => {
            this.$m.log(`› ${this.$m.c.yellow(command)}`, {
                prefix: false,
            })
        })
    }

    public cd(path: string) {
        cd(path)
    }
}
