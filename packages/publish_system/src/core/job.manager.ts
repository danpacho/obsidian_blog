import { Queue, type QueueConstructor } from '@obsidian_blogger/helpers/queue'
import { Stack, type StackConstructor } from '@obsidian_blogger/helpers/stack'

/**
 * Represents an error that occurred during job execution.
 * @template OriginJob The type of the job that caused the error.
 */
export class JobError<OriginJob extends Job> extends Error {
    /**
     * Creates a new instance of JobError.
     * @param message The error message.
     * @param job The job that caused the error.
     * @param error The cause of the error.
     */
    constructor(
        message: string,
        public readonly job: OriginJob,
        public readonly error: unknown
    ) {
        super(message)
        this.name = 'JobError'
        this.job = job
    }

    /**
     * Returns a string representation of the JobError.
     * @returns The string representation of the JobError.
     */
    public override toString(): string {
        return `${this.name}: ${this.message}`
    }

    /**
     * Is the value an instance of JobError.
     */
    public static IsJobError(value: unknown): value is JobError<Job> {
        return value instanceof JobError
    }
}

/**
 * Represents a job in the job manager.
 * @template JobResponse The type of the job response.
 */
export interface Job<JobResponse = unknown> {
    /**
     * The ID of the job.
     */
    jobId: string
    /**
     * The status of the job.
     * Possible values: `success`, `failed`, `started`, `pending`.
     */
    status: 'success' | 'failed' | 'started' | 'pending'
    /**
     * The start time of the job.
     */
    startedAt?: Date
    /**
     * The end time of the job.
     */
    endedAt?: Date
    /**
     * The execution time of the job in milliseconds.
     */
    execTime?: number
    /**
     * The response of the job.
     */
    response?: JobResponse
    /**
     * The reason for job failure (optional).
     */
    error?: JobError<Job<JobResponse>>
}

/**
 * Represents a job registration in the job manager.
 * @template JobResponse The type of the job response.
 * @template JobPrepare The type of the job preparation.
 */
export interface JobRegistration<JobResponse, JobPrepare> {
    /**
     * The unique identifier for the job registration.
     */
    id: string

    /**
     * A function that is executed before the job starts.
     * It returns a promise that resolves to the prepared calculation and will be passed to the `execute` function.
     */
    before?: () => Promise<JobPrepare>

    /**
     * A function that is executed to perform the job.
     * @param controller An object with control methods for the job.
     * @example
     * ```typescript
     * {
     *      stop: () => void // Stops the job execution.
     *      next: () => void // Resumes the job execution.
     * }
     * ```
     * @param preparedCalculation The prepared calculation for the job. Calculated by the `before` function and will be passed through argument.
     * @returns A promise that resolves to the job response.
     */
    execute: (
        controller: {
            /**
             * Stops the job execution, after current job
             */
            stop: () => void
            /**
             * Resumes the job execution, after current job
             */
            resume: () => void
        },
        preparedCalculation: JobPrepare
    ) => Promise<JobResponse>

    /**
     * A function that is executed after the job completes.
     * @param job The completed job.
     * @returns A promise that resolves when the after-job tasks are completed.
     */
    after?: (job: Job<JobResponse>) => Promise<void>
}

type TypedJob<JobTuple> = JobTuple extends readonly [
    infer FirstJob,
    ...infer RestJobs,
]
    ? FirstJob extends JobRegistration<infer Res, infer Prepare>
        ? readonly [
              JobRegistration<Res, Prepare>,
              ...TypedJob<
                  RestJobs extends ReadonlyArray<JobRegistrationShape>
                      ? RestJobs
                      : never
              >,
          ]
        : never
    : JobTuple

type JobSubscriber = (
    currentJob: Job,
    currentJobIndex: number,
    history: Stack<Job>['stack']
) => unknown

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JobRegistrationShape = JobRegistration<any, any>

export interface JobManagerConstructor {
    /**
     * Options for the job history. `Stack` options.
     */
    history?: StackConstructor
    /**
     * Options for the job queue. `Queue` options.
     */
    jobQueue?: QueueConstructor
}
/**
 * Represents a job manager that manages the execution of jobs.
 */
export class JobManager {
    private readonly _history: Stack<Job>
    private readonly _jobQueue: Queue<JobRegistrationShape>

    private _jobCount: number = 0
    private _jobRemaining: number = 0
    private _jobStackIndex: number = 0

    public constructor(
        public readonly options: JobManagerConstructor = {
            history: {
                maxSize: 1000,
            },
            jobQueue: {
                maxSize: 1000,
            },
        }
    ) {
        this._history = new Stack(options.history)
        this._jobQueue = new Queue(options.jobQueue)
    }

