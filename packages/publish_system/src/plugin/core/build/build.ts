import { type BuildScriptConstructor, BuildScriptPlugin } from '../../build'
export type BlogBuildConfig = {
    buildScript: Array<string>
    verbose?: boolean
}

export class BlogBuilder extends BuildScriptPlugin {
    public constructor(options: BuildScriptConstructor) {
        super(options)
    }

    public async build({ buildScript, verbose = false }: BlogBuildConfig) {
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

        return history
    }
}
