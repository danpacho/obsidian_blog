import { describe, expect } from 'vitest'
import { BashExecutor } from '../core/bash'

describe('core', (it) => {
    const bash = new BashExecutor(50) // Storing up to 50 commands in history

    it('should pass', async () => {
        await bash.$('node -v')
        await bash.$('ls -al')
        await bash.$('pwd')
        await bash.$('echo "Hello, world!"')
        await bash.$('cd ../obsidian-blogger && ls')

        expect(true).toBe(true)
    })
})
