import { describe, expect, it } from 'vitest'
import { m } from '../utils/logger'
import { GitShell } from './git'

describe('GitShell', () => {
    it('should return the status', async () => {
        const gitShell = new GitShell({
            logger: m,
            maxTraceCount: 10,
        })

        const result = await gitShell.showBranch()
        expect(result.stdout).toContain('main')
    })
})
