import type { IO } from '@obsidian_blogger/helpers/io'
import type { Logger } from '@obsidian_blogger/helpers/logger'
import {
    PluginLoadInformation,
    PluginManager,
} from '@obsidian_blogger/helpers/plugin'
import type { ShellExecutor } from '@obsidian_blogger/helpers/shell'
import { PublishSystemPluginAdapter } from '../publish.system.interface'
import type {
    BuildScriptPlugin,
    DeployPlugin,
    RepositoryPlugin,
} from './plugin'
import type { PublishPluginDependencies } from './plugin/publish.plugin'
import { PublishPluginRunner } from './publisher.internal'

export interface PublisherConstructor {
    io: IO
    logger: Logger
    shell: ShellExecutor
    /**
     * The root path of the bridge system
     */
    bridgeRoot: string
}

export class Publisher {
    private get $logger(): Logger {
        return this.options.logger
    }
    private get $io(): IO {
        return this.options.io
    }
    private get $shell(): ShellExecutor {
        return this.options.shell
    }

    public readonly $buildScriptPluginRunner: PublishPluginRunner
    public readonly $buildScriptPluginManager: PluginManager<
        BuildScriptPlugin,
        PublishPluginRunner
    >
    public readonly $repositoryPluginRunner: PublishPluginRunner
    public readonly $repositoryPluginManager: PluginManager<
        RepositoryPlugin,
        PublishPluginRunner
    >
    public readonly $deployPluginRunner: PublishPluginRunner
    public readonly $deployPluginManager: PluginManager<
        DeployPlugin,
        PublishPluginRunner
    >

    public constructor(public readonly options: PublisherConstructor) {
        // A > Build Script
        this.$buildScriptPluginRunner = new PublishPluginRunner()
        this.$buildScriptPluginManager = new PluginManager({
            name: 'publish_system::build_script',
            root: 'late_init.json',
            runner: this.$buildScriptPluginRunner,
            lateInit: true,
        })
        // B > Repository
        this.$repositoryPluginRunner = new PublishPluginRunner()
        this.$repositoryPluginManager = new PluginManager({
            name: 'publish_system::repository',
            root: 'late_init.json',
            runner: this.$repositoryPluginRunner,
            lateInit: true,
        })
        // C > Deploy
        this.$deployPluginRunner = new PublishPluginRunner()
        this.$deployPluginManager = new PluginManager({
            name: 'publish_system::deploy',
            root: 'late_init.json',
            runner: this.$deployPluginRunner,
            lateInit: true,
        })
    }

    private get dependencies(): PublishPluginDependencies {
        return {
            io: this.$io,
            logger: this.$logger,
            shell: this.$shell,
        }
    }

    public use({
        buildScript,
        repository,
        deploy,
    }: PublishSystemPluginAdapter): Publisher {
        this.$buildScriptPluginManager.$loader.use(buildScript)
        this.$repositoryPluginManager.$loader.use(repository)
        this.$deployPluginManager.$loader.use(deploy)

        return this
    }

    private async buildScript(
        loadInformation: PluginLoadInformation
    ): Promise<void> {
        await this.$buildScriptPluginManager.$runner.run(
            this.$buildScriptPluginManager.$loader.load(loadInformation),
            this.dependencies
        )
    }

    private async repository(
        loadInformation: PluginLoadInformation
    ): Promise<void> {
        await this.$repositoryPluginManager.$runner.run(
            this.$repositoryPluginManager.$loader.load(loadInformation),
            this.dependencies
        )
    }

    private async deploy(
        loadInformation: PluginLoadInformation
    ): Promise<void> {
        await this.$deployPluginManager.$runner.run(
            this.$deployPluginManager.$loader.load(loadInformation),
            this.dependencies
        )
    }

    public async publish(loadInformation: {
        buildScript: PluginLoadInformation
        repository: PluginLoadInformation
        deploy: PluginLoadInformation
    }): Promise<void> {
        const { buildScript, repository, deploy } = loadInformation

        await this.buildScript(buildScript)

        await this.repository(repository)

        await this.deploy(deploy)
    }
}
