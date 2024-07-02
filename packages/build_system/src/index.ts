export { System as BuildSystem } from './system'
// eslint-disable-next-line @typescript-eslint/no-namespace
export * as Node from './parser/node'
export {
    type FileTreePluginConfig,
    type ContentsModifierPluginConfig,
    type BuilderPlugin,
} from './builder/plugin/interface'
