import { beforeEach, describe, expect, it } from 'vitest'
import { m } from '../utils/logger'
import { GitShell } from './git'

describe('GitShell', () => {
    let gitShell: GitShell

    beforeEach(() => {
        gitShell = new GitShell({
            logger: m,
            maxTraceCount: 10,
        })
    })

    describe('clone', () => {
        it('should clone the repository to the destination', async () => {
            const repository = 'https://github.com/example/repo.git'
            const destination = '/path/to/destination'
            const expectedCommand = `git clone ${repository} ${destination}`

            const result = await gitShell.clone(repository, destination)

            expect(result).toEqual({
                /* expected ProcessOutput */
            })
            expect(gitShell.$).toHaveBeenCalledWith(expectedCommand)
        })
    })

    describe('pull', () => {
        it('should pull the specified branch from origin', async () => {
            const branch = 'main'
            const expectedCommand = `git pull origin ${branch}`

            const result = await gitShell.pull(branch)

            expect(result).toEqual({
                /* expected ProcessOutput */
            })
            expect(gitShell.$).toHaveBeenCalledWith(expectedCommand)
        })
    })

    describe('commit', () => {
        it('should commit with the specified message', async () => {
            const message = 'Initial commit'
            const expectedCommand = `git commit -m "${message}"`

            const result = await gitShell.commit(message)

            expect(result).toEqual({
                /* expected ProcessOutput */
            })
            expect(gitShell.$).toHaveBeenCalledWith(expectedCommand)
        })
    })

    describe('push', () => {
        it('should push the specified branch to origin', async () => {
            const branch = 'main'
            const expectedCommand = `git push origin ${branch}`

            const result = await gitShell.push(branch)

            expect(result).toEqual({
                /* expected ProcessOutput */
            })
            expect(gitShell.$).toHaveBeenCalledWith(expectedCommand)
        })
    })

    describe('add', () => {
        it('should add the specified file', async () => {
            const file = 'path/to/file.txt'
            const expectedCommand = `git add ${file}`

            const result = await gitShell.add(file)

            expect(result).toEqual({
                /* expected ProcessOutput */
            })
            expect(gitShell.$).toHaveBeenCalledWith(expectedCommand)
        })
    })

    describe('addAll', () => {
        it('should add all files', async () => {
            const expectedCommand = `git add .`

            const result = await gitShell.addAll()

            expect(result).toEqual({
                /* expected ProcessOutput */
            })
            expect(gitShell.$).toHaveBeenCalledWith(expectedCommand)
        })
    })

    describe('status', () => {
        it('should return the status', async () => {
            const expectedCommand = `git status`

            const result = await gitShell.status()

            expect(result).toEqual({
                /* expected ProcessOutput */
            })
            expect(gitShell.$).toHaveBeenCalledWith(expectedCommand)
        })
    })
})
