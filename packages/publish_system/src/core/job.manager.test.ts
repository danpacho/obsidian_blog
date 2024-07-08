import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Job, JobError, JobManager } from './job.manager'

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
        expect(job1?.response).toBe('Job 1 response')

        const job2 = jobManager.find('job2')
        expect(job2?.status).toBe('success')
        expect(job2?.response).toBe('Job 2 response')
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
        expect(job1?.response).toBeUndefined()

        const job2 = jobManager.find('job2')
        expect(job2?.status).toBe('success')
        expect(job2?.response).toBe('Job 2 response')
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
                expect(job.response?.prepare).toBe('Job 1 prepare')
                expect(job.response?.response).toBe('Job 1 response')
            },
        })
        const result = await jobManager.processJobs()
        expect(result).toBe(true)
    })

    it('should pass job props at [before]', async () => {
        jobManager.registerJob({
            id: 'job1',
            before: async () => ({
                prop1: 'prop1',
            }),
            execute: async (_, { prop1 }) => {
                return prop1
            },
        })
        await jobManager.processJobs()

        const job1 = jobManager.find('job1')
        expect(job1?.status).toBe('success')
        expect(job1?.response).toBe('prop1')
    })

    it('should get job response at [after]', async () => {
        jobManager.registerJob({
            id: 'job1',
            execute: async () => {
                return 'Job 1 response'
            },
            after: async (job: Job) => {
                expect(job.response).toBe('Job 1 response')
            },
        })
        await jobManager.processJobs()
    })

    it('should control job execution flow', async () => {
        jobManager.registerJob({
            id: 'job0',
            execute: async () => {
                return 'Job 0 response'
            },
        })

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

        expect(jobManager.history.length).toBe(3)
        expect(jobManager.history.map((e) => e.status)).toStrictEqual([
            'pending',
            'pending',
            'pending',
        ])
        await jobManager.processJobs()
        expect(jobManager.history.map((e) => e.status)).toStrictEqual([
            'success',
            'success',
            'pending',
        ])

        expect(jobManager.history.length).toBe(3)

        const job1 = jobManager.find('job1')
        expect(job1?.status).toBe('success')
        expect(job1?.response).toBe('Job 1 response')

        const job2 = jobManager.find('job2')
        expect(job2).toStrictEqual({
            jobId: 'job2',
            status: 'pending',
        })
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

        expect(jobManager.history.length).toBe(2)

        const job1 = jobManager.find('job1')
        expect(job1?.status).toBe('success')
        expect(job1?.response).toBe('Job 1 response')

        const job2 = jobManager.find('job2')
        expect(job2).toStrictEqual({
            jobId: 'job2',
            status: 'pending',
        })
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
        const logger = (curr: Job, i: number, history: Array<Job>) => {
            expect(curr).toBe(history[i])
            expect(history.length).toBe(2)
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

    it('should include job errors', async () => {
        jobManager.registerJobs([
            {
                id: 'job1',
                execute: async () => {
                    throw new Error('Job 1 failed', {
                        cause: ['Job 1 failed'],
                    })
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

        const job1 = jobManager.find('job1')
        expect(job1?.status).toBe('failed')
        expect(job1?.error).instanceof(JobError)
    })

    it('should continue job execution after calling stop', async () => {
        jobManager.registerJobs([
            {
                id: 'job1',
                execute: async (controller) => {
                    await new Promise((resolve) => setTimeout(resolve, 100))
                    controller.stop()
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

        expect(jobManager.history.length).toBe(2)

        const job1 = jobManager.find('job1')
        expect(job1?.status).toBe('success')
        expect(job1?.response).toBe('Job 1 response')

        const job2 = jobManager.find('job2')
        expect(job2).toStrictEqual({
            jobId: 'job2',
            status: 'pending',
        })

        await jobManager.processJobs()

        const job2After = jobManager.find('job2')
        expect(job2After?.status).toBe('success')
        expect(job2After?.response).toBe('Job 2 response')
    })
})