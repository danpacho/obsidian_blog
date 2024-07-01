#!/usr/bin/env node

import pkg from '../package.json'
import { CLI, GithubRepository, PkgManager } from './core'

export class BloggerCLI extends CLI {
    private readonly $repo: GithubRepository
    private readonly $pkgManager: PkgManager
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
        this.addCommand({
            optFlag: '-v, --verbose [option]',
            optDescription: 'Log output',
            optDefaultValue: true,
            optArgParser: (value, prev) => {
                value.slice(0, 1) === '=' && (value = value.slice(1)) // Remove '=' if
                if (value === 'false') {
                    return false
                } else return prev
            },
        })

        this.addCommand({
            cmdFlag: 'repo',
            argFlag: ['<repository_path>', '<install_path>'],
            cmdDescription: 'Fetch information about a GitHub repository',
            cmdAction: async ({ repository_path, install_path }) => {
                const log: boolean = this.programOptions.verbose

                log &&
                    this.$logger.info(
                        `Fetching repository information... for ${JSON.stringify(repository_path)}`
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
                await this.$io.writer.createFolder(install_path)
                await this.$repo.downloadAndExtractRepo(install_path, repoInfo)

                this.$logger.success('Repository installed successfully')
                // TODO: remove deleteFolder__FORCE for production code
                await this.$io.writer.deleteFolder__FORCE(install_path)
            },
        })

        this.addCommand({
            cmdFlag: 'install',
            cmdDescription: 'Install a package',
            cmdAction: async () => {
                this.$logger.info('Installing package...')
                // const pkgManager = this.$pkgManager.getPkgManager()
                await this.$pkgManager.install('pnpm')
                this.$logger.success('Package installed successfully')
            },
        })
    }

    public async run() {
        this.$program.parse(process.argv)
    }
}

const cli = new BloggerCLI()

cli.run()
