import {
    DeployPlugin,
    PublishPlugin,
    PublishPluginConstructor,
    type RepositoryConstructor,
    RepositoryPlugin,
    SiteBuilderPlugin,
    type SiteBuilderPluginConstructor,
} from './plugin'

export type PublishConfig = {
    build: {
        buildScript: Array<string>
        verbose?: boolean
    }
    save: {
        addPattern?: string
        commitPrefix: string
        commitMessage: string
        branch: string
    }
    deploy: {
        deployScript: Array<string>
    }
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
    }: PublishConfig['save']) {
        this.$logger.info(`Saving to ${this.name}`)

        this.$jobManager.registerJobs([
            {
                id: 'git-check-remote-origin',
                execute: async ({ stop }) => {
                    const remoteOriginExists: boolean =
                        (await this.$git.remote()).stdout === ''

                    if (remoteOriginExists) {
                        this.$logger.error('No remote origin found')
                        stop()
                    }

                    return remoteOriginExists
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
                    return await this.$git.commit(commit)
                },
                after: async (job) => {
                    this.$logger.info(`Commit\n${job.jobResponse.stdout}`)
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

        const history = this.$jobManager.history

        this.$jobManager.clearHistory()

        return history
    }
}

export class BlogBuilder extends SiteBuilderPlugin {
    public constructor(options: SiteBuilderPluginConstructor) {
        super(options)
    }

    public async build({
        buildScript,
        verbose = false,
    }: PublishConfig['build']) {
        this.$jobManager.registerJobs([
            {
                id: 'site-detect-package-manager',
                execute: async () => await this.detectPackageManager(),
            },
            {
                id: 'site-build',
                execute: async () => {
                    const buildResult = await this.pkg(buildScript)
                    if (!buildResult.success) {
                        this.$logger.error('Build failed')
                        verbose &&
                            this.$logger.log(
                                JSON.stringify(buildResult, null, 2)
                            )
                        return buildResult
                    }

                    this.$logger.success('Build succeeded')
                    verbose &&
                        this.$logger.log(
                            JSON.stringify(buildResult.data.stdout, null, 2)
                        )
                    return buildResult
                },
            },
        ])

        await this.$jobManager.processJobs()

        const history = this.$jobManager.history

        this.$jobManager.clearHistory()

        return history
    }
}

export interface PublishSystemConstructor extends PublishPluginConstructor {
    builder: Array<SiteBuilderPlugin>
    repository: Array<RepositoryPlugin>
    deployer?: Array<DeployPlugin>
}
export class PublishSystem extends PublishPlugin {
    private readonly _builder: Array<SiteBuilderPlugin>
    private readonly _repository: Array<RepositoryPlugin>
    private readonly _deployer?: Array<DeployPlugin>

    public constructor(public readonly options: PublishSystemConstructor) {
        super(options)

        this._builder = options.builder
        this._repository = options.repository
        if (options.deployer) {
            this._deployer = options.deployer
        }

        this.updateLoggerName(options.name)

        this._builder.forEach((b, i) =>
            b.updateLoggerName(`${options.name}::builder_${i + 1}`)
        )
        this._repository.forEach((r, i) =>
            r.updateLoggerName(`${options.name}::repository_${i + 1}`)
        )
        this._deployer?.forEach((d, i) =>
            d.updateLoggerName(`${options.name}::deployer_${i + 1}`)
        )
    }

    public async publish<
        PublishOption extends {
            build: Record<string, unknown>
            save: Record<string, unknown>
            deploy: Record<string, unknown>
        },
    >(commands: PublishOption) {
        this.$jobManager.registerJobs([
            {
                id: 'build',
                before: async () => {
                    this.$logger.info('1. Build initiated')
                },
                execute: async () => {
                    const buildResponse = this._builder.reduce<
                        Promise<Array<unknown>>
                    >(
                        async (acc, builder) => {
                            const awaitedAcc = await acc
                            const buildResponse = await builder.build(
                                commands.build
                            )
                            awaitedAcc.push(buildResponse)
                            return awaitedAcc
                        },
                        Promise.resolve([]) as Promise<Array<unknown>>
                    )
                    return buildResponse
                },
                after: async () => {
                    this.$logger.info('1. Build completed')
                },
            },
            {
                id: 'save',
                before: async () => {
                    this.$logger.info('2. Save initiated')
                },
                execute: async () => {
                    const saveResponse = this._repository.reduce<
                        Promise<Array<unknown>>
                    >(
                        async (acc, repository) => {
                            const awaitedAcc = await acc
                            const saveResponse = await repository.save(
                                commands.save
                            )
                            awaitedAcc.push(saveResponse)
                            return awaitedAcc
                        },
                        Promise.resolve([]) as Promise<Array<unknown>>
                    )
                    return saveResponse
                },
                after: async () => {
                    this.$logger.info('2. Save completed')
                },
            },
            {
                id: 'deploy',
                before: async () => {
                    this.$logger.info('3. Deploy initiated')
                },
                execute: async () => {
                    if (!this._deployer) {
                        this.$logger.info('No deployer found')
                        return
                    }

                    const deployResponse = this._deployer.reduce<
                        Promise<Array<unknown>>
                    >(
                        async (acc, deployer) => {
                            const awaitedAcc = await acc
                            const deployResponse = await deployer.deploy(
                                commands.deploy
                            )
                            awaitedAcc.push(deployResponse)
                            return awaitedAcc
                        },
                        Promise.resolve([]) as Promise<Array<unknown>>
                    )
                    return deployResponse
                },
                after: async () => {
                    this.$logger.info('3. Deploy completed')
                },
            },
        ])

        const success = await this.$jobManager.processJobs()

        if (success) {
            this.$logger.success(' -- Publish succeeded 🚀 --')
        } else {
            this.$logger.error(' -- Publish failed 🚨 -- ')
        }

        const history = this.$jobManager.history

        this.$jobManager.clearHistory()

        return history
    }

    public addPlugin(plugin: {
        builder?: SiteBuilderPlugin
        repository?: RepositoryPlugin
        deployer?: DeployPlugin
    }) {
        if (plugin.builder) {
            this._builder.push(plugin.builder)
        }

        if (plugin.repository) {
            this._repository.push(plugin.repository)
        }

        if (plugin.deployer) {
            this._deployer?.push(plugin.deployer)
        }
    }
}
