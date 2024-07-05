import { Logger } from '@obsidian_blogger/helpers/logger'
import {
    DeployPlugin,
    RepositoryConstructor,
    RepositoryPlugin,
    SiteBuilderPlugin,
    SiteBuilderPluginConstructor,
} from './plugin'

interface GithubRepositoryConstructor extends RepositoryConstructor {}
export class GithubRepository extends RepositoryPlugin {
    public readonly name = 'github'
    public constructor(private readonly options: GithubRepositoryConstructor) {
        super(options)
    }

    public async save({
        branch,
        commitMessage,
        commitPrefix,
        addPattern,
    }: {
        commitPrefix: string
        commitMessage: string
        branch: string
        addPattern?: string
    }): Promise<void> {
        this.$logger.info(`Saving to ${this.name}`)

        try {
            if (addPattern) {
                await this.$git.addByPattern(addPattern)
            } else {
                await this.$git.addAll()
            }

            const remoteOriginCheck = await this.$git.remote()
            if (remoteOriginCheck.stdout === '') {
                this.$logger.error('No remote origin found')
                return
            }

            const commit = `${commitPrefix}: ${commitMessage}`
            await this.$git.commit(commit)
            this.$logger.info(`Commit - ${commit}`)
            await this.$git.push(branch)
            this.$logger.success('Pushed to remote successfully')
        } catch (err) {
            this.$logger.error(JSON.stringify(err, null, 2))
        }
    }
}

export class BlogBuilder extends SiteBuilderPlugin {
    public constructor(private readonly options: SiteBuilderPluginConstructor) {
        super(options)
    }

    public async build({
        buildScript,
        verbose = false,
    }: {
        buildScript: Array<string>
        verbose?: boolean
    }) {
        await this.detectPackageManager()
        const buildResult = await this.pkg(buildScript)
        if (!buildResult.success) {
            this.$logger.error('Build failed')
            verbose && this.$logger.log(JSON.stringify(buildResult, null, 2))
            return
        }

        this.$logger.success('Build succeeded')
        verbose &&
            this.$logger.log(JSON.stringify(buildResult.data.stdout, null, 2))
    }
}

export type PublishConfig = {
    build: {
        buildScript: Array<string>
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

export interface PublishSystemConstructor {
    name: string
    cwd: string
    builder: SiteBuilderPlugin
    repository: RepositoryPlugin
    deployer?: DeployPlugin
}
export class PublishSystem {
    private readonly builder: SiteBuilderPlugin
    private readonly repository: RepositoryPlugin
    private readonly deployer?: DeployPlugin
    private readonly $logger

    public constructor(public readonly options: PublishSystemConstructor) {
        this.$logger = new Logger({
            name: options.name,
        })
        this.builder = options.builder
        this.repository = options.repository
        if (options.deployer) {
            this.deployer = options.deployer
        }
        this.builder.updateLoggerName(`${options.name}:builder`)
        this.repository.updateLoggerName(`${options.name}:repository`)
        this.deployer?.updateLoggerName(`${options.name}:deployer`)
    }

    public async publish<
        PublishOption extends {
            build: Record<string, unknown>
            save: Record<string, unknown>
            deploy: Record<string, unknown>
        },
    >(
        commands: PublishOption
    ): Promise<{
        status: 'success' | 'failed'
    }> {
        try {
            await this.builder.build(commands.build)
            await this.repository.save(commands.save)
            await this.deployer?.deploy(commands.deploy)

            this.$logger.success('Publish succeeded 🚀')
            return {
                status: 'success',
            }
        } catch (e) {
            this.$logger.error('Publish failed 🚨')
            this.$logger.error(JSON.stringify(e, null, 2))
            return {
                status: 'failed',
            }
        }
    }
}
