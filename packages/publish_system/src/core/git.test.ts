import { describe, expect, it } from 'vitest'
import { GitShell } from './git'

describe('GitShell', () => {
    it('should return the status', async () => {
        const git = new GitShell({
            historyLimit: 100,
            gitPath: '/usr/bin/git',
        })

        const result = await git.showBranch()
        expect(result.stdout).toContain('main')
    })
})
