import type { ParamAnalyzerConstructor } from '../../../../../routes'
import { ContentMetaGenerator, type MetaGenerator } from './generator'
import { ContentMetaParser, type MetaParser } from './parser'

export interface MetaGeneratorOptions {
    contentMeta: {
        parser: MetaParser
        generator: MetaGenerator
    }
    paramAnalyzer?: ParamAnalyzerConstructor
}

export const defaultMetaBuilderOptions: MetaGeneratorOptions = {
    contentMeta: {
        parser: ContentMetaParser,
        generator: ContentMetaGenerator,
    },
}
