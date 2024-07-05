import { Logger } from '@obsidian_blogger/helpers/logger'

export interface DeployPluginConstructor {}

export abstract class DeployPlugin {
    protected readonly $logger: Logger
    public constructor(protected readonly options: DeployPluginConstructor) {
        this.$logger = new Logger()
    }

    public updateLoggerName(name: string): void {
        this.$logger.updateName(name)
    }

    public abstract deploy(
        deployParameters: Record<string, unknown>
    ): Promise<void>
}
