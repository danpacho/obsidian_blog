import { ShellExecutor } from '@obsidian_blogger/helpers/shell'
import { describe, expect, it } from 'vitest'
import { GitShell } from './git'

describe('GitShell', async () => {
    const shell = new ShellExecutor({ historyLimit: 10 })
    const gitPath = (
        await shell.exec$(
            ['win32'].includes(shell.platform) ? 'where git' : 'which git'
        )
    ).stdout
    it('should return the status', async () => {
        const git = new GitShell({
            historyLimit: 100,
            gitPath: gitPath,
            cwd: process.cwd(),
        })

        const result = await git.status()
        expect(result.stdout).toContain('main')
    })

    it('should add all files', async () => {
        const git = new GitShell({
            historyLimit: 100,
            gitPath: gitPath,
            cwd: process.cwd(),
        })

        await git.addAll()
        const status = await git.resetHEAD()
        expect(status.stdout).toContain('reset')
    })
})
