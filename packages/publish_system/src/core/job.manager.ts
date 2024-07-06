/* eslint-disable @typescript-eslint/no-explicit-any */
import { Queue } from '@obsidian_blogger/helpers/queue'
import { Stack } from '@obsidian_blogger/helpers/stack'

/**
 * Represents a job in the job manager.
 * @template JobResponse The type of the job response.
 */
export interface Job<JobResponse = any> {
    /**
     * The ID of the job.
     */
    jobId: string
    /**
     * The status of the job.
     * Possible values: `success`, `failed`, `pending`.
     */
    status: 'success' | 'failed' | 'pending'
    /**
     * The start time of the job.
     */
    startedAt: Date
    /**
     * The end time of the job.
     */
    endedAt: Date
    /**
     * The execution time of the job in milliseconds.
     */
    execTime: number
    /**
     * The response of the job.
     */
    jobResponse: JobResponse
    /**
     * The reason for job failure (optional).
     */
    failedReason?: unknown
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
            stop: () => void
            next: () => void
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

type JobRegistrationShape = JobRegistration<any, any>

/**
 * Represents a job processor that manages the execution of jobs.
 */
export class JobProcessor {
    private readonly _history: Stack<Job> = new Stack()
    private readonly _jobQueue: Queue<JobRegistrationShape> = new Queue()

    /**
     * Gets the current status of the job processor.
     * @returns The status of the job processor, which can be either 'idle' or 'processing'.
     */
    public get status(): 'idle' | 'processing' {
        return this._jobCount === this._jobRemaining ? 'idle' : 'processing'
    }

    private _jobCount: number = 0
    private _jobRemaining: number = 0

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

    private readonly jobProgressSubscribers: Set<(job: Job) => unknown> =
        new Set()

    /**
     * Notifies subscribers about the progress of a job.
     * @param job - The job that has progressed.
     */
    private notifyJobProgress(job: Job): void {
        this.jobProgressSubscribers.forEach((subscriber) => {
            subscriber(job)
        })
    }

    /**
     * Subscribes to job progress updates.
     * @param subscriber - The callback function to be called when a job progresses.
     */
    public subscribeJobProgress(subscriber: (job: Job) => unknown): void {
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

        const processController = {
            stop: () => {
                stop = true
            },
            next: () => {
                stop = false
            },
        }

        while (this._jobQueue.size > 0 && !stop) {
            if (stop) break

            const job = this._jobQueue.dequeue()!
            const preparedArgs = await job.before?.()

            this.jobStart(job.id)
            try {
                const jobResponse = await job.execute(
                    processController,
                    preparedArgs
                )
                this.jobSucceeded(jobResponse)
            } catch (error) {
                this.jobFailed(error)
            } finally {
                await job.after?.(this._history.top!)
            }

            this._jobRemaining -= 1
            this.notifyJobProgress(this._history.top!)
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

    private jobStart(jobId: string): void {
        this._history.push({
            jobId,
            status: 'pending',
            startedAt: new Date(),
            endedAt: new Date(),
            jobResponse: undefined,
            execTime: 0,
        })
    }

    private jobSucceeded(jobResponse: unknown): void {
        const job = this._history.top
        const endDate = new Date()
        if (job) {
            job.status = 'success'
            job.endedAt = endDate
            job.jobResponse = jobResponse
            job.execTime = this.calculateExecTime(job.startedAt, endDate)
        }
    }

    private jobFailed(failedReason: unknown): void {
        const job = this._history.top
        const endDate = new Date()
        if (job) {
            job.status = 'failed'
            job.endedAt = endDate
            job.execTime = this.calculateExecTime(job.startedAt, endDate)
            job.failedReason = failedReason
        }
    }
}
