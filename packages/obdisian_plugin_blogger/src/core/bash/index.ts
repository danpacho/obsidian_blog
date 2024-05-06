import { ExecException, exec } from 'node:child_process'
import { Stream } from 'node:stream'
import { Queue } from '@blogger/helpers'

interface CommandRecord {
    /**
     * The command that was executed.
     */
    command: string
    /**
     * The status of the command execution.
     * Can be either 'success' or 'failed'.
     */
    status: 'success' | 'failed'
    /**
     * The end time of the command execution.
     */
    endTime: Date
    /**
     * The start time of the command execution.
     */
    startTime: Date
    /**
     * The execution time of the command in milliseconds.
     */
    executionTime: number
    /**
     * The standard output of the command execution.
     */
    stdout?: string
    /**
     * The standard error of the command execution.
     */
    stderr?: string
}

class CommandHistory {
    private readonly queue = new Queue<CommandRecord>()

    constructor(limit: number = 100) {
        this.queue.option.maxSize = limit
    }

    public static execTime(from: Date, to: Date): number {
        return (to.getTime() - from.getTime()) / 1000
    }

    /**
     * Records a command execution in the history.
     * @param command - The command executed.
     * @param startTime - The start time of the command.
     * @param status - The status of the command (`success` or `failed`).
     */
    public record(
        commandRecord: Omit<CommandRecord, 'endTime' | 'executionTime'>
    ): void {
        const currentDate = new Date()
        this.queue.enqueue({
            ...commandRecord,
            endTime: currentDate,
            executionTime: CommandHistory.execTime(
                commandRecord.startTime,
                currentDate
            ),
        })
    }

    /**
     * Retrieves the command history as an array.
     * @returns An array of command records.
     */
    public getHistory(): CommandRecord[] {
        return this.queue.store
    }
}

export class BashExecutor {
    private startTime: number | null = null
    private commandActive: boolean = false
    private history: CommandHistory

    public constructor(historyLimit: number) {
        this.history = new CommandHistory(historyLimit)
    }

    /**
     * Executes a shell command.
     * @param command - The command to execute.
     * @returns A promise that resolves with the command output.
     */
    $(command: string): Promise<{ stdout: string; stderr: string }> {
        this.startTime = Date.now()
        this.commandActive = true

        // eslint-disable-next-line no-console
        console.log(command)

        try {
            const executionResult = new Promise<{
                stdout: string
                stderr: string
            }>((resolve, reject) => {
                exec(
                    command,
                    (
                        error: ExecException | null,
                        stdout: string,
                        stderr: string
                    ) => {
                        this.commandActive = false
                        const status = error ? 'failed' : 'success'
                        if (this.startTime) {
                            this.history.record({
                                command,
                                status,
                                startTime: new Date(this.startTime),
                                stdout,
                                stderr,
                            })
                        }
                        if (error) {
                            reject(
                                new Error(`Command failed: ${error.message}`)
                            )
                        } else {
                            resolve({ stdout, stderr })
                        }
                    }
                )
            })
            executionResult.then((e) => {
                // eslint-disable-next-line no-console
                console.log(e.stdout)
            })

            return executionResult
        } catch (e) {
            return Promise.reject(e)
        }
    }

    /**
     * Gets the elapsed time since the start of the last executed command.
     * @returns The elapsed time in seconds, or null if no command is active.
     */
    getElapsedTime(): number | null {
        if (!this.commandActive || this.startTime === null) {
            return null
        }
        return (Date.now() - this.startTime) / 1000
    }

    getElapsedTimeStream(): Promise<Stream> {
        const stream = new Stream()
        setInterval(() => {
            stream.addListener('data', () => this.getElapsedTime())
        })
        return Promise.resolve(process.stdin)
    }

    /**
     * Retrieves the command history.
     * @returns An array of command records.
     */
    getCommandHistory(): CommandRecord[] {
        return this.history.getHistory()
    }
}
