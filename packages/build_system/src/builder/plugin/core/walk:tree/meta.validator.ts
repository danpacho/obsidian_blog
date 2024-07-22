import type { FileTreeNode } from 'packages/build_system/src/parser'
import {
    WalkTreePlugin,
    WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'

export type MetaValidatorConfig = ContentMetaGeneratorOptions

export class MetaValidatorPlugin extends WalkTreePlugin {
    public constructor(
        public readonly config: MetaValidatorConfig = {
            ...defaultContentMetaBuilderOptions,
        }
    ) {
        super()
    }

    private get meta() {
        return this.$createMetaEngine(this.config.contentMeta)
    }

    public defineStaticConfig(): WalkTreePluginStaticConfig {
        return {
            name: 'meta-validator',
            description: 'Validate meta information for the content',
        }
    }

    public async walk(node: FileTreeNode): Promise<void> {
        if (node.category !== 'TEXT_FILE') return
        if (!node.buildInfo) return

        const { build_path } = node.buildInfo

        const originValid = await this.meta.extractFromFile(build_path.origin)
        if (originValid.success) return

        const generatedMeta = this.meta.generate({})
        if (!generatedMeta) {
            this.$logger.error(
                `Meta invalid: default meta generation error at ${build_path.origin}`
            )
            return
        }

        const defaultGeneration = await this.meta.update({
            injectPath: build_path.origin,
            meta: generatedMeta,
        })

        if (!defaultGeneration.success) {
            this.$logger.error(
                `Meta invalid: default meta injection error at ${build_path.origin}`
            )
        } else {
            this.$logger.info(
                `Meta invalid: default meta injection success at ${build_path.origin}`
            )
        }
    }
}
