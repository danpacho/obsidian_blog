import { RepositoryConstructor, RepositoryPlugin } from '../../repository'

export type GithubSaveConfig = {
    branch: string
    commitMessage: string
    commitPrefix: string
    addPattern?: string
}

interface GithubRepositoryConstructor extends RepositoryConstructor {}
export class GithubRepository extends RepositoryPlugin {
    public constructor(options: GithubRepositoryConstructor) {
        super(options)
    }

    public async save({
        branch,
        commitMessage,
        commitPrefix,
        addPattern,
    }: GithubSaveConfig) {
        this.$logger.info(`Saving to ${this.name}`)

        this.$jobManager.registerJobs([
            {
                id: 'git-check-remote-origin',
                execute: async ({ stop }) => {
                    const remoteOriginFounded: boolean =
                        (await this.$git.remote())?.stdout !== ''

                    if (remoteOriginFounded === false) {
                        this.$logger.error('No remote origin found')
                        stop()
                    }

                    return remoteOriginFounded
                },
            },
            {
                id: 'git-add',
                execute: async () => {
                    if (addPattern) {
                        return await this.$git.addByPattern(addPattern)
                    } else {
                        return await this.$git.addAll()
                    }
                },
            },
            {
                id: 'git-commit',
                execute: async () => {
                    const commit = `${commitPrefix}: ${commitMessage}`
                    const committed = await this.$git.commit(commit)
                    return committed
                },
                after: async (job) => {
                    this.$logger.info(`Commit\n${job.response?.stdout}`)
                },
            },
            {
                id: 'git-push',
                execute: async () => {
                    return await this.$git.push(branch)
                },
                after: async () => {
                    this.$logger.success('Pushed to remote successfully')
                },
            },
        ])

        await this.$jobManager.processJobs()

        return this.$jobManager.history
    }
}
