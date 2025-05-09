import {
    RepositoryPlugin,
    type RepositoryDynamicConfig,
    type RepositoryStaticConfig,
} from '../../repository'
import type { PublishPluginResponse } from '../../publish.plugin'

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
                    const error: PublishPluginResponse['error'] = []
                    try {
                        const gitRemote = await this.$git?.remote()
                        const remoteOriginFounded: boolean =
                            gitRemote?.stdout !== ''

                        if (remoteOriginFounded === false) {
                            this.invokeError(error, {
                                e: new Error('no remote origin found'),
                                message: 'no remote origin found',
                                commandResult: gitRemote,
                            })
                            stop()
                        }
                        return {
                            error,
                            history: this.$logger.getHistory(),
                            stdout: gitRemote.stdout,
                        }
                    } catch (e) {
                        this.invokeError(error, {
                            e,
                            message: 'git remote execution error',
                        })
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
                },
            },
            {
                name: 'git-add',
                execute: async () => {
                    const error: PublishPluginResponse['error'] = []
                    let exec: PublishPluginResponse['error'][number]['command']
                    try {
                        if (addPattern) {
                            exec = await this.$git?.addByPattern(addPattern)
                        } else {
                            exec = await this.$git?.addAll()
                        }
                    } catch (e) {
                        this.invokeError(error, {
                            e,
                            message: 'git add execution error',
                            commandResult: exec,
                        })
                    } finally {
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
                },
            },
            {
                name: 'git-commit',
                execute: async () => {
                    const error: PublishPluginResponse['error'] = []
                    let exec: PublishPluginResponse['error'][number]['command']
                    const commit = `${commitPrefix}: ${commitMessage}`
                    try {
                        exec = await this.$git?.commit(commit)
                    } catch (e) {
                        this.invokeError(error, {
                            e,
                            message: 'git commit execution error',
                            commandResult: exec,
                        })
                    } finally {
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
                },
                cleanup: async () => {
                    this.$logger.info(`Commit success`)
                },
            },
            {
                name: 'git-push',
                execute: async () => {
                    const error: PublishPluginResponse['error'] = []
                    let exec: PublishPluginResponse['error'][number]['command']
                    try {
                        exec = await this.$git?.push(branch)
                    } catch (e) {
                        this.invokeError(error, {
                            e,
                            message: 'git push execution error',
                            commandResult: exec,
                        })
                    } finally {
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
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
