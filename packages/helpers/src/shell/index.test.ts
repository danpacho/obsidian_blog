import { describe, expect, it } from 'vitest'
import { ShellExecutor } from './index'

describe('BashExecutor', () => {
    const executor = new ShellExecutor(100)
    it('should execute a shell command', async () => {
        const result = await executor.exec$('ls')
        expect(result.stdout).toContain('packages')
        expect(result.stderr).toBe('')
    })

    it('should record command execution in history', async () => {
        const command = 'echo "Hello, World!"'
        await executor.exec$(command)
        const history = executor.getCommandHistory()
        expect(history.length).toBe(2)
        expect(history[1]?.command).toBe(command)
        expect(history[1]?.status).toBe('success')
        expect(history[1]?.stdout).toBe('Hello, World!\n')
        expect(history[1]?.stderr).toBe('')
    })

    it('should calculate elapsed time', async () => {
        const command = 'sleep 1'
        const elapsedTimeStream = executor.getElapsedTimeStream(100)
        const elapsedTimeValues: number[] = []
        elapsedTimeStream.on('data', (chunk) => {
            elapsedTimeValues.push(Number(chunk))
        })

        await executor.exec$(command)

        elapsedTimeStream.destroy()
        expect(elapsedTimeValues.length).toBeGreaterThan(8)
        expect(elapsedTimeValues.length).toBeLessThan(12)
    })
})
