import {
    type RepositoryDynamicConfig,
    RepositoryPlugin,
    type RepositoryStaticConfig,
} from '../../repository'

import type { PublishPluginResponse } from '../../publish.plugin'
import type { CommandResult } from 'packages/helpers/src'

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
                    type: 'Function',
                    optional: true,
                    description:
                        'The commit message, `(stagedAddedFiles: Array<string>) => string)',
                    defaultValue: (stagedAddedFiles: Array<string>): string => {
                        return `${stagedAddedFiles[0]?.slice(0, 50)} (+ ${stagedAddedFiles.length - 1}) files published at ${new Date().toLocaleTimeString()}`
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
                execute: async ({ stop }): Promise<PublishPluginResponse> => {
                    const error: PublishPluginResponse['error'] = []
                    let gitRemote: CommandResult | undefined // Declare outside try for scope

                    try {
                        gitRemote = await this.$git?.remote()
                        const remoteOriginFounded: boolean =
                            gitRemote?.stdout !== '' &&
                            gitRemote?.stdout !== undefined // Check for undefined as well

                        if (remoteOriginFounded === false) {
                            this.invokeError(error, {
                                e: new Error('no remote origin found'),
                                message: 'no remote origin found',
                                commandResult: gitRemote,
                            })
                            stop()
                            // Return immediately on error
                            return {
                                error,
                                history: this.$logger.getHistory(),
                                // No stdout if it's an error scenario for this job
                            }
                        }

                        // Successful path return
                        return {
                            error, // Should be empty if successful
                            history: this.$logger.getHistory(),
                            stdout: gitRemote.stdout, // Only include stdout on success
                        }
                    } catch (e) {
                        this.invokeError(error, {
                            e,
                            message: 'git remote execution error',
                            commandResult: gitRemote, // Include any partial result
                        })
                        stop()
                        // Return immediately on error
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
                },
            },
            {
                name: 'git-pull',
                execute: async ({ stop }): Promise<PublishPluginResponse> => {
                    const error: PublishPluginResponse['error'] = []
                    let exec:
                        | PublishPluginResponse['error'][number]['command']
                        | undefined // Ensure exec can be undefined

                    try {
                        exec = await this.$git?.pull(this.dynamicConfig.branch)
                        this.$logger.info(`Pull ${addPattern} success`)
                        // Return on success
                        return {
                            error, // Empty error array
                            history: this.$logger.getHistory(),
                            stdout: exec?.stdout, // Include stdout if applicable
                        }
                    } catch (e) {
                        stop()
                        this.invokeError(error, {
                            e,
                            message: 'git pull execution error',
                            commandResult: exec,
                        })
                        // Return on error
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
                    // No finally block with return
                },
            },
            {
                name: 'git-add',
                execute: async ({ stop }): Promise<PublishPluginResponse> => {
                    const error: PublishPluginResponse['error'] = []
                    let exec:
                        | PublishPluginResponse['error'][number]['command']
                        | undefined // Ensure exec can be undefined

                    try {
                        if (addPattern) {
                            exec = await this.$git?.addByPattern(addPattern)
                            this.$logger.info(`Add ${addPattern} success`)
                        } else {
                            exec = await this.$git?.addAll()
                            this.$logger.info(`Add all success`)
                        }
                        // Return on success
                        return {
                            error, // Empty error array
                            history: this.$logger.getHistory(),
                            stdout: exec?.stdout, // Include stdout if applicable
                        }
                    } catch (e) {
                        stop()
                        this.invokeError(error, {
                            e,
                            message: 'git add execution error',
                            commandResult: exec,
                        })
                        // Return on error
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
                    // No finally block with return
                },
            },
            {
                name: 'git-commit',
                execute: async ({ stop }): Promise<PublishPluginResponse> => {
                    const error: PublishPluginResponse['error'] = []
                    let exec:
                        | PublishPluginResponse['error'][number]['command']
                        | undefined // Ensure exec can be undefined

                    try {
                        if (typeof commitMessage === 'string') {
                            const commit = `${commitPrefix}: ${commitMessage}`
                            exec = await this.$git?.commit(commit)
                        } else {
                            const result =
                                await this.$git?.listStagedAddedFiles() // Add nullish coalescing
                            if (!result) {
                                // Handle case where listStagedAddedFiles might be null/undefined
                                throw new Error(
                                    'Failed to list staged files for commit message.'
                                )
                            }

                            const files = result.stdout
                                .trim() // remove trailing newline
                                .split('\n') // split into lines
                                .map((f) => f.trim()) // clean up any stray whitespace
                                .map(
                                    (
                                        e // remove invalid chars
                                    ) =>
                                        e
                                            .replace(
                                                /[@{}[\]()<>?!#+=~^'"`\s]/g,
                                                ''
                                            )
                                            // remove everything except English letters
                                            .replace(/[^A-Za-z]+/g, '')
                                )
                                .filter(Boolean) // drop empty strings, if any

                            const commit = `${commitPrefix}: ${
                                (commitMessage as Function)(files) // Cast commitMessage to Function
                            }`
                            exec = await this.$git?.commit(commit)
                        }
                        this.$logger.info(`Commit success`)
                        // Return on success
                        return {
                            error, // Empty error array
                            history: this.$logger.getHistory(),
                            stdout: exec?.stdout, // Include stdout if applicable
                        }
                    } catch (e) {
                        stop()
                        this.invokeError(error, {
                            e,
                            message: 'git commit execution error',
                            commandResult: exec,
                        })
                        // Return on error
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
                    // No finally block with return
                },
            },
            {
                name: 'git-push',
                execute: async ({ stop }): Promise<PublishPluginResponse> => {
                    const error: PublishPluginResponse['error'] = []
                    let exec:
                        | PublishPluginResponse['error'][number]['command']
                        | undefined // Ensure exec can be undefined

                    try {
                        exec = await this.$git?.push(branch)
                        this.$logger.success('Pushed to remote successfully')
                        // Return on success
                        return {
                            error, // Empty error array
                            history: this.$logger.getHistory(),
                            stdout: exec?.stdout, // Include stdout if applicable
                        }
                    } catch (e) {
                        stop()
                        this.invokeError(error, {
                            e,
                            message: 'git push execution error',
                            commandResult: exec,
                        })
                        // Return on error
                        return {
                            error,
                            history: this.$logger.getHistory(),
                        }
                    }
                    // No finally block with return
                },
            },
        ])

        await this.$jobManager.processJobs()

        return this.$jobManager.history
    }
}
