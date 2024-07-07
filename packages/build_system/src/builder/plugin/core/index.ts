import type { PluginAdapter } from '..'
import { ObsidianReference } from './contents/obsidian.reference'
import {
    CategoryDescriptionGenerator,
    type CategoryDescriptionGeneratorConfig,
} from './tree/category.description.generator'
import { MetaBuilder, type MetaBuilderConfig } from './tree/meta.builder'
import { MetaValidator, MetaValidatorConfig } from './tree/meta.validator'
import {
    PaginationBuilder,
    type PaginationBuilderConfig,
} from './tree/pagination.builder'
import {
    SeriesInfoGenerator,
    type SeriesInfoGeneratorConfig,
} from './tree/series.info.generator'
import {
    StaticParamBuilder,
    type StaticParamBuilderConfig,
} from './tree/static.param.builder'

export interface CorePluginsConfig {
    metaValidator?: MetaValidatorConfig
    paginationBuilder?: PaginationBuilderConfig
    metaBuilder?: MetaBuilderConfig
    staticParamBuilder?: StaticParamBuilderConfig
    seriesInfoGenerator?: SeriesInfoGeneratorConfig
    categoryDescriptionGenerator?: CategoryDescriptionGeneratorConfig
}
export const CorePlugins = (coreConfig?: CorePluginsConfig) => {
    return {
        'walk:tree': [
            MetaValidator(coreConfig?.metaValidator),
            MetaBuilder(coreConfig?.metaBuilder),
            StaticParamBuilder(coreConfig?.staticParamBuilder),
            PaginationBuilder(coreConfig?.paginationBuilder),
            SeriesInfoGenerator(coreConfig?.seriesInfoGenerator),
            CategoryDescriptionGenerator(
                coreConfig?.categoryDescriptionGenerator
            ),
        ],
        'build:contents': [ObsidianReference()],
    } as const satisfies PluginAdapter
}
