import { type PluginDynamicConfigPrimitiveType } from '../arg_parser'

const DIVIDER = '::' as const

const PREFIX = {
    buildSystem: `build_system${DIVIDER}`,
    publishSystem: `publish_system${DIVIDER}`,
} as const

/**
 * Manager names, bridge store names
 */
export const MANAGER_NAME = {
    buildSystem: {
        internal: `${PREFIX.buildSystem}internal`,
        buildTree: `${PREFIX.buildSystem}build_tree`,
        walkTree: `${PREFIX.buildSystem}walk_tree`,
        buildContents: `${PREFIX.buildSystem}build_contents`,
    },
    publishSystem: {
        buildScript: `${PREFIX.publishSystem}build_script`,
        repository: `${PREFIX.publishSystem}repository`,
        deploy: `${PREFIX.publishSystem}deploy`,
    },
} as const

const STORE_FOLDER = '.store' as const
/**
 * Store prefixes
 */
export const STORE_PREFIX = {
    buildSystem: `${STORE_FOLDER}/build`,
    publishSystem: `${STORE_FOLDER}/publish`,
} as const

export type USER_PLUGIN_LOAD_STATUS_KEY = '$$load_status$$'
export type USER_PLUGIN_LOAD_STATUS_VALUE = 'include' | 'exclude'
export type LOAD_STATUS = {
    [key in USER_PLUGIN_LOAD_STATUS_KEY]: USER_PLUGIN_LOAD_STATUS_VALUE
}
export type USER_PLUGIN_LOAD_INPUT = LOAD_STATUS &
    Record<string, PluginDynamicConfigPrimitiveType>
