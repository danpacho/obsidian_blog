import { Logger } from '@obsidian_blogger/helpers/logger'
import { JobProcessor } from '../core/job.manager'

export interface PublishPluginConstructor {
    /**
     * The name of the plugin
     */
    name: string
    /**
     * The current working directory of the plugin
     */
    cwd: string
}

/**
 * Represents an abstract class for a publish plugin.
 */
export abstract class PublishPlugin {
    protected readonly $logger: Logger
    public readonly $jobManager: JobProcessor

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

        this.$logger = new Logger()
        this.$jobManager = new JobProcessor()
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
