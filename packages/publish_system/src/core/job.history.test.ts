import { beforeEach, describe, expect, it } from 'vitest'
import { Job, JobHistory } from './job.history'

describe('JobHistory', () => {
    let executionHistory: JobHistory

    beforeEach(() => {
        executionHistory = new JobHistory()
    })

    it('should append jobs and update history', async () => {
        await executionHistory.registerJobs([
            {
                id: 'job1',
                execution: async () => {
                    return 'Job 1 response'
                },
            },
            {
                id: 'job2',
                execution: async () => {
                    return 'Job 2 response'
                },
            },
        ])

        expect(executionHistory.history.length).toBe(2)

        const job1 = executionHistory.find('job1')
        expect(job1?.status).toBe('success')
        expect(job1?.jobResponse).toBe('Job 1 response')

        const job2 = executionHistory.find('job2')
        expect(job2?.status).toBe('success')
        expect(job2?.jobResponse).toBe('Job 2 response')
    })

    it('should handle failed jobs', async () => {
        await executionHistory.registerJobs([
            {
                id: 'job1',
                execution: async () => {
                    await new Promise((resolve) => setTimeout(resolve, 100))
                    throw new Error('Job 1 failed')
                },
            },
            {
                id: 'job2',
                execution: async () => {
                    return 'Job 2 response'
                },
            },
        ])

        expect(executionHistory.history.length).toBe(2)

        const job1 = executionHistory.find('job1')
        expect(job1?.status).toBe('failed')
        expect(job1?.jobResponse).toBeUndefined()

        const job2 = executionHistory.find('job2')
        expect(job2?.status).toBe('success')
        expect(job2?.jobResponse).toBe('Job 2 response')
    })

    it('should handle job [ prepare -> execution -> cleanUp ]', async () => {
        await executionHistory.registerJobs([
            {
                id: 'JOB process',
                prepare: async () => {
                    return {
                        prepare: 'Job 1 prepare',
                    }
                },
                execution: async ({ prepare }: { prepare: string }) => {
                    await new Promise((resolve) => setTimeout(resolve, 100))
                    return {
                        response: 'Job 1 response',
                        prepare,
                    }
                },
                cleanUp: async (
                    job: Job<{
                        response: string
                        prepare: string
                    }>
                ) => {
                    expect(job.jobResponse.prepare).toBe('Job 1 prepare')
                    expect(job.jobResponse.response).toBe('Job 1 response')
                },
            },
        ])
    })
})
