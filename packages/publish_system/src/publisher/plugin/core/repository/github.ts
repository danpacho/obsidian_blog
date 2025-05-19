import {
    RepositoryPlugin,
    type RepositoryDynamicConfig,
    type RepositoryStaticConfig,
} from '../../repository'
import type { PublishPluginResponse } from '../../publish.plugin'

export interface GithubRepositoryDynamicConfig extends RepositoryDynamicConfig {
    branch: string
    commitMessage: string | ((stagedAddedFiles: Array<string>) => string)
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
                    description: 'The branch to push to, default to main',
                    defaultValue: 'main',
                    optional: true,
                },
                commitMessage: {
                    type: ['string', 'Function'],
                    optional: true,
                    description:
                        'The commit message, `string` or `(stagedAddedFiles: Array<string>) => string)',
                    defaultValue: (stagedAddedFiles: Array<string>): string => {
                        return `add ${stagedAddedFiles.join(', ')} published at ${new Date().toLocaleTimeString()}`
                    },
                },
                commitPrefix: {
                    type: 'string',
                    description: 'The commit prefix',
                    defaultValue: 'publish',
                    optional: true,
                },
                gitPath: {
                    type: 'string',
                    description: 'The path to git, default to `git`',
                    defaultValue: 'git',
                    optional: true,
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
                        stop()
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
                },
            },
            {
                name: 'git-pull',
                execute: async () => {
                    const error: PublishPluginResponse['error'] = []
                    let exec: PublishPluginResponse['error'][number]['command']
                    try {
                        exec = await this.$git?.pull(this.dynamicConfig.branch)
                        this.$logger.info(`Pull ${addPattern} success`)
                    } catch (e) {
                        stop()
                        this.invokeError(error, {
                            e,
                            message: 'git pull execution error',
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
                name: 'git-add',
                execute: async () => {
                    const error: PublishPluginResponse['error'] = []
                    let exec: PublishPluginResponse['error'][number]['command']
                    try {
                        if (addPattern) {
                            exec = await this.$git?.addByPattern(addPattern)
                            this.$logger.info(`Add ${addPattern} success`)
                        } else {
                            exec = await this.$git?.addAll()
                            this.$logger.info(`Add all success`)
                        }
                    } catch (e) {
                        stop()
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
                    try {
                        if (typeof commitMessage === 'string') {
                            const commit = `${commitPrefix}: ${commitMessage}`
                            exec = await this.$git?.commit(commit)
                        } else {
                            const result =
                                await this.$git.listStagedAddedFiles()

                            const files = result.stdout
                                .trim() // remove trailing newline
                                .split('\n') // split into lines
                                .map((f) => f.trim()) // clean up any stray whitespace
                                .filter(Boolean) // drop empty strings, if any

                            const commit = `${commitPrefix}: ${commitMessage(files)}`
                            exec = await this.$git?.commit(commit)
                        }
                        this.$logger.info(`Commit success`)
                    } catch (e) {
                        stop()
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
            },
            {
                name: 'git-push',
                execute: async () => {
                    const error: PublishPluginResponse['error'] = []
                    let exec: PublishPluginResponse['error'][number]['command']
                    try {
                        exec = await this.$git?.push(branch)
                        this.$logger.success('Pushed to remote successfully')
                    } catch (e) {
                        stop()
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
            },
        ])

        await this.$jobManager.processJobs()

        return this.$jobManager.history
    }
}
