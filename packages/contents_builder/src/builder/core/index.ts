import type { PluginAdapter } from '../plugin'
import { ObsidianReference } from './contents/obsidian.reference'
import { FileTreeConstructor } from './tree/file.tree.constructor'
import { MetaBuilder } from './tree/meta.builder'
import { StaticParamBuilder } from './tree/static.param.builder'

export const CorePlugins = {
    'build:file:tree': [
        FileTreeConstructor(),
        MetaBuilder(),
        StaticParamBuilder(),
    ],
    'build:contents': [ObsidianReference],
} as const satisfies PluginAdapter
