import type { PluginAdapter } from '..'
import { ObsidianReferencePlugin } from './build:contents/obsidian.reference'
import {
    type CategoryDescriptionGeneratorConfig,
    CategoryDescriptionGeneratorPlugin,
} from './walk:tree/category.description.generator'
import {
    type MetaBuilderConfig,
    MetaBuilderPlugin,
} from './walk:tree/meta.builder'
import {
    MetaValidatorConfig,
    MetaValidatorPlugin,
} from './walk:tree/meta.validator'
import {
    type PaginationBuilderConfig,
    PaginationBuilderPlugin,
} from './walk:tree/pagination.builder'
import {
    type SeriesInfoGeneratorConfig,
    SeriesInfoGeneratorPlugin,
} from './walk:tree/series.info.generator'
import {
    type StaticParamBuilderConfig,
    StaticParamBuilderPlugin,
} from './walk:tree/static.param.builder'

export interface CorePluginsConfig {
    /**
     * @description Meta validator configuration
     */
    metaValidator?: MetaValidatorConfig
    /**
     * @description Pagination builder configuration
     */
    paginationBuilder?: PaginationBuilderConfig
    /**
     * @description Meta builder configuration
     */
    metaBuilder?: MetaBuilderConfig
    /**
     * @description Static param builder configuration
     */
    staticParamBuilder?: StaticParamBuilderConfig
    /**
     * @description Series info generator configuration
     */
    seriesInfoGenerator?: SeriesInfoGeneratorConfig
    /**
     * @description Category description generator configuration
     */
    categoryDescriptionGenerator?: CategoryDescriptionGeneratorConfig
}

export const CorePlugins = (coreConfig?: CorePluginsConfig) => {
    return {
        'walk:tree': [
            new MetaValidatorPlugin(coreConfig?.metaValidator),
            new MetaBuilderPlugin(coreConfig?.metaBuilder),
            new StaticParamBuilderPlugin(coreConfig?.staticParamBuilder),
            new PaginationBuilderPlugin(coreConfig?.paginationBuilder),
            new SeriesInfoGeneratorPlugin(coreConfig?.seriesInfoGenerator),
            new CategoryDescriptionGeneratorPlugin(
                coreConfig?.categoryDescriptionGenerator
            ),
        ],
        'build:contents': [new ObsidianReferencePlugin()],
    } as const satisfies PluginAdapter
}
