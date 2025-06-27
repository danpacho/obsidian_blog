import { ShellExecutor } from '@obsidian_blogger/helpers/shell'

import pkg from '../package.json'

import { CLI } from './core/cli.js'
import { PkgManager } from './core/pkg_manager.js'
import { GithubRepository } from './core/repo.js'
import { templateInjector } from './core/template.injector.js'

interface InstallConfigRecord {
    install: {
        bridge_install_root: string
        install_pkg?: string
    }
    build: {
        bridge_install_root: string
        obsidian_vault_root: string
        blog_assets_root: string
        blog_contents_root: string
    }
    publish: {
        bridge_install_root: string
    }
}

type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}
type InstallConfig = Prettify<
    InstallConfigRecord['install'] &
        InstallConfigRecord['build'] &
        InstallConfigRecord['publish']
>

type BloggerCLIOptions = {
    /**
     * Log output
     * @default true
     */
    verbose: boolean
    /**
     * Use typeScript
     * @default true
     */
    ts: boolean
    /**
     * Use javaScript
     */
    js: boolean
}

export class BloggerCLI extends CLI<BloggerCLIOptions> {
    private readonly $repo: GithubRepository
    private readonly $pkgManager: PkgManager
    private readonly $shell: ShellExecutor

    private camelToSnakeCase(str: string): string {
        return str
            .trim()
            .split('')
            .map((char, i) =>
                char === char.toUpperCase()
                    ? `${i === 0 ? '' : '_'}${char.toLowerCase()}`
                    : char
            )
            .join('')
    }

