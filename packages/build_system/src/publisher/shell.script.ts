import { type Logger } from '@blogger/logger'
import { ProcessOutput, $ as zx$ } from 'zx'
import { Queue } from '../utils/queue'
// import { ShellError } from './shell.error'

type Command = string

interface ShellTraceStorageConstructor {
    logger: Logger
    maxTraceCount: number
}
class ShellTraceStorage {
    public constructor(private readonly options: ShellTraceStorageConstructor) {
        this.storage = new Queue<{
            command: Command
            output: ProcessOutput
        }>({
            size: this.options.maxTraceCount,
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
        return this.storage.length
    }

    public getLatest() {
        return this.storage.getTop()
    }

    public search(command: Command): ProcessOutput | undefined {
        for (const trace of this.storage.queue.values()) {
            if (trace.command === command) return trace.output
        }
        return undefined
    }

    public getCommandTrace(): Array<string> {
        return Array.from(this.storage.queue.values()).map(
            (trace) => trace.command
        )
    }

    public getOutputTrace(): Array<ProcessOutput> {
        return Array.from(this.storage.queue.values()).map(
            (trace) => trace.output
        )
    }
}

interface ShellScriptConstructor extends ShellTraceStorageConstructor {}
export class ShellScript {
    constructor(public readonly options: ShellScriptConstructor) {
        this.traceStorage = new ShellTraceStorage({
            ...options,
        })
    }

    public readonly traceStorage: ShellTraceStorage

    public async $(
        commands: TemplateStringsArray,
        ...expressions: Array<string>
    ): Promise<ProcessOutput> {
        try {
            const output: ProcessOutput = await zx$(commands, ...expressions)
            this.traceStorage.add(commands.join(' '), output)
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
}
