import type { PluginAdapter } from '../plugin'
import { ObsidianReference } from './contents/obsidian.reference'
import { FileTreeConstructor } from './tree/file.tree.constructor'
import { MetaBuilder } from './tree/meta.builder'
import { PaginationBuilder } from './tree/pagination.builder'
import { StaticParamBuilder } from './tree/static.param.builder'
export const CorePlugins = {
    'build:origin:tree': [
        FileTreeConstructor(),
        MetaBuilder(),
        StaticParamBuilder(),
    ],
    'walk:generated:tree': [PaginationBuilder()],
    'build:contents': [ObsidianReference],
} as const satisfies PluginAdapter
