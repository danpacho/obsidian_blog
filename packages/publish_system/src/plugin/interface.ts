import type { BuildScriptPlugin } from './build'
import type { DeployPlugin } from './deploy'
import type { RepositoryPlugin } from './repository'

export interface PublishSystemPlugin {
    /**
     *  Build script plugin
     */
    buildScript: BuildScriptPlugin
    /**
     *  Repository plugin
     */
    repository: RepositoryPlugin
    /**
     *  Deploy plugin
     */
    deploy?: DeployPlugin
}

type Adapter<T> = {
    [PluginKey in keyof T]?: Array<T[PluginKey]> | T[PluginKey]
}

export type PublishSystemPluginAdapter = Adapter<PublishSystemPlugin>
