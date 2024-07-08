import type { BuildScriptPlugin } from './build'
import type { DeployPlugin } from './deploy'
import type { RepositoryPlugin } from './repository'

export interface PublishSystemPlugin {
    /**
     * @description Build script plugin
     */
    buildScript: BuildScriptPlugin
    /**
     * @description Repository plugin
     */
    repository: RepositoryPlugin
    /**
     * @description Deploy plugin
     */
    deploy?: DeployPlugin
}

type Adapter<T> = {
    [PluginKey in keyof T]?: Array<T[PluginKey]> | T[PluginKey]
}

export type PublishSystemPluginAdapter = Adapter<PublishSystemPlugin>
