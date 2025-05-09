import { BuildScriptPlugin, type BuildScriptStaticConfig } from '../../build'
import type {
    PublishCommandResult,
    PublishPluginResponse,
} from '../../publish.plugin'

export class BlogBuilder extends BuildScriptPlugin {
    protected defineStaticConfig(): BuildScriptStaticConfig {
        return {
            name: 'blog-build-script-runner',
            description: 'Run blog build scripts',
            dynamicConfigSchema: {
                command: {
                    type: 'Array<string>',
                    description: 'The build script command',
                },
                cwd: {
                    type: 'string',
                    description: 'The current working directory',
                },
            },
        }
    }

    public async execute() {
        return await this.build()
    }

    private async build() {
        const error: PublishPluginResponse['error'] = []

        this.$jobManager.registerJobs([
            {
                name: 'detect-package-manager',
                execute: async () => {
                    try {
                        await this.detectPackageManager(this.dynamicConfig.cwd)
                    } catch (e) {
                        this.invokeError(error, {
                            e,
                            message: 'package manager detection failed',
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
                name: 'build',
                execute: async () => {
                    let exec: PublishCommandResult | null = null
                    try {
                        const buildResult = await this.pkg()
                        if (buildResult.success) {
                            exec = buildResult.data
                        } else {
                            throw buildResult.error
                        }
                    } catch (e) {
                        this.invokeError(
                            error,
                            exec
                                ? {
                                      e,
                                      message: 'build failed',
                                      commandResult: exec,
                                  }
                                : {
                                      e,
                                      message: 'build failed',
                                  }
                        )
                    } finally {
                        this.$logger.success('Build succeeded')
                        return {
                            error,
                            history: this.$logger.getHistory(),
                            stdout: exec?.stdout,
                        }
                    }
                },
            },
        ])

        await this.$jobManager.processJobs()

        return this.$jobManager.history
    }
}
