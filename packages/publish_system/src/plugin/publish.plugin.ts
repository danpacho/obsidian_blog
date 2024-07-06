import { IO } from '@obsidian_blogger/helpers/io'
import {
    Logger,
    type LoggerConstructor,
} from '@obsidian_blogger/helpers/logger'
import {
    ShellExecutor,
    type ShellExecutorConstructor,
} from '@obsidian_blogger/helpers/shell'
import { JobManager, type JobManagerConstructor } from '../core/job.manager'

export interface PublishPluginConstructor {
    /**
     * The name of the plugin
     */
    name: string
    /**
     * The current working directory of the plugin
     */
    cwd: string
    /**
     * Shell executor options
     */
    shell?: ShellExecutorConstructor
    /**
     * Job manager options
     */
    jobManager?: JobManagerConstructor
    /**
     * Logger options
     */
    logger?: LoggerConstructor
}

/**
 * Represents an abstract class for a publish plugin.
 */
export abstract class PublishPlugin {
    protected readonly $logger: Logger
    protected readonly $jobManager: JobManager
    protected readonly $shell: ShellExecutor
    protected readonly $io: IO
    /**
     * The name of the plugin.
     */
    public readonly name: string
    /**
     * The current working directory of the plugin.
     */
    public readonly cwd: string

    /**
     * Creates a new instance of the PublishPlugin class.
     * @param options - The options for the plugin.
     */
    public constructor(options: PublishPluginConstructor) {
        this.name = options.name
        this.cwd = options.cwd

        this.$io = new IO()
        this.$logger = new Logger(options.logger)
        this.$jobManager = new JobManager(options.jobManager)
        this.$shell = new ShellExecutor(options.shell)
    }

    /**
     * Gets the history of job executions.
     * @returns An array of job history.
     */
    public history() {
        return this.$jobManager.history
    }

    /**
     * Updates the name of the logger.
     * @param name - The new name for the logger.
     */
    public updateLoggerName(name: string): void {
        this.$logger.updateName(name)
    }
}
