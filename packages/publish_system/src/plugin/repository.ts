import { GitShell } from '../core/git'
import {
    PublishPlugin,
    type PublishPluginDynamicConfig,
    type PublishPluginStaticConfig,
} from './publish.plugin'

export interface RepositoryStaticConfig extends PublishPluginStaticConfig {}

export type RepositoryDynamicConfig = PublishPluginDynamicConfig & {
    gitPath: string
}
/**
 * Abstract class representing a repository plugin.
 * Extends the PublishPlugin class.
 */
export abstract class RepositoryPlugin<
    Static extends RepositoryStaticConfig = RepositoryStaticConfig,
    Dynamic extends RepositoryDynamicConfig = RepositoryDynamicConfig,
> extends PublishPlugin<Static, Dynamic> {
    private _$git: GitShell | undefined = undefined

    public get $git(): GitShell {
        if (this._$git === undefined) {
            this._$git = new GitShell(this.dynamicConfig)
        }
        return this._$git
    }
}
