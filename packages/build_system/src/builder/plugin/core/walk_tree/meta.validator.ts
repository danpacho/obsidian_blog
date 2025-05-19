import type { FileTreeNode } from 'packages/build_system/src/parser'
import {
    WalkTreePlugin,
    type WalkTreePluginDynamicConfig,
    type WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'
import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'

export interface MetaValidatorStaticConfig extends WalkTreePluginStaticConfig {}
export type MetaValidatorDynamicConfig = ContentMetaGeneratorOptions &
    WalkTreePluginDynamicConfig
export class MetaValidatorPlugin extends WalkTreePlugin<
    MetaValidatorStaticConfig,
    MetaValidatorDynamicConfig
> {
    public defineStaticConfig(): MetaValidatorStaticConfig {
        return {
            name: 'meta-validator',
            description: 'Validate meta information for the content',
            dynamicConfigSchema: {
                contentMeta: {
                    type: {
                        parser: {
                            type: 'Function',
                            description: 'Parser function for the meta',
                            typeDescription:
                                '(meta: unknown) => Record<string, unknown>',
                            defaultValue:
                                defaultContentMetaBuilderOptions.contentMeta
                                    .parser,
                        },
                        generator: {
                            type: 'Function',
                            description: 'Generator function for the meta',
                            typeDescription:
                                '(meta: unknown) => Record<string, unknown>',
                            defaultValue:
                                defaultContentMetaBuilderOptions.contentMeta
                                    .generator,
                        },
                    },
                    description: 'Content meta parser and generator',
                    optional: true,
                },
                paramAnalyzer: {
                    description: 'Define the param analyzer options',
                    optional: true,
                    type: {
                        paramShape: {
                            description: 'Define shape of dynamic param',
                            type: {
                                single: {
                                    type: 'RegExp',
                                    description:
                                        'Regular expression for single param',
                                    optional: true,
                                },
                                multi: {
                                    type: 'RegExp',
                                    description:
                                        'Regular expression for multi param',
                                    optional: true,
                                },
                            },
                            optional: true,
                        },
                        paramParser: {
                            type: 'Function',
                            description: 'Parser function for the param',
                            typeDescription:
                                '(param: string): Record<string, unknown>',
                            optional: true,
                        },
                    },
                },
            },
        }
    }

    private get meta() {
        if (!this.dynamicConfig.contentMeta) {
            throw new Error('contentMeta missing – set it in dynamic config.')
        }
        return this.$createMetaEngine(this.dynamicConfig.contentMeta)
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
            throw new Error(
                `Meta invalid: default meta generation error at ${build_path.origin}`,
                {
                    cause: node,
                }
            )
        }

        const defaultGeneration = await this.meta.update({
            injectPath: build_path.origin,
            meta: generatedMeta,
        })

        if (!defaultGeneration.success) {
            this.$logger.error(
                `Meta invalid: default meta injection error at ${build_path.origin}`
            )
            throw defaultGeneration.error
        } else {
            this.$logger.info(
                `Meta invalid: default meta injection success at ${build_path.origin}`
            )
        }
    }
}
