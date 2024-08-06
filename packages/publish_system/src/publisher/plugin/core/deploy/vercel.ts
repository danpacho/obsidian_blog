import { DeployPlugin, type DeployStaticConfig } from '../../deploy'

export type VercelDeployConfig = {
    someConfig: string
}

// https://vercel.com/guides/how-can-i-use-github-actions-with-vercel
// Just demonstrating the concept of a deploy plugin

export class VercelDeploy extends DeployPlugin {
    protected override defineStaticConfig(): DeployStaticConfig {
        return {
            name: 'vercel',
            description: 'Deploy to Vercel',
            dynamicConfigSchema: {
                cwd: {
                    type: 'string',
                    description: 'The current working directory',
                },
                someConfig: {
                    type: 'string',
                    description: 'Some config',
                },
            },
        }
    }

    public async execute() {
        this.$logger.log(JSON.stringify(this.dynamicConfig, null, 4))
        this.$logger.log('Deploying to Vercel...')
        return this.$jobManager.history
    }
}
