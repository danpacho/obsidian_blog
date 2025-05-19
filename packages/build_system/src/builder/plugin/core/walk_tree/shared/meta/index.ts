import type { ParamAnalyzerConstructor } from '../../../../../../routes'
import { ContentMetaGenerator, type MetaGenerator } from './generator'
import {
    CategoryMetaParser,
    ContentMetaParser,
    type MetaParser,
} from './parser'

export interface ContentMetaGeneratorOptions {
    contentMeta?: {
        parser: MetaParser
        generator: MetaGenerator
    }
    paramAnalyzer?: ParamAnalyzerConstructor
}
export const defaultContentMetaBuilderOptions = {
    contentMeta: {
        parser: ContentMetaParser,
        generator: ContentMetaGenerator,
    },
} satisfies ContentMetaGeneratorOptions

export interface CategoryDescriptionGeneratorOptions {
    categoryMeta: {
        parser: MetaParser
        generator: MetaGenerator
    }
}
export const defaultCategoryDescriptionBuilderOptions: CategoryDescriptionGeneratorOptions =
    {
        categoryMeta: {
            parser: CategoryMetaParser,
            generator: ContentMetaGenerator,
        },
    }
