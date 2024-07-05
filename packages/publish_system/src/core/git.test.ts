import { describe, expect, it } from 'vitest'
import { GitShell } from './git'

describe('GitShell', () => {
    it('should return the status', async () => {
        const git = new GitShell({
            historyLimit: 100,
            gitPath: '/usr/bin/git',
            cwd: process.cwd(),
        })

        const result = await git.status()
        expect(result.stdout).toContain('main')
    })

    it('should add all files', async () => {
        const git = new GitShell({
            historyLimit: 100,
            gitPath: '/usr/bin/git',
            cwd: process.cwd(),
        })

        await git.addAll()
        const status = await git.resetHEAD()
        expect(status.stdout).toContain('reset')
    })
})
