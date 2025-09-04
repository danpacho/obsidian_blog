import {
    WalkTreePlugin,
    type WalkTreePluginDynamicConfig,
    type WalkTreePluginStaticConfig,
} from '../../walk.tree.plugin'

import {
    type ContentMetaGeneratorOptions,
    defaultContentMetaBuilderOptions,
} from './shared/meta'

import type { DefaultContentMeta } from './shared/meta/interface'
import type { FileTreeNode } from 'packages/build_system/src/parser/node'

export type SeriesInfoGeneratorStaticConfig = WalkTreePluginStaticConfig
export type SeriesInfoGeneratorDynamicConfig = WalkTreePluginDynamicConfig &
    ContentMetaGeneratorOptions & {
        seriesInfoPropertyName: string
    }

export class SeriesInfoGeneratorPlugin extends WalkTreePlugin<
    SeriesInfoGeneratorStaticConfig,
    SeriesInfoGeneratorDynamicConfig
> {
    public defineStaticConfig(): SeriesInfoGeneratorStaticConfig {
        return {
            name: 'series-info-generator',
            description:
                'Plugin to automatically gather and inject series-related metadata into each content file, enabling seamless series navigation. Injected at `[seriesInfoPropertyName]`',
            dynamicConfigSchema: {
                seriesInfoPropertyName: {
                    type: 'string',
                    description: 'Name of seriesInfo injection field',
                    defaultValue: 'seriesInfo',
                    optional: true,
                },
                /**
                 * contentMeta
                 *
                 * High-level configuration for front-matter metadata handling.
                 * Use `parser` to define how raw metadata is read from files,
                 * and `generator` to control how metadata is written back.
                 * This allows adapting to different markdown or YAML front-matter styles.
                 */
                contentMeta: {
                    type: {
                        parser: {
                            type: 'Function',
                            description:
                                'Function to parse raw front-matter into a JavaScript object.\n' +
                                'Input: raw metadata (string or unknown).\n' +
                                'Output: `{ [key: string]: any }` representing your file metadata.\n' +
                                'Override this to match custom front-matter formats (YAML, TOML, JSON).',
                            typeDescription:
                                '(meta: unknown) => Record<string, unknown>',
                            defaultValue:
                                defaultContentMetaBuilderOptions.contentMeta
                                    .parser,
                        },
                        generator: {
                            type: 'Function',
                            description:
                                'Function to serialize a metadata object back into front-matter text.\n' +
                                'Input: metadata object.\n' +
                                'Output: string block to prepend as file front-matter.\n' +
                                'Override this to control formatting, ordering, or style of your metadata.',
                            typeDescription: '(meta: unknown) => string',
                            defaultValue:
                                defaultContentMetaBuilderOptions.contentMeta
                                    .generator,
                        },
                    },
                    description:
                        'Customize how the plugin reads and writes your file metadata.\n' +
                        'Provide parsing and generating functions to align with your project’s front-matter conventions.',
                    optional: true,
                },
            },
        }
    }

    /**
     * Lazily constructs the meta-engine from provided parser/generator.
     * Throws if contentMeta is not configured.
     */
    private get meta() {
        if (!this.dynamicConfig.contentMeta) {
            throw new Error(
                'Configuration error: `contentMeta` must be provided in plugin dynamic config.'
            )
        }
        return this.$createMetaEngine(this.dynamicConfig.contentMeta)
    }

    private omit<T extends Record<string, any>, K extends keyof T>(
        obj: T,
        keyToOmit: K
    ): Omit<T, K> {
        const { [keyToOmit]: _, ...rest } = obj
        return rest
    }
    /**
     * Scans all sibling files for matching series names, then builds an array of series entries.
     */
    private async getPostCollectionStore({
        seriesName,
        siblings,
    }: {
        seriesName: string
        siblings: FileTreeNode[]
    }): Promise<DefaultContentMeta['seriesInfo']> {
        return siblings.reduce<
            Promise<Exclude<DefaultContentMeta['seriesInfo'], undefined>>
        >(async (accP, curr) => {
            const acc = await accP
            const extractResult = await this.meta.extractFromFile(
                curr.absolutePath
            )
            if (!extractResult.success) return acc

            const metaData = extractResult.data
                .meta as unknown as DefaultContentMeta
            // Only include posts that belong to this series & have required fields
            if (
                !metaData.series ||
                metaData.series.name !== seriesName ||
                typeof metaData.series.order !== 'number'
            ) {
                return acc
            }

            const metadataWithoutSeriesInfo = this.omit(
                metaData,
                this.dynamicConfig
                    .seriesInfoPropertyName as keyof typeof metaData
            )

            // pagination can cause infinite recursion if not omitted
            const selfOmittedMetadata = this.omit(
                metadataWithoutSeriesInfo,
                'pagination' as keyof typeof metadataWithoutSeriesInfo
            ) as Exclude<DefaultContentMeta['seriesInfo'], undefined>[number]

            if (!selfOmittedMetadata) {
                return acc
            }
            acc.push(selfOmittedMetadata)
            return acc
        }, Promise.resolve([]))
    }

    /**
     * Main walker: injects the collected `seriesInfo` into each file’s metadata if it has a series.
     */
    public async walk(
        node: Parameters<WalkTreePlugin['walk']>[0],
        { siblings }: Parameters<WalkTreePlugin['walk']>[1]
    ): Promise<void> {
        if (node.category === 'FOLDER' || !siblings) return

        const extractResult = await this.meta.extractFromFile(node.absolutePath)
        if (!extractResult.success) throw extractResult.error

        const metaData = extractResult.data
            .meta as unknown as DefaultContentMeta

        // Skip files without a valid series object
        if (
            !metaData.series ||
            typeof metaData.series.name !== 'string' ||
            typeof metaData.series.order !== 'number'
        ) {
            return
        }

        const seriesInfo = await this.getPostCollectionStore({
            seriesName: metaData.series.name,
            siblings,
        })

        await this.meta.replace({
            injectPath: node.absolutePath,
            metaData: {
                content: extractResult.data.content,
                meta: {
                    ...metaData,
                    [this.dynamicConfig.seriesInfoPropertyName!]: seriesInfo,
                },
            },
        })

        this.$logger.success(
            `Series metadata injected into: ${node.absolutePath}`
        )
    }
}
