import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Job, JobManager } from './job.manager'

describe('JobManager', () => {
    let jobManager: JobManager

    beforeEach(() => {
        jobManager = new JobManager()
    })

    it('should append jobs and update history', async () => {
        jobManager.registerJob({
            id: 'job1',
            execute: async () => {
                return 'Job 1 response'
            },
        })
        jobManager.registerJob({
            id: 'job2',
            execute: async () => {
                return 'Job 2 response'
            },
        })
        await jobManager.processJobs()

        expect(jobManager.history.length).toBe(2)

        const job1 = jobManager.find('job1')
        expect(job1?.status).toBe('success')
        expect(job1?.jobResponse).toBe('Job 1 response')

        const job2 = jobManager.find('job2')
        expect(job2?.status).toBe('success')
        expect(job2?.jobResponse).toBe('Job 2 response')
    })

    it('should handle failed jobs', async () => {
        jobManager.registerJob({
            id: 'job1',
            execute: async () => {
                await new Promise((resolve) => setTimeout(resolve, 100))
                throw new Error('Job 1 failed')
            },
        })
        jobManager.registerJob({
            id: 'job2',
            execute: async () => {
                return 'Job 2 response'
            },
        })
        await jobManager.processJobs()

        expect(jobManager.history.length).toBe(2)

        const job1 = jobManager.find('job1')
        expect(job1?.status).toBe('failed')
        expect(job1?.jobResponse).toBeUndefined()

        const job2 = jobManager.find('job2')
        expect(job2?.status).toBe('success')
        expect(job2?.jobResponse).toBe('Job 2 response')
    })

    it('should handle job [ prepare -> execution -> cleanUp ]', async () => {
        jobManager.registerJob({
            id: 'JOB process',
            before: async () => {
                return {
                    prepare: 'Job 1 prepare',
                }
            },
            execute: async (_, { prepare }: { prepare: string }) => {
                await new Promise((resolve) => setTimeout(resolve, 100))
                return {
                    response: 'Job 1 response',
                    prepare,
                }
            },
            after: async (
                job: Job<{
                    response: string
                    prepare: string
                }>
            ) => {
                expect(job.jobResponse.prepare).toBe('Job 1 prepare')
                expect(job.jobResponse.response).toBe('Job 1 response')
            },
        })
        await jobManager.processJobs()
    })

    it('should control job execution flow', async () => {
        jobManager.registerJob({
            id: 'job1',
            execute: async (controller) => {
                await new Promise((resolve) => setTimeout(resolve, 100))
                controller.stop()
                return 'Job 1 response'
            },
        })
        jobManager.registerJob({
            id: 'job2',
            execute: async () => {
                return 'Job 2 response'
            },
        })

        await jobManager.processJobs()
        expect(jobManager.history.length).toBe(1)

        const job1 = jobManager.find('job1')
        expect(job1?.status).toBe('success')
        expect(job1?.jobResponse).toBe('Job 1 response')

        const job2 = jobManager.find('job2')
        expect(job2).toBeUndefined()
    })

    it('should clear jobs', async () => {
        jobManager.registerJob({
            id: 'job1',
            execute: async () => {
                return 'Job 1 response'
            },
        })
        jobManager.registerJob({
            id: 'job2',
            execute: async () => {
                return 'Job 2 response'
            },
        })
        await jobManager.processJobs()

        expect(jobManager.history.length).toBe(2)

        jobManager.clearHistory()

        expect(jobManager.history.length).toBe(0)
    })

    it('should stop job execution', async () => {
        jobManager.registerJob({
            id: 'job1',
            execute: async (controller) => {
                await new Promise((resolve) => setTimeout(resolve, 100))
                controller.stop()
                return 'Job 1 response'
            },
        })
        jobManager.registerJob({
            id: 'job2',
            execute: async () => {
                return 'Job 2 response'
            },
        })

        await jobManager.processJobs()

        expect(jobManager.history.length).toBe(1)

        const job1 = jobManager.find('job1')
        expect(job1?.status).toBe('success')
        expect(job1?.jobResponse).toBe('Job 1 response')

        const job2 = jobManager.find('job2')
        expect(job2).toBeUndefined()
    })

    it('should report job', async () => {
        jobManager.registerJobs([
            {
                id: 'job1',
                execute: async () => {
                    return 'Job 1 response'
                },
            },
            {
                id: 'job2',
                before: async () => {
                    expect(jobManager.processInformation).toEqual({
                        status: 'processing',
                        jobCount: 2,
                        jobRemaining: 1,
                    })
                },
                execute: async () => {
                    return 'Job 2 response'
                },
            },
        ])
        expect(jobManager.processInformation).toEqual({
            status: 'idle',
            jobCount: 2,
            jobRemaining: 2,
        })
        await jobManager.processJobs()
        expect(jobManager.processInformation).toEqual({
            status: 'idle',
            jobCount: 0,
            jobRemaining: 0,
        })

        expect(jobManager.processReport.map((e) => e.status)).toStrictEqual([
            'success',
            'success',
        ])
    })

    it('should subscribe job progress', async () => {
        const jobProgress = vi.fn()
        const logger = (job: Job) => {
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(job, null, 2))
        }
        jobManager.subscribeJobProgress(jobProgress)
        jobManager.subscribeJobProgress(logger)

        jobManager.registerJobs([
            {
                id: 'job1',
                execute: async () => {
                    return 'Job 1 response'
                },
            },
            {
                id: 'job2',
                execute: async () => {
                    return 'Job 2 response'
                },
            },
        ])

        await jobManager.processJobs()

        expect(jobProgress).toHaveBeenCalledTimes(2)
    })
})
