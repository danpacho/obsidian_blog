import { PublishPlugin, PublishPluginConstructor } from './publish.plugin'

export interface DeployConstructor extends PublishPluginConstructor {}

/**
 * Abstract class representing a deploy plugin.
 * Extends the PublishPlugin class.
 */
export abstract class DeployPlugin extends PublishPlugin {
    /**
     * Creates a new instance of the DeployPlugin class.
     * @param options - The options for the deploy plugin.
     */
    public constructor(options: DeployConstructor) {
        super(options)
    }

    /**
     * Abstract method for deploying the plugin.
     * @param deployParameters - The parameters for the deployment.
     * @returns A promise that resolves when the deployment is complete.
     */
    public abstract deploy(
        deployParameters: Record<string, unknown>
    ): Promise<unknown>
}
