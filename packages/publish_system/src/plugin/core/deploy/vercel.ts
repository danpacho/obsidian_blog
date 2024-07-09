import { DeployConstructor, DeployPlugin } from '../../deploy'

export type VercelDeployConfig = {
    someConfig: string
}

// https://vercel.com/guides/how-can-i-use-github-actions-with-vercel
// Just demonstrating the concept of a deploy plugin

interface VercelDeployConstructor extends DeployConstructor {}
export class VercelDeploy extends DeployPlugin {
    public constructor(options: VercelDeployConstructor) {
        super(options)
    }

    public async deploy(vercelConfig: VercelDeployConfig): Promise<unknown> {
        return vercelConfig
    }
}
