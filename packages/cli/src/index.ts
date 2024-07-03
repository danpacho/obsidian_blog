#!/usr/bin/env node

import pkg from '../package.json'
import { CLI } from './core/cli.js'
import { PkgManager } from './core/pkg_manager.js'
import { GithubRepository } from './core/repo.js'

type BloggerCLIOptions = {
    /**
     * Log output
     * @default true
     */
    verbose: boolean
    /**
     * Use TypeScript
     * @default true
     */
    ts: boolean
}

export class BloggerCLI extends CLI<BloggerCLIOptions> {
    private readonly $repo: GithubRepository
    private readonly $pkgManager: PkgManager

    private async installBridgePkg(installPath: string): Promise<void> {
        const { ts: isTs, verbose: log } = this.programOptions

        const repository_path =
            `https://github.com/danpacho/obsidian_blog/tree/main/packages/cli/src/template/${isTs ? 'ts' : 'js'}` as const

        log &&
            this.$logger.info(
                `Fetching repository information... for ${repository_path}`
            )
        const repo = new URL(repository_path!)
        const repoInfo = await this.$repo.getRepoInfo(repo)
        if (!repoInfo) {
            this.$logger.error('Repository not found')
            return
        }
        log &&
            this.$logger.success(
                `Repository: ${repoInfo.username}/${repoInfo.name}`
            )
        log && this.$logger.success(`Branch: ${repoInfo.branch}`)

        try {
            // TODO: check this part
            await this.$io.writer.createFolder(installPath)

            await this.$repo.downloadAndExtractRepo(installPath, repoInfo, {
                onRetry: (e, attempt) => {
                    this.$logger.log(
                        `Attempt ${attempt} failed: ${e.message}, retrying...`
                    )
                },
            })

            this.$logger.success(
                `Repository installed successfully at ${installPath}`
            )
            // TODO: remove deleteFolder__FORCE for production code
            await this.$io.writer.deleteFolder__FORCE(installPath)
        } catch (e) {
            this.$logger.error(JSON.stringify(e))
        }
    }

    private parseArgOptions(arg: string): string {
        const isFirstCharEqual = arg.slice(0, 1) === '='
        if (isFirstCharEqual) {
            const parsed = arg.replace('=', '')
            return parsed
        }

        return arg
    }

    private parseBooleanArgOptions(arg: string): boolean {
        const parsedArg = this.parseArgOptions(arg)
        return parsedArg === 'true' ? true : false
    }

    private registerOptions(): void {
        this.addCommand({
            optFlag: '-v, --verbose [option]',
            optDescription: 'Log output',
            optDefaultValue: true,
            optArgParser: (value) => this.parseBooleanArgOptions(value),
        })
        this.addCommand({
            optFlag: '-t --ts [option]',
            optDescription: 'Use TypeScript',
            optDefaultValue: true,
            optArgParser: (value) => this.parseBooleanArgOptions(value),
        })
    }

    public constructor() {
        super({
            info: {
                name: pkg.name,
                version: pkg.version,
                description: pkg.description,
            },
        })

        this.$repo = new GithubRepository()
        this.$pkgManager = new PkgManager()

        // Add global options
        this.registerOptions()

        this.addCommand({
            cmdFlag: 'create',
            argFlag: ['<install_path>'],
            cmdDescription: 'Fetch information about a GitHub repository',
            cmdAction: async ({ install_path }) => {
                await this.installBridgePkg(install_path)
            },
        })

        this.addCommand({
            cmdFlag: 'install',
            cmdDescription: 'Install a package',
            cmdAction: async () => {
                this.$logger.info('Installing package...')
                const pkgManager = this.$pkgManager.getPkgManager()
                await this.$pkgManager.install(pkgManager)
                this.$logger.success('Package installed successfully')
            },
        })

        // TODO: write down the file based on the user build options e.g) origin path, build path, etc...
    }

    public run() {
        this.$program.parse(process.argv)
    }
}

const cli = new BloggerCLI()

cli.run()
