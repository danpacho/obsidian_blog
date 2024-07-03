#!/usr/bin/env node

import { ShellExecutor } from '@obsidian_blogger/helpers/shell'
import pkg from '../package.json'
import { CLI } from './core/cli.js'
import { PkgManager } from './core/pkg_manager.js'
import { GithubRepository } from './core/repo.js'
import { templateInjector } from './core/template.injector.js'

interface InstallConfig {
    install_path: string
    build_root: string
    build_assets: string
    build_contents: string
    install_pkg?: string
}

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
    private readonly $shell: ShellExecutor

    private async getRepoInfo(repo_url: string) {
        const repo = new URL(repo_url)
        const repoInfo = await this.$repo.getRepoInfo(repo)
        if (!repoInfo) {
            this.$logger.error('Repository not found')
            return
        }
        return repoInfo
    }

    private reportError(e: unknown) {
        const REPORT_REPO = 'https://github.com/danpacho/obsidian_blog' as const

        this.$logger.error(JSON.stringify(e))
        this.$logger.log(
            `Failed to install bridge package, please raise an issue on ${REPORT_REPO}`
        )
    }

    private async installBridgePkg({
        install_path,
        build_root,
        build_assets,
        build_contents,
    }: InstallConfig): Promise<void> {
        const { ts: isTs } = this.programOptions

        const repository_path =
            `https://github.com/danpacho/obsidian_blog/tree/main/packages/cli/src/template/${isTs ? 'ts' : 'js'}` as const

        const repoInfo = await this.getRepoInfo(repository_path)
        if (!repoInfo) return

        try {
            const isInstalled = await this.$io.reader.fileExists(install_path)
            if (isInstalled) {
                this.$logger.info('Bridge package already installed')
                return
            }

            await this.$io.writer.createFolder(install_path)

            await this.$repo.downloadAndExtractRepo(install_path, repoInfo, {
                onRetry: (e, attempt) => {
                    this.$logger.log(
                        `Attempt ${attempt} failed: ${e.message}, retrying...`
                    )
                },
            })

            const success = await this.$io.reader.fileExists(install_path)
            if (!success) {
                this.$logger.error('Failed to install bridge package')
            }

            const injectionTargetFiles = {
                build: `${install_path}/src/build.ts`,
                publish: `${install_path}/src/publish.ts`,
            } as const

            const injectionTemplate = {
                build: {
                    root: build_root,
                    assets: build_assets,
                    contents: build_contents,
                },
                publish: {},
            } as const

            await Promise.all(
                Object.entries(injectionTargetFiles).map(
                    async ([key, file]) => {
                        const source = await this.$io.reader.readFile(file)
                        if (!source.success) {
                            this.$logger.error(`Failed to read file for ${key}`)
                            return
                        }

                        const injected = templateInjector(
                            source.data,
                            injectionTemplate[
                                key as keyof typeof injectionTemplate
                            ]
                        )

                        if (!injected.success) {
                            this.$logger.error(
                                `Failed to inject template for ${key} file. \nIssues:\n\t${injected.issues.join('\n\t')}`
                            )
                            return
                        }

                        const write = await this.$io.writer.write({
                            filePath: file,
                            data: injected.replaced,
                        })
                        if (!write.success) {
                            this.$logger.error(
                                `Failed to write to file for ${key}`
                            )
                        }
                    }
                )
            )

            this.$logger.success(
                `Bridge package installed successfully at ${install_path}`
            )
        } catch (e) {
            this.reportError(e)
        }
    }

    private async runPackageInstallation(install_path: string) {
        this.$logger.info(`Installing package... at ${install_path}`)
        const pkgManager = this.$pkgManager.getPkgManager()
        await this.$pkgManager.install(pkgManager, `--prefix ${install_path}`)
        this.$logger.success('Package installed successfully')
    }

    private async generatePluginTemplate({
        bridge_root_path,
        plugin_name,
        plugin_type,
    }: {
        bridge_root_path: string
        plugin_name: string
        plugin_type: 'build:contents' | 'build:tree' | 'walk:tree'
    }) {
        const { ts: isTs } = this.programOptions

        const repository_path =
            `https://github.com/danpacho/obsidian_blog/tree/main/packages/cli/src/template/plugin/${isTs ? 'ts' : 'js'}/${plugin_type}` as const

        const repoInfo = await this.getRepoInfo(repository_path)
        if (!repoInfo) return

        try {
            const pluginWorkspace = `${bridge_root_path}/plugin/${plugin_type}`

            await this.$io.writer.createFolder(pluginWorkspace)
            await this.$repo.downloadAndExtractRepo(pluginWorkspace, repoInfo, {
                onRetry: (e, attempt) => {
                    this.$logger.log(
                        `Attempt ${attempt} failed: ${e.message}, retrying...`
                    )
                },
            })

            const success = await this.$io.reader.fileExists(pluginWorkspace)
            if (!success) {
                this.$logger.error('Failed to generate plugin')
            }
            const pluginTemplateSrcPath = `${pluginWorkspace}/template.txt`
            const template = await this.$io.reader.readFile(
                pluginTemplateSrcPath
            )
            if (!template.success) {
                this.$logger.error('Failed to read plugin template')
                return
            }
            const pluginNameCamelCased = plugin_name
                .replace(/ /g, '_')
                .toLowerCase()
                .trim()
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join('')

            const injection = templateInjector(template.data, {
                plugin_name: pluginNameCamelCased,
            })
            if (!injection.success) {
                this.$logger.error(
                    `Failed to inject plugin template\nIssues:\n\t${injection.issues.join('\n\t')}`
                )
            }

            const pluginPrefix = plugin_name
                .split('-')
                .join('_')
                .replace(/ /g, '_')
                .trim()
                .toLowerCase()
            const pluginGenPath = `${pluginWorkspace}/${pluginPrefix}.${isTs ? 'ts' : 'js'}`
            const write = await this.$io.writer.write({
                filePath: pluginGenPath,
                data: injection.replaced,
            })

            await this.$io.writer.deleteFile(pluginTemplateSrcPath)
            if (!write.success) {
                this.$logger.error('Failed to write plugin template')
            }

            this.$logger.success(
                `Plugin generated successfully at ${pluginGenPath}`
            )
        } catch (e) {
            this.reportError(e)
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
        this.$shell = new ShellExecutor(100)
        this.$pkgManager = new PkgManager(this.$shell)

        // Add global options
        this.registerOptions()

        // CREATE COMMAND
        this.addCommand({
            cmdFlag: 'create',
            argFlag: [
                '<install_path>',
                '<build_root>',
                '<build_contents>',
                '<build_assets>',
                '[install_pkg]',
            ],
            cmdDescription: 'Fetch information about a GitHub repository',
            cmdAction: async (config: InstallConfig) => {
                await this.installBridgePkg(config)
                const skipInstall =
                    config.install_pkg === 'false' || config.install_pkg === 'f'
                if (skipInstall) return
                await this.runPackageInstallation(config.install_path)
            },
        })

        // INSTALL COMMAND
        this.addCommand({
            cmdFlag: 'install',
            cmdDescription: 'Install a package',
            argFlag: ['<install_path>'],
            cmdAction: async ({ install_path }) => {
                await this.runPackageInstallation(install_path)
            },
        })

        // PLUGIN COMMAND
        this.addCommand({
            cmdFlag: 'plugin',
            cmdDescription: 'Generate plugin template',
            argFlag: ['<bridge_root_path>', '<plugin_name>', '<plugin_type>'],
            cmdAction: async (config) => {
                const assertPluginType = (
                    plugin_type: string
                ): plugin_type is
                    | 'build:contents'
                    | 'build:tree'
                    | 'walk:tree' => {
                    return [
                        'build:contents',
                        'build:tree',
                        'walk:tree',
                    ].includes(plugin_type)
                }

                if (!assertPluginType(config.plugin_type)) {
                    this.$logger.error('Invalid plugin type')
                    return
                }

                await this.generatePluginTemplate({
                    bridge_root_path: config.bridge_root_path,
                    plugin_name: config.plugin_name,
                    plugin_type: config.plugin_type,
                })
            },
        })
    }

    public run() {
        this.$program.parse(process.argv)
    }
}

const cli = new BloggerCLI()

cli.run()
