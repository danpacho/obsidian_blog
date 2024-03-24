import { describe, expect, it } from 'vitest'
import { type ProcessOutput } from 'zx'
import { m } from '../utils/logger'
import { ShellScript, ShellTraceStorage } from './shell.script'

describe('terminal.script', () => {
    it('should work', async () => {
        const s = new ShellScript({
            logger: m,
            maxTraceCount: 10,
        })

        await s.$(`ls -la`)
        const command = 'echo "Hello from dynamic zx!"'
        await s.$(`${command}`)
        await s.$(`git ${'status'}`)

        expect(s.traceStorage.getCommandTrace()).toEqual([
            'ls -la',
            'echo "Hello from dynamic zx!"',
            'git status',
        ])

        s.logCommandHistory()
    })
})

describe('ShellTraceStorage', () => {
    it('should add command and output to storage', () => {
        const storage = new ShellTraceStorage({ maxTraceCount: 10, logger: m })
        const command = 'ls -la'
        const output =
            'total 0\n-rw-r--r-- 1 user group 0 Jan 1 00:00 file.txt\n'
        storage.add(command, output as unknown as ProcessOutput)
        expect(storage.length).toBe(1)
        expect(storage.getLatest()).toEqual({ command, output })
    })

    it('should search for command in storage', () => {
        const storage = new ShellTraceStorage({ maxTraceCount: 10, logger: m })
        const command = 'ls -la'
        const output =
            'total 0\n-rw-r--r-- 1 user group 0 Jan 1 00:00 file.txt\n'
        storage.add(command, output as unknown as ProcessOutput)
        const foundOutput = storage.search(command)
        expect(foundOutput).toBe(output)
    })

    it('should return undefined when command is not found in storage', () => {
        const storage = new ShellTraceStorage({ maxTraceCount: 10, logger: m })
        const command = 'ls -la'
        const output =
            'total 0\n-rw-r--r-- 1 user group 0 Jan 1 00:00 file.txt\n'
        storage.add(command, output as unknown as ProcessOutput)
        const notFoundOutput = storage.search('pwd')
        expect(notFoundOutput).toBeUndefined()
    })

    it('should return an array of command traces', () => {
        const storage = new ShellTraceStorage({ maxTraceCount: 10, logger: m })
        const command1 = 'ls -la'
        const command2 = 'echo "Hello from dynamic zx!"'
        const command3 = 'git status'
        storage.add(command1, '' as unknown as ProcessOutput)
        storage.add(command2, '' as unknown as ProcessOutput)
        storage.add(command3, '' as unknown as ProcessOutput)
        const commandTrace = storage.getCommandTrace()
        expect(commandTrace).toEqual([command1, command2, command3])
    })

    it('should return an array of output traces', () => {
        const storage = new ShellTraceStorage({ maxTraceCount: 10, logger: m })
        const output1 =
            'total 0\n-rw-r--r-- 1 user group 0 Jan 1 00:00 file.txt\n'
        const output2 = 'Hello from dynamic zx!\n'
        const output3 =
            "On branch main\nYour branch is up to date with 'origin/main'.\n"
        storage.add('', output1 as unknown as ProcessOutput)
        storage.add('', output2 as unknown as ProcessOutput)
        storage.add('', output3 as unknown as ProcessOutput)
        const outputTrace = storage.getOutputTrace()
        expect(outputTrace).toEqual([output1, output2, output3])
    })
})
