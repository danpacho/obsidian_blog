import type { BuilderPlugin } from '../..'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'

export interface MetaValidatorConfig extends ContentMetaGeneratorOptions {}
export const MetaValidator = (
    option: MetaValidatorConfig = defaultContentMetaBuilderOptions
): BuilderPlugin['build:origin:tree'] => {
    return async ({ meta, logger }) => {
        const { contentMeta } = option

        const engine = meta(contentMeta)

        return {
            name: 'MetaValidator',
            exclude: 'description.md',
            skipFolderNode: true,
            walker: async (node) => {
                if (node.category !== 'TEXT_FILE') return
                if (!node.buildInfo) return

                const { build_path } = node.buildInfo

                const originValid = await engine.extractFromFile(
                    build_path.origin
                )
                if (originValid.success) return

                const generatedMeta = engine.generate({})
                if (!generatedMeta) {
                    logger.error(
                        `Meta invalid: default meta generation error at ${build_path.origin}`
                    )
                    return
                }

                const defaultGeneration = await engine.update({
                    injectPath: build_path.origin,
                    meta: generatedMeta,
                })

                if (!defaultGeneration.success) {
                    logger.error(
                        `Meta invalid: default meta injection error at ${build_path.origin}`
                    )
                    return
                } else {
                    logger.info(
                        `Meta invalid: default meta injection success at ${build_path.origin}`
                    )
                }
            },
        }
    }
}
