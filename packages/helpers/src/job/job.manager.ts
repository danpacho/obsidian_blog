import { Queue, type QueueConstructor } from '../queue'
import { Stack, type StackConstructor } from '../stack'
import { JobError } from './job.error'
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
    error?: JobError
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
    private readonly $history: Stack<Job>
    private readonly $jobQueue: Queue<JobRegistrationShape>

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
        this.$history = new Stack(options.history)
        this.$jobQueue = new Queue(options.jobQueue)
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
     * Gets the history of processed jobs.
     * @returns The history of processed jobs.
     */
    public get history(): Array<Job> {
        return this.$history.stack
    }

    private readonly jobProgressSubscribers: Set<JobSubscriber> = new Set()

    /**
     * Notifies subscribers about the progress of a job.
     * @param job - The job that has progressed.
     */
    private notifyJobProgress(job: Job): void {
        this.jobProgressSubscribers.forEach((subscriber) => {
            subscriber(job, this._jobStackIndex, this.$history.stack)
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
    public findJob(jobId: string): Job | undefined {
        return this.$history.stack.find((job) => job.jobId === jobId)
    }

    /**
     * Registers a job for processing.
     * @param job - The job to register.
     */
    public registerJob<const Job extends JobRegistrationShape>(job: Job): void {
        this.$jobQueue.enqueue(job)
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

        while (this.$jobQueue.size > 0 && !stop) {
            if (stop) break

            const job = this.$jobQueue.dequeue()!
            const targetHistoryJob = this.$history.stack[this._jobStackIndex]!
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
                await job.after?.(targetHistoryJob)
            }

            this.notifyJobProgress(targetHistoryJob)

            this._jobRemaining -= 1
            this._jobStackIndex += 1
        }

        if (cleanupHistory) this.clearHistory()

        this._jobCount = 0

        const jobExecResult = this.history.every(
            ({ status }) => status === 'success'
        )
        return jobExecResult
    }

    /**
     * Clears the job history.
     */
    public clearHistory(): void {
        this.$history.clear()
    }

    private calculateExecTime(startedAt: Date, endedAt: Date): number {
        return endedAt.getTime() - startedAt.getTime()
    }

    private jobPending(jobId: string): void {
        this.$history.push({
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
            job.error = new JobError(`@${job.jobId} failed`, error)
        }
    }
}
