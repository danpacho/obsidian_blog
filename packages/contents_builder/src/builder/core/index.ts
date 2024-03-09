import type { UsePlugin } from '../plugin'
import { ObsidianReference } from './contents/obsidian.reference'
import { FileTreeConstructor } from './tree/file.tree.constructor'
// import { StaticParamBuilder } from './tree/static.param.builder'

export const CorePlugins = {
    'build:file:tree': [FileTreeConstructor()],
    'build:contents': [ObsidianReference],
} as const satisfies UsePlugin
