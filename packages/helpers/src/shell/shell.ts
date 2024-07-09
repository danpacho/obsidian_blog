import {
    ChildProcess,
    ExecException,
    SpawnOptions,
    exec,
    spawn,
} from 'node:child_process'
import { platform } from 'node:os'
import { Readable } from 'node:stream'
import { Queue } from '../queue'

export interface CommandHistoryRecord extends CommandResult {
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
}

export interface CommandResult {
    /**
     * The standard output of the command execution.
     */
    stdout: string
    /**
     * The standard error of the command execution.
     */
    stderr: string
    /**
     * The command that was executed.
     */
    command: string

    /**
     * The error code of the command execution.
     */
    error_code?: number
}

interface CommandHistoryConstructor {
    /**
     * The maximum number of commands to store in the history.
     */
    historyLimit?: number
}
class CommandHistory {
    private readonly queue = new Queue<CommandHistoryRecord>()

    public constructor({
        historyLimit: limit = 100,
    }: CommandHistoryConstructor = {}) {
        this.queue.updateQueueOption({ maxSize: limit })
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
        commandRecord: Omit<CommandHistoryRecord, 'endTime' | 'executionTime'>
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
    public getHistory(): Array<CommandHistoryRecord> {
        return this.queue.store
    }
}

export interface ShellExecutorConstructor extends CommandHistoryConstructor {}

export class ShellExecutor {
    private startTime: number | null = null
    private commandActive: boolean = false
    private history: CommandHistory

    public constructor({ historyLimit = 100 }: ShellExecutorConstructor = {}) {
        if (historyLimit <= 0) {
            throw new Error('History limit must be greater than 0.')
        }
        this.history = new CommandHistory({ historyLimit })
    }

    /**
     * Gets the platform of the current shell execution system.
     */
    public get platform() {
        return platform()
    }

    /**
     * Executes a shell command.
     * @param command - The command to execute.
     * @returns A promise that resolves with the command output.
     */
    public exec$(
        command: string,
        log: boolean = false
    ): Promise<CommandResult> {
        this.startTime = Date.now()
        this.commandActive = true

        // eslint-disable-next-line no-console
        if (log) console.log(command)

        try {
            const executionResult = new Promise<CommandResult>(
                (resolve, reject) => {
                    exec(
                        command,
                        (
                            error: ExecException | null,
                            stdout: string,
                            stderr: string
                        ) => {
                            stdout = stdout.trim()
                            if (stdout.endsWith('\n'))
                                stdout = stdout.slice(0, -1)

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
                                    new Error(
                                        `Command failed: ${error.message}`
                                    )
                                )
                            } else {
                                resolve({
                                    stdout: stdout,
                                    stderr: stderr,
                                    command,
                                })
                            }
                        }
                    )
                }
            )
            executionResult.then((e) => {
                // eslint-disable-next-line no-console
                if (log) console.log(e.stderr)
            })

            return executionResult
        } catch (e) {
            return Promise.reject(e)
        }
    }

    /**
     * Executes a shell command using the spawn method.
     * @param spawnOrigin Spawn origin, e.g) `node` -> which node, ...
     * @param cmdList Command arguments.
     * @param spawnOptions Command options.
     * 
     * @example
     * ```ts
     *  //!WARN: PATH's should be bin executable path
     *  const nodeRoot = '/{NODE}/bin'
     *  const nodePath =
            `${nodeRoot}/node`
        const npxPath =
            `${nodeRoot}/npx`

        await bash.$spawn(nodePath, [
            npxPath,
            'create-next-app@latest',
            '{SAVE_PATH}',
            // pass other cli options
            '--use-npm',
            '--ts',
            '--tailwind',
            '--app',
            '--src-dir',
            '--import-alias="@/*"',
            '--eslint',
        ],{
            env: {
                //! WARN PATH env should be specified
                PATH: `${process.env.PATH}:${nodeRoot}`,
            }
        })
     * ```
     */
    public spawn$(
        spawnOrigin: string,
        cmdList: string[] = [],
        spawnOptions: SpawnOptions = {},
        handler?: {
            /**
             * @param data The result msg Buffer of the command.
             */
            onData?: (data: Buffer) => void
            /**
             * @param err The error msg Buffer of the command.
             */
            onError?: (err: Buffer) => void
            /**
             * @param code The success code of the command. e.g) 0 => success, 1 => failed
             */
            onClose?: (code: number) => void
        }
    ): Promise<CommandResult> {
        this.startTime = Date.now()
        this.commandActive = true
        const command: string = `${spawnOrigin} ${cmdList.join(' ')}`

        return new Promise((resolve, reject) => {
            let stdout: string = ''
            let stderr: string = ''
            let isError: boolean = false

            const childProcess: ChildProcess = spawn(spawnOrigin, cmdList, {
                ...spawnOptions,
                shell: true,
                env: {
                    ...process.env,
                    ...(spawnOptions.env ?? {}),
                },
            })

            childProcess.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString()
                if (handler?.onData) handler.onData(data)
            })

            childProcess.stderr?.on('data', (err: Buffer) => {
                stderr += err.toString()
                if (handler?.onError) handler.onError(err)
            })

            childProcess.on('close', (error_code: number) => {
                if (error_code === 0) {
                    stdout = stdout.trim()
                    if (stdout.endsWith('\n')) stdout = stdout.slice(0, -1)

                    resolve({
                        stdout,
                        stderr,
                        command,
                    })
                } else {
                    reject({
                        error_code,
                        stderr,
                        command,
                    })
                }
                if (handler?.onClose) handler.onClose(error_code)
            })

            childProcess.on('error', (err: Error) => {
                isError = true
                reject({
                    error_code: -1,
                    stderr: err.message,
                    command,
                })
            })

            this.commandActive = false
            if (this.startTime) {
                this.history.record({
                    command,
                    status: isError ? 'failed' : 'success',
                    startTime: new Date(this.startTime),
                    stdout,
                    stderr,
                })
            }
        })
    }

    /**
     * Gets the elapsed time since the start of the last executed command.
     * @returns The elapsed time in seconds, or null if no command is active.
     */
    public getElapsedTime(): number | null {
        if (!this.commandActive || this.startTime === null) {
            return null
        }
        return (Date.now() - this.startTime) / 1000
    }

    /**
     * Retrieves a stream that emits the elapsed time since the start of the last executed command.
     * @param interval Checking interval in milliseconds.
     * @example
     * ```ts
     * const elapsedTimeStream = bash.getElapsedTimeStream(100)
     * elapsedTimeStream.on('data', (data) => {
     *    console.log(data)
     * })
     * ```
     */
    public getElapsedTimeStream(interval: number = 100): Readable {
        const elapsedTimeStream = new Readable({
            read() {},
            destroy(err, callback) {
                clearInterval(streamIntervale)
                callback(null)
            },
        })

        const streamIntervale = setInterval(() => {
            const elapsedTime = this.getElapsedTime()
            if (!elapsedTimeStream.push(`${elapsedTime}\n`)) {
                clearInterval(streamIntervale)
                elapsedTimeStream.push(null)
            }
        }, interval)

        return elapsedTimeStream
    }

    /**
     * Retrieves the command history.
     * @returns An array of command records.
     */
    public getCommandHistory(): CommandHistoryRecord[] {
        return this.history.getHistory()
    }
}
