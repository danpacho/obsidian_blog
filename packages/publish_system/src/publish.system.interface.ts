import type {
    BuildScriptPlugin,
    DeployPlugin,
    RepositoryPlugin,
} from './publisher/plugin'

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
    deploy: DeployPlugin
}

type Adapter<T> = {
    [PluginKey in keyof T]?: Array<T[PluginKey]> | T[PluginKey]
}

export type PublishSystemPluginAdapter = Adapter<PublishSystemPlugin>
