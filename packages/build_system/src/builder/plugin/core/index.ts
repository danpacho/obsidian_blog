import type { PluginAdapter } from '..'
import { ObsidianReference } from './contents/obsidian.reference'
import { CategoryDescriptionGenerator } from './tree/category.description.generator'
import { MetaBuilder, type MetaBuilderConfig } from './tree/meta.builder'
import {
    PaginationBuilder,
    type PaginationBuilderConfig,
} from './tree/pagination.builder'
import {
    StaticParamBuilder,
    type StaticParamBuilderOptions,
} from './tree/static.param.builder'

export interface CorePluginsConfig {
    paginationBuilder?: PaginationBuilderConfig
    metaBuilder?: MetaBuilderConfig
    staticParamBuilder?: StaticParamBuilderOptions
}
export const CorePlugins = (coreConfig?: CorePluginsConfig) => {
    return {
        'walk:generated:tree': [
            MetaBuilder(coreConfig?.metaBuilder),
            StaticParamBuilder(coreConfig?.staticParamBuilder),
            PaginationBuilder(coreConfig?.paginationBuilder),
            CategoryDescriptionGenerator(),
        ],
        'build:contents': [ObsidianReference()],
    } as const satisfies PluginAdapter
}
