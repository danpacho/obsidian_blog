import { GitShell, GitShellConstructor } from '../core/git'
import { PublishPlugin, PublishPluginConstructor } from './publish.plugin'

export interface RepositoryConstructor
    extends PublishPluginConstructor,
        GitShellConstructor {}

/**
 * Abstract class representing a repository plugin.
 * Extends the PublishPlugin class.
 */
export abstract class RepositoryPlugin extends PublishPlugin {
    protected readonly $git: GitShell

    /**
     * Creates a new instance of the RepositoryPlugin class.
     * @param options - The options for the repository plugin.
     */
    public constructor(options: RepositoryConstructor) {
        super(options)
        this.$git = new GitShell(options)
    }

    /**
     * Saves the specified parameters to the repository.
     * @param saveParameters - The parameters to save.
     * @returns A promise that resolves when the save operation is complete.
     */
    public abstract save(
        saveParameters: Record<string, unknown>
    ): Promise<unknown>
}
