import type { FileTreeNode } from 'packages/build_system/src/parser'
import {
    BuildTreePlugin,
    type BuildTreePluginStaticConfig,
    type BuildTreePluginDynamicConfig,
} from '../../build.tree.plugin'
import { MetaEngine } from 'packages/build_system/src'
import { PolymorphicMeta } from 'packages/build_system/src/meta/engine'

export type ExcludeDraftStaticConfig = BuildTreePluginStaticConfig
export type ExcludeDraftDynamicConfig = BuildTreePluginDynamicConfig & {
    draftPropertyName: string
}

export class ExcludeDraftPlugin extends BuildTreePlugin<
    ExcludeDraftStaticConfig,
    ExcludeDraftDynamicConfig
> {
    public defineStaticConfig(): BuildTreePluginStaticConfig {
        return {
            name: 'exclude-draft',
            description: 'Exclude drafted files from generated file tree',
            dynamicConfigSchema: {
                draftPropertyName: {
                    type: 'string',
                    description:
                        'Name of draft property, [draftProperty.value] should be `boolean` or `boolean like string`',
                    typeDescription: 'string',
                    defaultValue: 'draft',
                    optional: true,
                },
            },
        }
    }

    private readMeta(content: string): PolymorphicMeta | null {
        try {
            return MetaEngine.MetaEngine.read(content).meta
        } catch {
            return null
        }
    }

    public override async walk(node: FileTreeNode): Promise<void> {
        const content = await this.$io.reader.readFile(node.absolutePath)
        if (!content.success) {
            this.$logger.error(`failed to read ${node.absolutePath}`)
            throw content.error
        }

        const meta = this.readMeta(content.data)
        if (!meta) {
            this.$logger.error(
                `failed to read metadata from ${node.absolutePath}`
            )
            return
        }

        const { draftPropertyName } = this.dynamicConfig
        if (draftPropertyName in meta) {
            const shouldSkip =
                meta[draftPropertyName] === 'true' ||
                meta[draftPropertyName] === true

            if (shouldSkip) {
                this.$logger.info(`Exclude ${node.fileName} from publishing`)
                node.exclude()
                return
            }
        }
    }
}
