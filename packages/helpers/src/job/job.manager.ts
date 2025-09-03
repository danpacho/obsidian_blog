import { Queue, type QueueConstructor } from '../queue'
import { Stack, type StackConstructor } from '../stack'

import { JobError } from './job.error'
/**
 * Represents a job in the job manager.
 * @template JobResponse The type of the job response.
 */
export interface Job<JobResponse = unknown> {
    /**
     * The name of the job.
     */
    jobName: string
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
 * Infer the job response from the job shape.
 */
export type InferJobResponse<JobShape> =
    JobShape extends Job<infer Res> ? Res : never

export interface JobFlowController {
    /**
     * Stops the job execution, after current job
     */
    stop: () => void
    /**
     * Resumes the job execution, after current job
     */
    resume: () => void
}

/**
 * Represents a job registration in the job manager.
 * @template JobResponse The type of the job response.
 * @template JobPrepare The type of the job preparation.
 */
export interface JobRegistration<JobResponse, JobPrepare> {
    /**
     * The unique name for the job registration.
     */
    name: string

    /**
     * Lifecycle hooks for the job registration.
     *
     * A function that is **executed before** the job starts.
     * It returns a promise that resolves to the prepared calculation and will be passed to the `execute` function.
     */
    prepare?(): Promise<JobPrepare>

    /**
     * Lifecycle hooks for the job registration.
     *
     * A function that is **executed to perform** the job.
     * @param controller An object with control methods for the job.
     * @example
     * ```typescript
     * {
     *      stop: () => void // Stops the job execution.
     *      next: () => void // Resumes the job execution.
     * }
     * ```
     * @param preparedCalculation The prepared calculation for the job. Calculated by the `prepare` function and will be passed through argument.
     * @returns A promise that resolves to the job response.
     */
    execute(
        controller: JobFlowController,
        preparedCalculation: JobPrepare | undefined
    ): Promise<JobResponse>

    /**
     * Lifecycle hooks for the job registration.
     *
     * A function that is **executed after** the **Each** job completes.
     * @param job The completed job.
     * @returns A promise that resolves when the after-job tasks are completed.
     */
    cleanup?(job: Job<JobResponse>): Promise<void>
}

export type TypedJob<JobTuple> = JobTuple extends readonly [
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

/**
 * Job subscriber function.
 */
export type JobSubscriber<CurrJob extends Job> = (
    /**
     * The current job.
     */
    currentJob: CurrJob,
    /**
     * The current job index.
     */
    currentJobIndex: number,
    /**
     * The job history.
     */
    history: Stack<Job>['stack']
) => unknown | Promise<unknown>

export type JobRegistrationShape = JobRegistration<any, any>

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
export class JobManager<JobResponse = unknown, JobPrepare = unknown> {
    private readonly $history: Stack<Job<JobResponse>>
    private readonly $jobQueue: Queue<JobRegistration<JobResponse, JobPrepare>>

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
     * Calculates the `success` status of a job.
     * @param jobResponse result job response
     */
    protected jobSuccessStatusCalculation?(jobResponse: JobResponse): boolean

    /**
     * Gets the history of processed jobs.
     * @returns The history of processed jobs.
     */
    public get history(): Array<Job<JobResponse>> {
        return this.$history.stack
    }

    private readonly jobProgressSubscribers: Set<
        JobSubscriber<Job<JobResponse>>
    > = new Set()

    /**
     * Notifies subscribers about the progress of a job.
     * @param job - The job that has progressed.
     */
    private async notifyJobProgress(job: Job<JobResponse>): Promise<void> {
        for (const subscriber of this.jobProgressSubscribers) {
            await subscriber(job, this._jobStackIndex, this.$history.stack)
        }
    }

    /**
     * Subscribes to job progress updates.
     * @param subscriber - The callback function to be called when a job progresses.
     */
    public subscribeJobProgress(
        subscriber: JobSubscriber<Job<JobResponse>>
    ): void {
        this.jobProgressSubscribers.add(subscriber)
    }

    /**
     * Finds a job by its name.
     * @param jobId - The name of the job to find.
     * @returns The found job, or undefined if not found.
     */
    public findJob(jobName: string): Job | undefined {
        return this.$history.stack.find((job) => job.jobName === jobName)
    }

    /**
     * Registers a job for processing.
     * @param job - The job to register.
     */
    public registerJob(job: JobRegistration<JobResponse, JobPrepare>): void {
        this.$jobQueue.enqueue(job)
        this._jobCount += 1
        this._jobRemaining += 1
        this.jobPending(job.name)
    }

    /**
     * Registers multiple jobs for processing.
     * @param jobs - The jobs to register.
     */
    public registerJobs(
        jobs: Array<JobRegistration<JobResponse, JobPrepare>>
    ): void {
        jobs.forEach((job) => this.registerJob(job))
    }

    /**
     * Processes the registered jobs.
     * @param cleanupHistory - Whether to clear the job history after processing.
     */
    public async processJobs(cleanupHistory: boolean = false): Promise<void> {
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

            await this.notifyJobProgress(targetHistoryJob)
            const preparedArgs = await job.prepare?.()
            this.jobStart(targetHistoryJob)
            await this.notifyJobProgress(targetHistoryJob)
            try {
                const jobResponse: JobResponse = await job.execute(
                    processController,
                    preparedArgs
                )
                const jobSuccessStatus =
                    this?.jobSuccessStatusCalculation?.(jobResponse) ?? true

                if (jobSuccessStatus) {
                    this.jobSucceeded(targetHistoryJob, jobResponse)
                } else {
                    this.jobFailed(
                        targetHistoryJob,
                        new JobError(
                            'Job failed, job response is not valid',
                            jobResponse
                        ),
                        jobResponse
                    )
                }
                await this.notifyJobProgress(targetHistoryJob)
            } catch (error) {
                this.jobFailed(targetHistoryJob, error)
                await this.notifyJobProgress(targetHistoryJob)
            } finally {
                await job.cleanup?.(targetHistoryJob)
            }

            this._jobRemaining -= 1
            this._jobStackIndex += 1
        }

        if (cleanupHistory) this.clearHistory()

        this._jobCount = 0
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

    private jobPending(jobName: string): void {
        this.$history.push({
            jobName,
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

    private jobSucceeded(job: Job, jobResponse: JobResponse): void {
        const endDate = new Date()
        if (job) {
            job.status = 'success'
            job.endedAt = endDate
            job.response = jobResponse
            job.execTime = this.calculateExecTime(job.startedAt!, endDate)
        }
    }

    private jobFailed(job: Job, error: unknown, response?: unknown): void {
        const endDate = new Date()
        if (job) {
            job.status = 'failed'
            job.endedAt = endDate
            job.execTime = this.calculateExecTime(job.startedAt!, endDate)
            if (response) {
                job.response = response
            }
            job.error = new JobError(`@${job.jobName} failed`, error)
        }
    }
}
