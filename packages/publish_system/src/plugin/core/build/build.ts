import { BuildScriptPlugin, type BuildScriptStaticConfig } from '../../build'

export class BlogBuilder extends BuildScriptPlugin {
    protected defineStaticConfig(): BuildScriptStaticConfig {
        return {
            name: 'blog-build-script-runner',
            description: 'Run blog build scripts',
            dynamicConfigDescriptions: [
                {
                    property: 'cwd',
                    type: 'string',
                },
                {
                    property: 'command',
                    type: 'Array<string>',
                },
            ],
        }
    }

    public async execute() {
        return await this.build()
    }

    private async build() {
        this.$jobManager.registerJobs([
            {
                name: 'detect-package-manager',
                execute: async () =>
                    await this.detectPackageManager(this.dynamicConfig.cwd),
            },
            {
                name: 'build',
                execute: async () => {
                    const buildResult = await this.pkg()
                    if (!buildResult.success) {
                        this.$logger.error('Build failed')
                        this.$logger.log(JSON.stringify(buildResult, null, 2))
                        return buildResult
                    }

                    this.$logger.success('Build succeeded')
                    this.$logger.log(
                        JSON.stringify(buildResult.data.stdout, null, 2)
                    )
                    return buildResult
                },
            },
        ])

        await this.$jobManager.processJobs()

        return this.$jobManager.history
    }
}
