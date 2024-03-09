import type { BuilderPlugin } from './interface'

type ToPluginOption<T> = {
    [PluginKey in keyof T]?: Array<T[PluginKey]> | T[PluginKey]
}

export type UsePlugin = ToPluginOption<BuilderPlugin>
