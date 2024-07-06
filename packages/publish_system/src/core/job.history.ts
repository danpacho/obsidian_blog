/* eslint-disable @typescript-eslint/no-explicit-any */
import { Stack } from '@obsidian_blogger/helpers/stack'

export interface Job<JobResponse = any> {
    jobId: string
    status: 'success' | 'failed' | 'pending'
    startedAt: Date
    endedAt: Date
    execTime: number
    jobResponse: JobResponse
    failedReason?: unknown
}

export interface JobRegistration<JobResponse, JobPrepare> {
    id: string
    prepare?: () => Promise<JobPrepare>
    execution: (preparedCalculation: JobPrepare) => Promise<JobResponse>
    cleanUp?: (job: Job<JobResponse>) => Promise<void>
}

type DefaultJob = JobRegistration<any, any>

type TypedJob<JobTuple> = JobTuple extends readonly [
    infer FirstJob,
    ...infer RestJobs,
]
    ? FirstJob extends JobRegistration<infer Res, infer Prepare>
        ? readonly [
              JobRegistration<Res, Prepare>,
              ...TypedJob<
                  RestJobs extends ReadonlyArray<DefaultJob> ? RestJobs : never
              >,
          ]
        : never
    : JobTuple

export class JobHistory {
    private readonly _history: Stack<Job> = new Stack({ maxSize: 1000 })

    public get history(): Stack<Job>['stack'] {
        return this._history.stack
    }

    public find(jobId: string): Job | undefined {
        return this._history.stack.find((job) => job.jobId === jobId)
    }

    public async registerJobs<const Jobs extends ReadonlyArray<DefaultJob>>(
        jobs: TypedJob<Jobs>
    ): Promise<void> {
        for (const job of jobs) {
            const prepared = await job.prepare?.()

            this.start(job.id)
            try {
                const jobResponse = await job.execution(prepared)
                this.success(jobResponse)
            } catch (error) {
                this.failed(error)
            } finally {
                await job.cleanUp?.(this._history.top!)
            }
        }

        return
    }

    private start(jobId: string): void {
        this._history.push({
            jobId,
            status: 'pending',
            startedAt: new Date(),
            endedAt: new Date(),
            jobResponse: undefined,
            execTime: 0,
        })
    }

    private calculateExecTime(startedAt: Date, endedAt: Date): number {
        return endedAt.getTime() - startedAt.getTime()
    }

    private success(jobResponse: unknown): void {
        const job = this._history.top
        const endDate = new Date()
        if (job) {
            job.status = 'success'
            job.endedAt = endDate
            job.jobResponse = jobResponse
            job.execTime = this.calculateExecTime(job.startedAt, endDate)
        }
    }

    private failed(failedReason: unknown): void {
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
