import {
    PublishPlugin,
    type PublishPluginDynamicConfig,
    type PublishPluginStaticConfig,
} from './publish.plugin'

export interface DeployStaticConfig extends PublishPluginStaticConfig {}
export type DeployPluginDynamicConfig = PublishPluginDynamicConfig
/**
 * Abstract class representing a deploy plugin.
 * Extends the PublishPlugin class.
 */
export abstract class DeployPlugin<
    Static extends DeployStaticConfig = DeployStaticConfig,
    Dynamic extends DeployPluginDynamicConfig = DeployPluginDynamicConfig,
> extends PublishPlugin<Static, Dynamic> {}