    /**
     * Gets the current status of the job processor.
     * @returns The status of the job processor, which can be either `idle` or `processing`
     */
    public get status(): 'idle' | 'processing' {
        return this._jobCount === this._jobRemaining ? 'idle' : 'processing'
    }

    /**
     * Gets information about the current job processing.
     * @returns An object containing the status, job count, and job remaining.
     */
    public get processInformation(): {
        status: 'idle' | 'processing'
        jobCount: number
        jobRemaining: number
    } {
        return {
            status: this.status,
            jobCount: this._jobCount,
            jobRemaining: this._jobRemaining,
        }
    }

    /**
     * Gets the report of processed jobs.
     * @returns An array of processed jobs.
     */
    public get processReport(): Array<Job> {
        return this._history.stack
    }

    /**
     * Gets the history of processed jobs.
     * @returns The history of processed jobs.
     */
    public get history(): Stack<Job>['stack'] {
        return structuredClone(this._history.stack)
    }

    private readonly jobProgressSubscribers: Set<JobSubscriber> = new Set()

    /**
     * Notifies subscribers about the progress of a job.
     * @param job - The job that has progressed.
     */
    private notifyJobProgress(job: Job): void {
        this.jobProgressSubscribers.forEach((subscriber) => {
            subscriber(job, this._jobStackIndex, this._history.stack)
        })
    }

    /**
     * Subscribes to job progress updates.
     * @param subscriber - The callback function to be called when a job progresses.
     */
    public subscribeJobProgress(subscriber: JobSubscriber): void {
        this.jobProgressSubscribers.add(subscriber)
    }

    /**
     * Finds a job by its ID.
     * @param jobId - The ID of the job to find.
     * @returns The found job, or undefined if not found.
     */
    public find(jobId: string): Job | undefined {
        return this._history.stack.find((job) => job.jobId === jobId)
    }

    /**
     * Registers a job for processing.
     * @param job - The job to register.
     */
    public registerJob<const Job extends JobRegistrationShape>(job: Job): void {
        this._jobQueue.enqueue(job)
        this._jobCount += 1
        this._jobRemaining += 1
        this.jobPending(job.id)
    }

    /**
     * Registers multiple jobs for processing.
     * @param jobs - The jobs to register.
     */
    public registerJobs<const JobTuple extends readonly JobRegistrationShape[]>(
        jobs: TypedJob<JobTuple>
    ): void {
        jobs.forEach((job) => this.registerJob(job))
    }

    /**
     * Processes the registered jobs.
     * @param cleanupHistory - Whether to clear the job history after processing.
     * @returns A promise that resolves to true if all jobs were processed successfully, or false otherwise.
     */
    public async processJobs(
        cleanupHistory: boolean = false
    ): Promise<boolean> {
        let success = false
        let stop = false

        const processController: Parameters<
            JobRegistrationShape['execute']
        >[0] = {
            stop: () => {
                stop = true
            },
            resume: () => {
                stop = false
            },
        }

        while (this._jobQueue.size > 0 && !stop) {
            if (stop) break

            const job = this._jobQueue.dequeue()!
            const targetHistoryJob = this._history.stack[this._jobStackIndex]!
            const preparedArgs = await job.before?.()

            this.jobStart(targetHistoryJob)

            try {
                const jobResponse = await job.execute(
                    processController,
                    preparedArgs
                )
                this.jobSucceeded(targetHistoryJob, jobResponse)
            } catch (error) {
                this.jobFailed(targetHistoryJob, error)
            } finally {
                await job.after?.(this._history.top!)
            }

            this.notifyJobProgress(targetHistoryJob)

            this._jobRemaining -= 1
            this._jobStackIndex += 1
        }

        if (cleanupHistory) this.clearHistory()

        success = true

        this._jobCount = 0

        return success
    }

    /**
     * Clears the job history.
     */
    public clearHistory(): void {
        this._history.clear()
    }

    private calculateExecTime(startedAt: Date, endedAt: Date): number {
        return endedAt.getTime() - startedAt.getTime()
    }

    private jobPending(jobId: string): void {
        this._history.push({
            jobId,
            status: 'pending',
        })
    }

    private jobStart(job: Job): void {
        const startDate = new Date()
        if (job) {
            job.status = 'started'
            job.startedAt = startDate
        }
    }

    private jobSucceeded(job: Job, jobResponse: unknown): void {
        const endDate = new Date()
        if (job) {
            job.status = 'success'
            job.endedAt = endDate
            job.response = jobResponse
            job.execTime = this.calculateExecTime(job.startedAt!, endDate)
        }
    }

    private jobFailed(job: Job, error: unknown): void {
        const endDate = new Date()
        if (job) {
            job.status = 'failed'
            job.endedAt = endDate
            job.execTime = this.calculateExecTime(job.startedAt!, endDate)
            job.error = new JobError(`@${job.jobId} failed`, job, error)
        }
    }
}