    private toUpperCamelCase(str: string): string {
        return str
            .trim()
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join('')
    }

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
        this.$logger.error(JSON.stringify(e))
        this.$logger.log(
            `Failed to install bridge package, please raise an issue on ${this.repo}`
        )
    }

    private async installBridgePkg({
        bridge_install_root,
        // bridge
        obsidian_vault_root,
        blog_assets_root,
        blog_contents_root,
    }: InstallConfig): Promise<void> {
        const { ts, js } = this.programOptions
        const isTs = ts || !js

        const repository_path =
            `${this.repo}/tree/main/packages/cli/src/template/${isTs ? 'ts' : 'js'}` as const

        const repoInfo = await this.getRepoInfo(repository_path)
        if (!repoInfo) return

        try {
            const isInstalled =
                await this.$io.reader.fileExists(bridge_install_root)
            if (isInstalled) {
                this.$logger.info('Bridge package already installed')
                return
            }

            await this.$io.writer.createFolder(bridge_install_root)

            await this.$repo.downloadAndExtractRepo(
                bridge_install_root,
                repoInfo,
                {
                    onRetry: (e, attempt) => {
                        this.$logger.log(
                            `Attempt ${attempt} failed: ${JSON.stringify(e, null, 4)}, retrying...`
                        )
                    },
                }
            )

            const success =
                await this.$io.reader.fileExists(bridge_install_root)
            if (!success) {
                this.$logger.error('Failed to install bridge package')
            }

            const injectionTargetFiles = {
                build: `${bridge_install_root}/src/build_core.ts`,
                publish: `${bridge_install_root}/src/publish_core.ts`,
            } as const

            const injectionTemplate = {
                build: {
                    bridge_install_root,
                    // build path gen properties
                    obsidian_vault_root,
                    blog_assets_root,
                    blog_contents_root,
                },
                publish: {
                    bridge_install_root,
                },
            } as const satisfies Omit<InstallConfigRecord, 'install'>

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

            this.$logger.success(`Bridge package installed`)
            this.$logger.log(`Gen at ${bridge_install_root}`)
        } catch (e) {
            this.reportError(e)
        }
    }

    private async installTemplate(install_path: string) {
        const root = `${this.repo}/tree/main/packages/template` as const

        const repoInfo = await this.getRepoInfo(root)

        if (!repoInfo) {
            this.$logger.error('Failed to get repo info for template')
            return
        }

        try {
            const isInstalled = await this.$io.reader.fileExists(install_path)
            if (isInstalled) {
                this.$logger.info('Template already installed')
                return
            }

            await this.$io.writer.createFolder(install_path)

            await this.$repo.downloadAndExtractRepo(install_path, repoInfo, {
                onRetry: (e, attempt) => {
                    this.$logger.log(
                        `Attempt ${attempt} failed: ${JSON.stringify(e, null, 4)}, retrying...`
                    )
                },
            })

            const success = await this.$io.reader.fileExists(install_path)
            if (!success) {
                this.$logger.error('Failed to install template')
            }
            this.$logger.success('Template installed')
            this.$logger.log(`Gen at ${install_path}`)
        } catch (e) {
            this.reportError(e)
        }
    }

    private async runPackageInstallation(install_path: string) {
        this.$logger.info(`Installing package`)
        const pkgManager = this.$pkgManager.getPkgManager()
        await this.$pkgManager.install(pkgManager, {
            spawn: { cwd: install_path },
        })
        // `--prefix ${install_path}` can be used to install package in a specific directory
        this.$logger.success('Package installed')
        this.$logger.log(`Gen at ${install_path}`)
    }

    private async generatePluginTemplate({
        type,
        bridge_root_path,
        plugin_name,
        plugin_type,
    }: {
        type: 'build' | 'publish'
        bridge_root_path: string
        plugin_name: string | undefined
        plugin_type:
            | ('build:contents' | 'build:tree' | 'walk:tree') // build plugin
            | ('build' | 'repository' | 'deploy') // publish plugin
    }) {
        plugin_name =
            plugin_name ??
            this.toUpperCamelCase(`${plugin_type.split(':').join('_')}_gen`)

        const { ts, js } = this.programOptions
        const isTs: boolean = ts || !js

        const repository_path =
            `${this.repo}/tree/main/packages/cli/src/template/plugin/${type}/${isTs ? 'ts' : 'js'}/${plugin_type}` as const

        const repoInfo = await this.getRepoInfo(repository_path)
        if (!repoInfo) return

        try {
            const pluginWorkspace = `${bridge_root_path}/plugin/${type}/${plugin_type}`

            await this.$io.writer.createFolder(pluginWorkspace)
            await this.$repo.downloadAndExtractRepo(pluginWorkspace, repoInfo, {
                onRetry: (e, attempt) => {
                    this.$logger.log(
                        `Attempt ${attempt} failed: ${JSON.stringify(e, null, 4)}, retrying...`
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

            const pluginNameCamelCased = this.toUpperCamelCase(plugin_name)
            const injection = templateInjector(template.data, {
                plugin_name: pluginNameCamelCased,
            })
            if (!injection.success) {
                this.$logger.error(
                    `Failed to inject plugin template\nIssues:\n\t${injection.issues.join('\n\t')}`
                )
            }

            const pluginGenPath = `${pluginWorkspace}/${this.camelToSnakeCase(plugin_name)}.${isTs ? 'ts' : 'js'}`
            const write = await this.$io.writer.write({
                filePath: pluginGenPath,
                data: injection.replaced,
            })

            await this.$io.writer.deleteFile(pluginTemplateSrcPath)
            if (!write.success) {
                this.$logger.error('Failed to write plugin template')
            }

            this.$logger.success(
                `${this.toUpperCamelCase(type)}Plugin @${plugin_type} generated`
            )
            this.$logger.log(`Gen at ${pluginGenPath}`)
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
            optFlag: '-t, --ts [option]',
            optDescription: 'Use typeScript',
            optDefaultValue: true,
            optArgParser: (value) => this.parseBooleanArgOptions(value),
        })
        this.addCommand({
            optFlag: '-j, --js [option]',
            optDescription: 'Use javaScript',
            optDefaultValue: false,
            optArgParser: (value) => this.parseBooleanArgOptions(value),
        })
    }

    private async buildTemplate(install_path: string): Promise<void> {
        const pkgManager = this.$pkgManager.getPkgManager()
        await this.$pkgManager.run(pkgManager, ['run', 'build'], {
            spawn: { cwd: install_path },
        })
    }
    /**
     * Initialize the bridge database
     */
    private async initializeBridgeDB(install_path: string): Promise<void> {
        const pkgManager = this.$pkgManager.getPkgManager()
        await this.$pkgManager.run(pkgManager, ['run', 'run:init'], {
            spawn: { cwd: install_path },
        })
    }

    private registerCommands(): void {
        // CREATE COMMAND
        this.addCommand({
            cmdFlag: 'create',
            argFlag: [
                '<bridge_install_root>',
                '<obsidian_vault_root>',
                '<blog_assets_root>',
                '<blog_contents_root>',
                '[install_pkg]',
            ],
            cmdDescription: 'Create a obsidian-blog bridge package',
            cmdAction: async (config: InstallConfig) => {
                await this.installBridgePkg(config)
                const skipInstall =
                    config.install_pkg === 'false' || config.install_pkg === 'f'
                if (skipInstall) return
                await this.runPackageInstallation(config.bridge_install_root)
                await this.buildTemplate(config.bridge_install_root)
                await this.initializeBridgeDB(config.bridge_install_root)
            },
        })

        // INSTALL COMMAND
        this.addCommand({
            cmdFlag: 'install',
            cmdDescription: 'Install a package',
            argFlag: ['<bridge_install_root>'],
            cmdAction: async ({ bridge_install_root }) => {
                await this.runPackageInstallation(bridge_install_root)
            },
        })

        // PLUGIN COMMAND
        this.addCommand({
            cmdFlag: 'plugin:build',
            cmdDescription: 'Generate build plugin template',
            argFlag: ['<bridge_root>', '<plugin_type>', '[plugin_name]'],
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
                    type: 'build',
                    bridge_root_path: config.bridge_root,
                    plugin_type: config.plugin_type,
                    plugin_name: config.plugin_name,
                })
            },
        })

        this.addCommand({
            cmdFlag: 'plugin:publish',
            cmdDescription: 'Generate publish plugin template',
            argFlag: ['<bridge_root_path>', '<plugin_type>', '[plugin_name]'],
            cmdAction: async (config) => {
                const assertPluginType = (
                    plugin_type: string
                ): plugin_type is 'build' | 'repository' | 'deploy' => {
                    return ['build', 'repository', 'deploy'].includes(
                        plugin_type
                    )
                }

                if (!assertPluginType(config.plugin_type)) {
                    this.$logger.error('Invalid plugin type')
                    return
                }

                await this.generatePluginTemplate({
                    type: 'publish',
                    bridge_root_path: config.bridge_root_path,
                    plugin_type: config.plugin_type,
                    plugin_name: config.plugin_name,
                })
            },
        })

        // TEMPLATE COMMAND
        this.addCommand({
            cmdFlag: 'template',
            cmdDescription: 'Install a template',
            argFlag: ['<install_path>'],
            cmdAction: async ({ install_path }) => {
                await this.installTemplate(install_path)
            },
        })
    }

    private constructor(public readonly repo: string) {
        super({
            info: {
                name: pkg.name,
                version: pkg.version,
                description: pkg.description,
            },
        })

        this.$repo = new GithubRepository()
        this.$shell = new ShellExecutor({
            historyLimit: 100,
        })
        this.$pkgManager = new PkgManager(this.$shell)

        // Add global options
        this.registerOptions()

        // Add commands
        this.registerCommands()
    }

    public run() {
        this.$program.parse(process.argv)
    }

    public static instance(repo: string): BloggerCLI {
        return new BloggerCLI(repo)
    }
}
