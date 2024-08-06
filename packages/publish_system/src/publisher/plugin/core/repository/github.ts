import {
    type RepositoryDynamicConfig,
    RepositoryPlugin,
    type RepositoryStaticConfig,
} from '../../repository'

export interface GithubRepositoryDynamicConfig extends RepositoryDynamicConfig {
    branch: string
    commitMessage: string
    commitPrefix: string
    addPattern?: string
}

export class GithubRepository extends RepositoryPlugin<
    RepositoryStaticConfig,
    GithubRepositoryDynamicConfig
> {
    protected defineStaticConfig(): RepositoryStaticConfig {
        return {
            name: 'github',
            description: 'Github repository commit and push automation plugin',
            dynamicConfigSchema: {
                cwd: {
                    type: 'string',
                    description: 'The current working directory',
                },
                branch: {
                    type: 'string',
                    description: 'The branch to push to',
                },
                commitMessage: {
                    type: 'string',
                    description: 'The commit message',
                },
                commitPrefix: {
                    type: 'string',
                    description: 'The commit prefix',
                },
                gitPath: {
                    type: 'string',
                    description: 'The path to git',
                },
            },
        }
    }

    public async execute() {
        return await this.save()
    }

    private async save() {
        const { branch, commitMessage, commitPrefix, addPattern } =
            this.dynamicConfig
        this.$logger.info(`Saving to ${this.name}`)

        this.$jobManager.registerJobs([
            {
                name: 'git-check-remote-origin',
                execute: async ({ stop }) => {
                    const remoteOriginFounded: boolean =
                        (await this.$git?.remote())?.stdout !== ''

                    if (remoteOriginFounded === false) {
                        this.$logger.error('No remote origin found')
                        stop()
                    }

                    return remoteOriginFounded
                },
            },
            {
                name: 'git-add',
                execute: async () => {
                    if (addPattern) {
                        return await this.$git?.addByPattern(addPattern)
                    } else {
                        return await this.$git?.addAll()
                    }
                },
            },
            {
                name: 'git-commit',
                execute: async () => {
                    const commit = `${commitPrefix}: ${commitMessage}`
                    const committed = await this.$git?.commit(commit)
                    return committed
                },
                cleanup: async (job) => {
                    this.$logger.info(`Commit\n${job.response?.stdout}`)
                },
            },
            {
                name: 'git-push',
                execute: async () => {
                    return await this.$git?.push(branch)
                },
                cleanup: async () => {
                    this.$logger.success('Pushed to remote successfully')
                },
            },
        ])

        await this.$jobManager.processJobs()

        return this.$jobManager.history
    }
}
